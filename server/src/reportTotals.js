function pad2(value) {
  return String(value).padStart(2, '0');
}

const REPORT_TIME_ZONE = process.env.REPORT_TIME_ZONE || process.env.TZ || 'America/Chicago';

function getBusinessDateParts(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return getBusinessDateParts(new Date());
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: Number(parts.hour)
  };
}

export function formatBusinessDate(date = new Date()) {
  const parts = getBusinessDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getBusinessHour(date = new Date()) {
  return getBusinessDateParts(date).hour;
}

export function normalizePaymentMethod(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'cash' ? 'cash' : 'card';
}

export async function ensureReportTotalsRows(client, businessDate) {
  await client.query(
    `
      INSERT INTO report_totals (
        business_date,
        report_scope,
        report_hour,
        total_sales,
        total_cash_payments,
        total_card_payments,
        z_report_generated,
        total_cash_amount,
        total_card_amount,
        total_orders,
        last_updated
      )
      SELECT
        $1::date,
        'HOURLY',
        gs.hour_value,
        0,
        0,
        0,
        false,
        0,
        0,
        0,
        CURRENT_TIMESTAMP
      FROM generate_series(0, 23) AS gs(hour_value)
      ON CONFLICT (business_date, report_scope, report_hour) DO NOTHING
    `,
    [businessDate]
  );

  await client.query(
    `
      INSERT INTO report_totals (
        business_date,
        report_scope,
        report_hour,
        total_sales,
        total_cash_payments,
        total_card_payments,
        z_report_generated,
        total_cash_amount,
        total_card_amount,
        total_orders,
        last_updated
      )
      VALUES ($1::date, 'DAILY', -1, 0, 0, 0, false, 0, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT (business_date, report_scope, report_hour) DO NOTHING
    `,
    [businessDate]
  );
}

export async function recordOrderInReportTotals(client, { businessDate, reportHour, orderTotal, paymentMethod }) {
  await ensureReportTotalsRows(client, businessDate);

  const normalizedHour = Number(reportHour);
  const total = Number(orderTotal || 0);
  const method = normalizePaymentMethod(paymentMethod);
  const cashPaymentCount = method === 'cash' ? 1 : 0;
  const cardPaymentCount = method === 'card' ? 1 : 0;
  const cashAmount = method === 'cash' ? total : 0;
  const cardAmount = method === 'card' ? total : 0;

  await client.query(
    `
      UPDATE report_totals
      SET
        total_sales = COALESCE(total_sales, 0) + $3,
        total_cash_payments = COALESCE(total_cash_payments, 0) + $4,
        total_card_payments = COALESCE(total_card_payments, 0) + $5,
        total_cash_amount = COALESCE(total_cash_amount, 0) + $6,
        total_card_amount = COALESCE(total_card_amount, 0) + $7,
        total_orders = COALESCE(total_orders, 0) + 1,
        last_updated = CURRENT_TIMESTAMP
      WHERE business_date = $1::date
        AND report_scope = 'HOURLY'
        AND report_hour = $2
    `,
    [businessDate, normalizedHour, total, cashPaymentCount, cardPaymentCount, cashAmount, cardAmount]
  );
}

export async function loadXReportRows(client, businessDate) {
  await ensureReportTotalsRows(client, businessDate);

  const result = await client.query(
    `
      SELECT
        report_hour AS hour,
        total_orders AS order_count,
        total_sales,
        total_cash_payments,
        total_card_payments,
        total_cash_amount,
        total_card_amount,
        last_updated
      FROM report_totals
      WHERE business_date = $1::date
        AND report_scope = 'HOURLY'
      ORDER BY report_hour
    `,
    [businessDate]
  );

  return result.rows;
}

export async function runZReport(client, businessDate) {
  await ensureReportTotalsRows(client, businessDate);

  const dailyStatusResult = await client.query(
    `
      SELECT z_report_generated, z_report_generated_at
      FROM report_totals
      WHERE business_date = $1::date
        AND report_scope = 'DAILY'
        AND report_hour = -1
      LIMIT 1
    `,
    [businessDate]
  );

  if (dailyStatusResult.rows[0]?.z_report_generated) {
    const error = new Error('Z-Report has already been generated for this business day.');
    error.code = 'Z_REPORT_ALREADY_GENERATED';
    error.generatedAt = dailyStatusResult.rows[0]?.z_report_generated_at || null;
    throw error;
  }

  const totalsResult = await client.query(
    `
      SELECT
        COALESCE(SUM(total_sales), 0) AS total_sales,
        COALESCE(SUM(total_cash_payments), 0) AS total_cash_payments,
        COALESCE(SUM(total_card_payments), 0) AS total_card_payments,
        COALESCE(SUM(total_cash_amount), 0) AS total_cash_amount,
        COALESCE(SUM(total_card_amount), 0) AS total_card_amount,
        COALESCE(SUM(total_orders), 0) AS total_orders
      FROM report_totals
      WHERE business_date = $1::date
        AND report_scope = 'HOURLY'
    `,
    [businessDate]
  );

  const totals = totalsResult.rows[0] || {};

  const dailyRowResult = await client.query(
    `
      UPDATE report_totals
      SET
        total_sales = $2,
        total_cash_payments = $3,
        total_card_payments = $4,
        total_cash_amount = $5,
        total_card_amount = $6,
        total_orders = $7,
        z_report_generated = true,
        z_report_generated_at = CURRENT_TIMESTAMP,
        last_updated = CURRENT_TIMESTAMP
      WHERE business_date = $1::date
        AND report_scope = 'DAILY'
        AND report_hour = -1
      RETURNING
        business_date,
        total_orders,
        total_sales,
        total_cash_payments,
        total_card_payments,
        total_cash_amount,
        total_card_amount,
        z_report_generated,
        z_report_generated_at,
        last_updated
    `,
    [
      businessDate,
      totals.total_sales || 0,
      totals.total_cash_payments || 0,
      totals.total_card_payments || 0,
      totals.total_cash_amount || 0,
      totals.total_card_amount || 0,
      totals.total_orders || 0
    ]
  );

  await client.query(
    `
      UPDATE report_totals
      SET
        total_sales = 0,
        total_cash_payments = 0,
        total_card_payments = 0,
        total_cash_amount = 0,
        total_card_amount = 0,
        total_orders = 0,
        last_updated = CURRENT_TIMESTAMP
      WHERE business_date = $1::date
        AND report_scope = 'HOURLY'
    `,
    [businessDate]
  );

  return dailyRowResult.rows[0] || null;
}
