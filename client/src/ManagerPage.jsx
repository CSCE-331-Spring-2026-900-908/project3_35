import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';
import StaffAccessPage from './components/StaffAccessPage';
import { buildAuthHeaders } from './auth';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDatetimeLocalSeconds(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function parseApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload.details || payload.error || null;
}

function normalizeRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.orders)) return payload.orders;
  return [];
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function DataTable({ title, rows, preferredOrder, formatters }) {
  const columns = useMemo(() => {
    const keys = new Set();
    for (const row of rows) {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((key) => keys.add(key));
      }
    }
    const discovered = [...keys];
    if (!preferredOrder || preferredOrder.length === 0) {
      return discovered;
    }
    const remaining = discovered.filter((col) => !preferredOrder.includes(col));
    return [...preferredOrder.filter((col) => keys.has(col)), ...remaining];
  }, [preferredOrder, rows]);

  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>
        <div style={styles.panelMeta}>{rows.length} rows</div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={styles.th}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={Math.max(columns.length, 1)}>
                  No data yet.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row?.id ?? row?.order_id ?? idx}>
                  {columns.map((col) => {
                    const raw = row?.[col];
                    const formatter = formatters?.[col];
                    const value = formatter ? formatter(raw, row) : raw;
                    return (
                      <td key={col} style={styles.td}>
                        {value === null || value === undefined ? '' : String(value)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManagerDashboard() {
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [usageRows, setUsageRows] = useState([]);
  const [xReportRows, setXReportRows] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');

  const [busy, setBusy] = useState({
    inventory: false,
    orders: false,
    usage: false,
    xReport: false,
    zReport: false
  });

  const [status, setStatus] = useState('Ready.');

  const [usageWindow, setUsageWindow] = useState(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return {
      start: toDatetimeLocalSeconds(start),
      end: toDatetimeLocalSeconds(end)
    };
  });

  async function fetchJson(path) {
    const response = await fetch(apiUrl(path), {
      headers: {
        ...buildAuthHeaders()
      }
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }

    if (!response.ok) {
      const message = parseApiError(payload) || `Request failed (${response.status}).`;
      throw new Error(message);
    }
    return payload;
  }

  async function loadInventory() {
    setBusy((current) => ({ ...current, inventory: true }));
    try {
      const payload = await fetchJson('/api/inventory');
      setInventory(normalizeRows(payload));
      setStatus('Loaded inventory.');
    } catch (error) {
      setStatus(`Inventory load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, inventory: false }));
    }
  }

  async function loadOrders() {
    setBusy((current) => ({ ...current, orders: true }));
    try {
      const payload = await fetchJson('/api/orders?limit=10');
      setOrders(normalizeRows(payload));
      setStatus(`Loaded recent orders (${payload?.schema ?? 'unknown schema'}).`);
    } catch (error) {
      setStatus(`Orders load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, orders: false }));
    }
  }

  async function loadUsage() {
    const start = usageWindow.start.trim();
    const end = usageWindow.end.trim();
    if (!start || !end) {
      setStatus('Enter both start and end timestamps for the usage chart.');
      return;
    }

    setBusy((current) => ({ ...current, usage: true }));
    try {
      const params = new URLSearchParams({ start, end });
      const payload = await fetchJson(`/api/reports/usage?${params.toString()}`);
      setUsageRows(normalizeRows(payload));
      setStatus('Loaded inventory usage chart.');
    } catch (error) {
      setStatus(`Usage chart load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, usage: false }));
    }
  }

  async function loadXReport() {
    setBusy((current) => ({ ...current, xReport: true }));
    try {
      const payload = await fetchJson('/api/reports/x-report');
      setXReportRows(normalizeRows(payload));
      setStatus("Loaded today's X-Report.");
    } catch (error) {
      setStatus(`X-Report load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, xReport: false }));
    }
  }

  async function downloadZReportCsv() {
    setBusy((current) => ({ ...current, zReport: true }));
    try {
      const response = await fetch(apiUrl('/api/reports/z-report?format=csv'), {
        headers: {
          ...buildAuthHeaders()
        }
      });
      if (!response.ok) {
        let payload = null;
        try {
          payload = await response.json();
        } catch (_error) {
          payload = null;
        }
        const message = parseApiError(payload) || `Request failed (${response.status}).`;
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fallbackName = `z_report_${new Date().toISOString().slice(0, 10)}.csv`;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('Downloaded Z-Report CSV.');
    } catch (error) {
      setStatus(`Z-Report download failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, zReport: false }));
    }
  }

  async function refreshAll() {
    await Promise.all([loadInventory(), loadOrders()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>SHARETEA</p>
          <h1 style={styles.title}>Manager Dashboard</h1>
          <p style={styles.subtitle}>Inventory, recent orders, and daily reporting tools.</p>
        </div>

        <div style={styles.headerActions}>
          <Link to="/" style={styles.linkButton}>
            Back to portal
          </Link>
          <button type="button" style={styles.primaryButton} onClick={refreshAll}>
            {busy.inventory || busy.orders ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.tabs} role="tablist" aria-label="Manager dashboard tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inventory'}
            style={activeTab === 'inventory' ? styles.tabSelected : styles.tab}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Items
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'orders'}
            style={activeTab === 'orders' ? styles.tabSelected : styles.tab}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'reports'}
            style={activeTab === 'reports' ? styles.tabSelected : styles.tab}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Inventory Items tab">
            <div style={styles.tabActions}>
              <button type="button" style={styles.secondaryButton} onClick={loadInventory} disabled={busy.inventory}>
                {busy.inventory ? 'Loading…' : 'Reload inventory'}
              </button>
            </div>
            <DataTable
              title="Inventory Items"
              rows={inventory}
              preferredOrder={['item_inventory_id', 'name', 'item_category', 'quantity_available', 'price_per_unit']}
              formatters={{
                price_per_unit: (v) => formatMoney(v),
                quantity_available: (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString())
              }}
            />
          </div>
        ) : null}

        {activeTab === 'orders' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Orders tab">
            <div style={styles.tabActions}>
              <button type="button" style={styles.secondaryButton} onClick={loadOrders} disabled={busy.orders}>
                {busy.orders ? 'Loading…' : 'Reload orders'}
              </button>
            </div>
            <DataTable
              title="Orders (Last 10)"
              rows={orders}
              preferredOrder={['id', 'order_id', 'employee_id', 'customer_name', 'total', 'price', 'created_at', 'order_time']}
              formatters={{
                total: (v) => formatMoney(v),
                price: (v) => formatMoney(v)
              }}
            />
          </div>
        ) : null}

        {activeTab === 'reports' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Reports tab">
            <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <h2 style={styles.panelTitle}>Reports</h2>
                <div style={styles.panelMeta}>Usage chart, X-report, Z-report</div>
              </div>

              <div style={styles.reportSection}>
                <h3 style={styles.reportTitle}>Inventory Usage (time window)</h3>
                <div style={styles.formRow}>
                  <label style={styles.label}>
                    Start
                    <input
                      style={styles.input}
                      type="datetime-local"
                      step="1"
                      value={usageWindow.start}
                      onChange={(e) => setUsageWindow((c) => ({ ...c, start: e.target.value }))}
                    />
                  </label>
                  <label style={styles.label}>
                    End
                    <input
                      style={styles.input}
                      type="datetime-local"
                      step="1"
                      value={usageWindow.end}
                      onChange={(e) => setUsageWindow((c) => ({ ...c, end: e.target.value }))}
                    />
                  </label>
                  <button type="button" style={styles.secondaryButton} onClick={loadUsage} disabled={busy.usage}>
                    {busy.usage ? 'Loading…' : 'Load usage'}
                  </button>
                </div>

                <DataTable
                  title="Usage Preview"
                  rows={usageRows}
                  preferredOrder={['item_inventory_id', 'ingredient_name', 'total_units_used']}
                  formatters={{
                    total_units_used: (v) => (v === null || v === undefined ? '' : Number(v).toLocaleString())
                  }}
                />
              </div>

              <div style={styles.reportSection}>
                <div style={styles.splitRow}>
                  <div>
                    <h3 style={styles.reportTitle}>X-Report (sales per hour)</h3>
                    <p style={styles.hint}>Loads 24 rows showing hourly order count and sales totals.</p>
                  </div>
                  <button type="button" style={styles.secondaryButton} onClick={loadXReport} disabled={busy.xReport}>
                    {busy.xReport ? 'Loading…' : "Load today's X-Report"}
                  </button>
                </div>

                <DataTable
                  title="X-Report Preview"
                  rows={xReportRows}
                  preferredOrder={['hour', 'order_count', 'total_sales']}
                  formatters={{
                    total_sales: (v) => formatMoney(v)
                  }}
                />
              </div>

              <div style={styles.reportSection}>
                <div style={styles.splitRow}>
                  <div>
                    <h3 style={styles.reportTitle}>Z-Report (daily closeout export)</h3>
                    <p style={styles.hint}>Downloads a CSV snapshot of today’s totals.</p>
                  </div>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={downloadZReportCsv}
                    disabled={busy.zReport}
                  >
                    {busy.zReport ? 'Preparing…' : 'Download Z-Report CSV'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      <div style={styles.statusBar}>
        <div style={styles.statusText}>{status}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '32px',
    background: 'linear-gradient(135deg, #efe7dc 0%, #e6ddd1 100%)',
    fontFamily: 'system-ui, sans-serif'
  },
  header: {
    maxWidth: '1400px',
    margin: '0 auto 22px',
    background: '#f8f3eb',
    border: '1px solid #e3d8cb',
    borderRadius: '28px',
    padding: '26px 28px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.08)'
  },
  headerActions: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  kicker: {
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#7d6b5d',
    fontWeight: 700,
    marginBottom: '10px'
  },
  title: {
    fontSize: '2.2rem',
    lineHeight: 1.1,
    color: '#2f211b',
    marginBottom: '10px'
  },
  subtitle: {
    fontSize: '1.05rem',
    color: '#6b5b50',
    maxWidth: '760px',
    marginBottom: 0
  },
  grid: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(12, 1fr)',
    gap: '18px'
  },
  panel: {
    gridColumn: 'span 12',
    background: '#fffaf4',
    border: '1px solid #e3d8cb',
    borderRadius: '24px',
    padding: '18px',
    boxShadow: '0 14px 28px rgba(0,0,0,0.06)'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '12px',
    marginBottom: '12px'
  },
  panelTitle: {
    margin: 0,
    color: '#2f211b',
    fontSize: '1.25rem'
  },
  panelMeta: {
    color: '#7d6b5d',
    fontSize: '0.95rem'
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1px solid #eadfd3',
    background: '#ffffff'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.95rem'
  },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #eadfd3',
    background: '#fff3e6',
    color: '#6f3c20',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f1e7db',
    color: '#2f211b',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '14px 12px',
    color: '#6b5b50'
  },
  reportSection: {
    marginTop: '16px'
  },
  reportTitle: {
    margin: '0 0 8px',
    color: '#2f211b',
    fontSize: '1.1rem'
  },
  hint: {
    margin: '0 0 10px',
    color: '#6b5b50'
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'flex-end',
    marginBottom: '12px'
  },
  splitRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '10px'
  },
  label: {
    display: 'grid',
    gap: '6px',
    color: '#6b5b50',
    fontSize: '0.95rem'
  },
  input: {
    borderRadius: '12px',
    border: '1px solid #e3d8cb',
    padding: '10px 12px',
    minWidth: '240px',
    background: '#ffffff',
    color: '#2f211b'
  },
  primaryButton: {
    borderRadius: '14px',
    border: '1px solid #6f3c20',
    padding: '10px 14px',
    background: '#6f3c20',
    color: '#fffaf4',
    cursor: 'pointer',
    fontWeight: 700
  },
  secondaryButton: {
    borderRadius: '14px',
    border: '1px solid #bda99a',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#2f211b',
    cursor: 'pointer',
    fontWeight: 650
  },
  dangerButton: {
    borderRadius: '14px',
    border: '1px solid #a33a2b',
    padding: '10px 14px',
    background: '#a33a2b',
    color: '#fffaf4',
    cursor: 'pointer',
    fontWeight: 700
  },
  linkButton: {
    borderRadius: '14px',
    border: '1px solid #bda99a',
    padding: '10px 14px',
    background: 'transparent',
    color: '#2f211b',
    textDecoration: 'none',
    fontWeight: 650
  },
  tabs: {
    gridColumn: 'span 12',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  tab: {
    borderRadius: '999px',
    border: '1px solid #bda99a',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#2f211b',
    cursor: 'pointer',
    fontWeight: 700
  },
  tabSelected: {
    borderRadius: '999px',
    border: '1px solid #6f3c20',
    padding: '10px 14px',
    background: '#fff3e6',
    color: '#6f3c20',
    cursor: 'pointer',
    fontWeight: 800
  },
  tabBody: {
    gridColumn: 'span 12'
  },
  tabActions: {
    gridColumn: 'span 12',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  statusBar: {
    maxWidth: '1400px',
    margin: '18px auto 0',
    background: 'rgba(255, 250, 244, 0.8)',
    border: '1px solid rgba(227, 216, 203, 0.9)',
    borderRadius: '18px',
    padding: '12px 14px'
  },
  statusText: {
    color: '#2f211b'
  }
};
export default function ManagerPage() {
  return (
    <StaffAccessPage
      requiredRole="manager"
      title="Manager Dashboard"
      description="Managers must sign in before accessing reporting, inventory, and administration tools."
    >
      <ManagerDashboard />
    </StaffAccessPage>
  );
}
