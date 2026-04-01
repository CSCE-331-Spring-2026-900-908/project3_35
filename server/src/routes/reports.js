import { Router } from 'express';

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
      const result = await pool.query(
        `
          WITH target_day AS (
            SELECT
              ${
                day
                  ? '$1::date'
                  : "COALESCE(MAX(order_time::date), CURRENT_DATE)"
              } AS day
            FROM orders
          )
          SELECT
            (target_day.day + (gs.h || ' hour')::interval) AS hour,
            COALESCE(COUNT(o.order_id), 0) AS order_count,
            COALESCE(SUM(o.price), 0) AS total_sales
          FROM generate_series(0, 23) AS gs(h)
          CROSS JOIN target_day
          LEFT JOIN orders o
            ON o.order_time >= target_day.day + (gs.h || ' hour')::interval
           AND o.order_time <  target_day.day + ((gs.h + 1) || ' hour')::interval
          GROUP BY target_day.day, gs.h
          ORDER BY hour
        `,
        day ? [day] : []
      );

      return response.json({
        day: day ?? null,
        count: result.rows.length,
        rows: result.rows
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

    const day = parseIsoDate(request.query.day) ?? new Date().toISOString().slice(0, 10);
    if (request.query.day !== undefined && !parseIsoDate(request.query.day)) {
      return response.status(400).json({
        error: 'Invalid day parameter.',
        details: 'Use YYYY-MM-DD.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            $1::date AS business_date,
            COALESCE(COUNT(o.order_id), 0)::int AS total_orders,
            COALESCE(SUM(o.price), 0) AS total_sales
          FROM orders o
          WHERE o.order_time::date = $1::date
        `,
        [day]
      );

      const row = result.rows[0] || { business_date: day, total_orders: 0, total_sales: 0 };

      if (format === 'csv') {
        const filename = `z_report_${day}.csv`;
        return sendCsv(response, filename, ['business_date', 'total_orders', 'total_sales'], [row]);
      }

      return response.json({
        day,
        row
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load Z-Report.',
        details: error.message
      });
    }
  });

  return router;
}

