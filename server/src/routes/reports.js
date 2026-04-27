import { Router } from 'express';
import { formatBusinessDate, loadXReportRows, runZReport } from '../reportTotals.js';

function parseIsoDate(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function parseDateTimeParam(value) {
  if (!value) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Accept `YYYY-MM-DDTHH:mm:ss` (from <input type="datetime-local">) or `YYYY-MM-DD HH:mm:ss`.
  const normalized = trimmed.includes('T') ? trimmed.replace('T', ' ') : trimmed;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Postgres accepts ISO-ish timestamp strings; keep the original shape close to what user supplied.
  return normalized;
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const mustQuote = raw.includes(',') || raw.includes('"') || raw.includes('\n') || raw.includes('\r');
  const escaped = raw.replaceAll('"', '""');
  return mustQuote ? `"${escaped}"` : escaped;
}

function sendCsv(response, filename, headerColumns, rows) {
  response.setHeader('Content-Type', 'text/csv; charset=utf-8');
  response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const lines = [];
  lines.push(headerColumns.map(csvEscape).join(','));

  for (const row of rows) {
    lines.push(headerColumns.map((col) => csvEscape(row?.[col])).join(','));
  }

  response.send(lines.join('\n'));
}

export function createReportsRouter(pool) {
  const router = Router();

  router.get('/usage', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const start = parseDateTimeParam(request.query.start);
    const end = parseDateTimeParam(request.query.end);

    if (!start || !end) {
      return response.status(400).json({
        error: 'Both start and end are required.',
        details: 'Provide start/end timestamps like YYYY-MM-DDTHH:mm:ss (datetime-local) or YYYY-MM-DD HH:mm:ss.'
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!(endDate > startDate)) {
      return response.status(400).json({
        error: 'End time must be after start time.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            ii.item_inventory_id,
            ii.name AS ingredient_name,
            SUM(oi.quantity * oii.quantity) AS total_units_used
          FROM orders o
          JOIN order_item oi ON oi.order_id = o.order_id
          JOIN other_item_ingredients oii ON oii.menu_item_id = oi.menu_item_id
          JOIN item_inventory ii ON ii.item_inventory_id = oii.item_inventory_id
          WHERE o.order_time >= $1 AND o.order_time < $2
          GROUP BY ii.item_inventory_id, ii.name
          ORDER BY total_units_used DESC, ii.name
        `,
        [start, end]
      );

      return response.json({
        start,
        end,
        count: result.rows.length,
        rows: result.rows
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load usage chart.',
        details: error.message
      });
    }
  });

  router.get('/x-report', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const day = parseIsoDate(request.query.day);
    if (request.query.day !== undefined && !day) {
      return response.status(400).json({
        error: 'Invalid day parameter.',
        details: 'Use YYYY-MM-DD.'
      });
    }

    try {
      const businessDay = day || formatBusinessDate(new Date());
      const rows = await loadXReportRows(pool, businessDay);

      return response.json({
        day: businessDay,
        count: rows.length,
        rows
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load X-Report.',
        details: error.message
      });
    }
  });

  router.get('/z-report', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const format = String(request.query.format || 'json').toLowerCase();
    if (format !== 'json' && format !== 'csv') {
      return response.status(400).json({
        error: 'Invalid format.',
        details: 'Use format=json or format=csv.'
      });
    }

    const day = parseIsoDate(request.query.day) ?? formatBusinessDate(new Date());
    if (request.query.day !== undefined && !parseIsoDate(request.query.day)) {
      return response.status(400).json({
        error: 'Invalid day parameter.',
        details: 'Use YYYY-MM-DD.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const row = await runZReport(client, day);
      await client.query('COMMIT');

      if (format === 'csv') {
        const filename = `z_report_${day}.csv`;
        return sendCsv(
          response,
          filename,
          [
            'business_date',
            'total_orders',
            'total_sales',
            'total_cash_payments',
            'total_card_payments',
            'total_cash_amount',
            'total_card_amount',
            'z_report_generated',
            'z_report_generated_at'
          ],
          [row]
        );
      }

      return response.json({
        day,
        row
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (error.code === 'Z_REPORT_ALREADY_GENERATED') {
        return response.status(409).json({
          error: error.message,
          details: error.generatedAt
            ? `This business day was already closed out at ${error.generatedAt}.`
            : 'This business day was already closed out.'
        });
      }
      return response.status(500).json({
        error: 'Failed to load Z-Report.',
        details: error.message
      });
    } finally {
      client.release();
    }
  });

  return router;
}
