import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';
import StaffAccessPage from './components/StaffAccessPage';
import { buildAuthHeaders } from './auth';

const INVENTORY_CATEGORY_OPTIONS = ['supply', 'ingredient', 'packaging', 'seasonal'];

const EMPTY_INVENTORY_FORM = {
  itemInventoryId: '',
  name: '',
  quantityAvailable: '',
  pricePerUnit: '',
  itemCategory: 'supply'
};

const EMPTY_EMPLOYEE_EDIT_FORM = {
  employeeId: '',
  jobTitle: '',
  firstName: '',
  lastName: '',
  schedule: '',
  paymentInfo: '',
  startDate: '',
  hourlyPay: '',
  benefits: '',
  email: '',
  pin: ''
};

const EMPTY_MENU_FORM = {
  menuItemId: '',
  menuItemCategory: '',
  pricePerUnit: '',
  selectedIngredientId: '',
  recipeQuantity: '',
  selectedRecipeRowRef: ''
};

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

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
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
                <tr key={row?.id ?? row?.order_id ?? row?.employee_id ?? idx}>
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

function InventoryManagePanel({
  rows,
  form,
  onFormChange,
  onAddItem,
  onUpdateItem,
  onSelectRow,
  onClearForm,
  busy
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Inventory Management</h2>
          <p style={styles.hint}>Select an inventory row to edit stock, price, and category, or add a new one.</p>
        </div>
        <div style={styles.panelMeta}>{rows.length} items</div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Item ID</th>
              <th style={styles.th}>Item Name</th>
              <th style={styles.th}>Stock Quantity</th>
              <th style={styles.th}>Unit Price</th>
              <th style={styles.th}>Category</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={5}>
                  No inventory items found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = String(form.itemInventoryId) === String(row.item_inventory_id);
                return (
                  <tr
                    key={row.item_inventory_id}
                    style={selected ? styles.selectedRow : undefined}
                    onClick={() => onSelectRow(row)}
                  >
                    <td style={styles.td}>{row.item_inventory_id}</td>
                    <td style={styles.td}>{row.name}</td>
                    <td style={styles.td}>{Number(row.quantity_available).toLocaleString()}</td>
                    <td style={styles.td}>{formatMoney(row.price_per_unit)}</td>
                    <td style={styles.td}>{row.item_category}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.inventoryFormGrid} onSubmit={onAddItem}>
        <label style={styles.label}>
          Item ID
          <input style={styles.input} value={form.itemInventoryId} disabled placeholder="Select from table" />
        </label>

        <label style={styles.label}>
          Item Name
          <input
            style={styles.input}
            value={form.name}
            onChange={(event) => onFormChange('name', event.target.value)}
            required
          />
        </label>

        <label style={styles.label}>
          Stock Quantity
          <input
            style={styles.input}
            type="number"
            min="0"
            step="1"
            value={form.quantityAvailable}
            onChange={(event) => onFormChange('quantityAvailable', event.target.value)}
            required
          />
        </label>

        <label style={styles.label}>
          Unit Price
          <input
            style={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={form.pricePerUnit}
            onChange={(event) => onFormChange('pricePerUnit', event.target.value)}
            required
          />
        </label>

        <label style={styles.label}>
          Category
          <select
            style={styles.input}
            value={form.itemCategory}
            onChange={(event) => onFormChange('itemCategory', event.target.value)}
          >
            {INVENTORY_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div style={styles.formActionsRow}>
          <button type="submit" style={styles.primaryButton} disabled={busy.inventoryCreate}>
            {busy.inventoryCreate ? 'Adding…' : 'Add New Item'}
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onUpdateItem}
            disabled={!form.itemInventoryId || busy.inventoryUpdate}
          >
            {busy.inventoryUpdate ? 'Updating…' : 'Update Stock/Price/Category'}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onClearForm}>
            Clear Form
          </button>
        </div>
      </form>
    </section>
  );
}

function EmployeeManagePanel({
  rows,
  form,
  onFormChange,
  onSelectRow,
  onCreateEmployee,
  onUpdateDetails,
  onTerminateEmployee,
  onClearForm,
  busy
}) {
  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Employee Accounts</h2>
          <p style={styles.hint}>Select an employee row, then create, update pay/details, terminate, or clear.</p>
        </div>
        <div style={styles.panelMeta}>{rows.length} employees</div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee ID</th>
              <th style={styles.th}>Job Title</th>
              <th style={styles.th}>First Name</th>
              <th style={styles.th}>Last Name</th>
              <th style={styles.th}>Schedule</th>
              <th style={styles.th}>Payment Info</th>
              <th style={styles.th}>Start Date</th>
              <th style={styles.th}>Hourly Pay</th>
              <th style={styles.th}>Benefits</th>
              <th style={styles.th}>Email</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={10}>
                  No employee records found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const selected = String(form.employeeId) === String(row.employee_id);
                return (
                  <tr
                    key={row.employee_id}
                    style={selected ? styles.selectedRow : undefined}
                    onClick={() => onSelectRow(row)}
                  >
                    <td style={styles.td}>{row.employee_id}</td>
                    <td style={styles.td}>{row.job_title}</td>
                    <td style={styles.td}>{row.first_name}</td>
                    <td style={styles.td}>{row.last_name}</td>
                    <td style={styles.td}>{row.schedule}</td>
                    <td style={styles.td}>{row.payment_info}</td>
                    <td style={styles.td}>{formatDate(row.start_date)}</td>
                    <td style={styles.td}>{formatMoney(row.hourly_pay)}</td>
                    <td style={styles.td}>{row.benefits}</td>
                    <td style={styles.td}>{row.email}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.employeeFormGrid} onSubmit={onUpdateDetails}>
        <label style={styles.label}>
          Employee ID
          <input style={styles.input} value={form.employeeId} disabled placeholder="Select from table" />
        </label>
        <label style={styles.label}>
          Job Title
          <input
            style={styles.input}
            value={form.jobTitle}
            onChange={(e) => onFormChange('jobTitle', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          First Name
          <input
            style={styles.input}
            value={form.firstName}
            onChange={(e) => onFormChange('firstName', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Last Name
          <input
            style={styles.input}
            value={form.lastName}
            onChange={(e) => onFormChange('lastName', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Schedule
          <input
            style={styles.input}
            value={form.schedule}
            onChange={(e) => onFormChange('schedule', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Payment Info
          <input
            style={styles.input}
            value={form.paymentInfo}
            onChange={(e) => onFormChange('paymentInfo', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Start Date
          <input
            style={styles.input}
            type="date"
            value={form.startDate}
            onChange={(e) => onFormChange('startDate', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Hourly Pay
          <input
            style={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={form.hourlyPay}
            onChange={(e) => onFormChange('hourlyPay', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Benefits
          <input
            style={styles.input}
            value={form.benefits}
            onChange={(e) => onFormChange('benefits', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Email
          <input
            style={styles.input}
            type="email"
            value={form.email}
            onChange={(e) => onFormChange('email', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          4-Digit PIN (for create)
          <input
            style={styles.input}
            type="password"
            inputMode="numeric"
            pattern="\d{4}"
            value={form.pin}
            onChange={(e) => onFormChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
          />
        </label>

        <div style={styles.formActionsRow}>
          <button type="button" style={styles.primaryButton} onClick={onCreateEmployee} disabled={busy.employeeCreate}>
            {busy.employeeCreate ? 'Creating…' : 'Create Employee'}
          </button>
          <button type="submit" style={styles.primaryButton} disabled={!form.employeeId || busy.employeeUpdate}>
            {busy.employeeUpdate ? 'Updating…' : 'Update Employee Details'}
          </button>
          <button
            type="button"
            style={styles.dangerButton}
            onClick={onTerminateEmployee}
            disabled={!form.employeeId || busy.employeeTerminate}
          >
            {busy.employeeTerminate ? 'Terminating…' : 'Terminate Employee'}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onClearForm}>
            Clear
          </button>
        </div>
      </form>
    </section>
  );
}

function MenuManagePanel({
  menuItems,
  recipeRows,
  ingredientOptions,
  form,
  onFormChange,
  onSelectMenuRow,
  onSelectRecipeRow,
  onAddMenuItem,
  onUpdateMenuItem,
  onStartNewIngredient,
  onAddRecipeComponent,
  onUpdateRecipeQuantity,
  onRemoveRecipeComponent,
  onClearForm,
  busy
}) {
  const [showIngredientEditor, setShowIngredientEditor] = useState(false);

  return (
    <section style={styles.panel}>
      <div style={styles.panelHeader}>
        <div>
          <h2 style={styles.panelTitle}>Menu Management</h2>
          <p style={styles.hint}>Manage menu items and recipe components for each selected drink.</p>
        </div>
        <div style={styles.panelMeta}>
          {menuItems.length} items, {recipeRows.length} recipe rows
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Menu Item ID</th>
              <th style={styles.th}>Menu Item Name</th>
              <th style={styles.th}>Price Per Unit</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={3}>
                  No menu items found.
                </td>
              </tr>
            ) : (
              menuItems.map((row) => {
                const selected = String(form.menuItemId) === String(row.menu_item_id);
                return (
                  <tr
                    key={row.menu_item_id}
                    style={selected ? styles.selectedRow : undefined}
                    onClick={() => onSelectMenuRow(row)}
                  >
                    <td style={styles.td}>{row.menu_item_id}</td>
                    <td style={styles.td}>{row.menu_item_category}</td>
                    <td style={styles.td}>{formatMoney(row.price_per_unit)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <form style={styles.employeeFormGrid} onSubmit={onAddMenuItem}>
        <label style={styles.label}>
          Menu Item ID
          <input style={styles.input} value={form.menuItemId} disabled placeholder="Auto-generated" />
        </label>
        <label style={styles.label}>
          Menu Item Name
          <input
            style={styles.input}
            value={form.menuItemCategory}
            onChange={(e) => onFormChange('menuItemCategory', e.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Price Per Unit
          <input
            style={styles.input}
            type="number"
            min="0"
            step="0.01"
            value={form.pricePerUnit}
            onChange={(e) => onFormChange('pricePerUnit', e.target.value)}
            required
          />
        </label>
        <div style={styles.formActionsRow}>
          <button type="submit" style={styles.primaryButton} disabled={busy.menuAdd}>
            {busy.menuAdd ? 'Adding…' : 'Add Menu Item'}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onUpdateMenuItem} disabled={!form.menuItemId || busy.menuUpdate}>
            {busy.menuUpdate ? 'Updating…' : 'Update Menu Item'}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onClearForm}>
            Clear
          </button>
        </div>

        <div style={styles.menuIngredientSection}>
          <div style={styles.splitRow}>
            <h3 style={styles.reportTitle}>Ingredients For Selected Drink</h3>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setShowIngredientEditor((current) => !current)}
              disabled={!form.menuItemId}
            >
              {showIngredientEditor ? 'Done Editing Ingredients' : 'Edit Ingredients'}
            </button>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ingredient ID</th>
                  <th style={styles.th}>Ingredient Name</th>
                  <th style={styles.th}>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {!form.menuItemId ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={3}>
                      Select a drink from the menu table to view its ingredients.
                    </td>
                  </tr>
                ) : recipeRows.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={3}>
                      No ingredients found for this drink yet.
                    </td>
                  </tr>
                ) : (
                  recipeRows.map((row, idx) => {
                    const key = row.row_ref ?? `${row.item_inventory_id}-${idx}`;
                    const selected = String(form.selectedRecipeRowRef) === String(row.row_ref);
                    return (
                      <tr
                        key={key}
                        style={selected ? styles.selectedRow : undefined}
                        onClick={() => onSelectRecipeRow(row)}
                      >
                        <td style={styles.td}>{row.item_inventory_id}</td>
                        <td style={styles.td}>{row.ingredient_name}</td>
                        <td style={styles.td}>{row.quantity}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {showIngredientEditor ? (
            <div style={styles.employeeFormGrid}>
              <label style={styles.label}>
                Ingredient ID
                <select
                  style={styles.input}
                  value={form.selectedIngredientId}
                  onChange={(e) => onFormChange('selectedIngredientId', e.target.value)}
                >
                  <option value="">Select ingredient</option>
                  {ingredientOptions.map((opt) => (
                    <option key={opt.item_inventory_id} value={opt.item_inventory_id}>
                      {opt.name} [{opt.item_category}] (ID {opt.item_inventory_id})
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                Recipe Quantity
                <input
                  style={styles.input}
                  type="number"
                  min="1"
                  step="1"
                  value={form.recipeQuantity}
                  onChange={(e) => onFormChange('recipeQuantity', e.target.value)}
                />
              </label>

              <div style={styles.formActionsRow}>
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={onAddRecipeComponent}
                  disabled={!form.menuItemId || !form.selectedIngredientId || !form.recipeQuantity || busy.recipeAdd}
                >
                  {busy.recipeAdd ? 'Adding…' : 'Add Ingredient'}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={onUpdateRecipeQuantity}
                  disabled={!form.selectedRecipeRowRef || busy.recipeUpdate}
                >
                  {busy.recipeUpdate ? 'Updating…' : 'Update Ingredient Qty'}
                </button>
                <button
                  type="button"
                  style={styles.dangerButton}
                  onClick={onRemoveRecipeComponent}
                  disabled={!form.selectedRecipeRowRef || busy.recipeRemove}
                >
                  {busy.recipeRemove ? 'Removing…' : 'Remove Ingredient'}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={onStartNewIngredient}
                  disabled={!form.menuItemId}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function ManagerDashboard() {
  const [inventory, setInventory] = useState([]);
  const [inventoryForm, setInventoryForm] = useState(EMPTY_INVENTORY_FORM);
  const [menuItems, setMenuItems] = useState([]);
  const [recipeRows, setRecipeRows] = useState([]);
  const [ingredientOptions, setIngredientOptions] = useState([]);
  const [menuForm, setMenuForm] = useState(EMPTY_MENU_FORM);
  const [orders, setOrders] = useState([]);
  const [usageRows, setUsageRows] = useState([]);
  const [xReportRows, setXReportRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeEditForm, setEmployeeEditForm] = useState(EMPTY_EMPLOYEE_EDIT_FORM);
  const [activeTab, setActiveTab] = useState('inventory');

  const [busy, setBusy] = useState({
    inventory: false,
    orders: false,
    usage: false,
    xReport: false,
    zReport: false,
    employees: false,
    employeeCreate: false,
    inventoryCreate: false,
    inventoryUpdate: false,
    employeeHourlyUpdate: false,
    employeeUpdate: false,
    employeeTerminate: false,
    menuItems: false,
    menuAdd: false,
    menuUpdatePrice: false,
    menuUpdate: false,
    ingredientOptions: false,
    recipeRows: false,
    recipeAdd: false,
    recipeUpdate: false,
    recipeRemove: false
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

  async function fetchJson(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: {
        ...buildAuthHeaders(),
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
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

  async function loadMenuItems() {
    setBusy((current) => ({ ...current, menuItems: true }));
    try {
      const payload = await fetchJson('/api/menu/manage/items');
      setMenuItems(normalizeRows(payload));
      setStatus('Loaded menu items.');
    } catch (error) {
      setStatus(`Menu load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, menuItems: false }));
    }
  }

  async function loadIngredientOptions() {
    setBusy((current) => ({ ...current, ingredientOptions: true }));
    try {
      const payload = await fetchJson('/api/menu/manage/ingredient-options');
      setIngredientOptions(normalizeRows(payload));
    } catch (error) {
      setStatus(`Ingredient options load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, ingredientOptions: false }));
    }
  }

  async function loadRecipeForMenuItem(menuItemId) {
    if (!menuItemId) {
      setRecipeRows([]);
      return;
    }
    setBusy((current) => ({ ...current, recipeRows: true }));
    try {
      const payload = await fetchJson(`/api/menu/manage/items/${menuItemId}/recipe`);
      setRecipeRows(normalizeRows(payload));
    } catch (error) {
      setStatus(`Recipe load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, recipeRows: false }));
    }
  }

  async function loadEmployees() {
    setBusy((current) => ({ ...current, employees: true }));
    try {
      const payload = await fetchJson('/api/employees');
      setEmployees(normalizeRows(payload));
      setStatus('Loaded employee roster.');
    } catch (error) {
      setStatus(`Employee load failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, employees: false }));
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
      setXReportRows([]);
      setStatus("Downloaded Z-Report CSV and reset today's hourly report totals.");
    } catch (error) {
      setStatus(`Z-Report download failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, zReport: false }));
    }
  }

  async function refreshAll() {
    await Promise.all([loadInventory(), loadOrders(), loadEmployees()]);
  }

  async function refreshMenuManagement() {
    await Promise.all([loadMenuItems(), loadIngredientOptions()]);
    setRecipeRows([]);
  }

  function updateInventoryForm(field, value) {
    setInventoryForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function selectInventoryRow(row) {
    setInventoryForm({
      itemInventoryId: String(row.item_inventory_id ?? ''),
      name: String(row.name ?? ''),
      quantityAvailable: String(row.quantity_available ?? ''),
      pricePerUnit: String(row.price_per_unit ?? ''),
      itemCategory: String(row.item_category ?? 'supply')
    });
  }

  function clearInventoryForm() {
    setInventoryForm(EMPTY_INVENTORY_FORM);
  }

  function updateMenuForm(field, value) {
    setMenuForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function selectMenuItemRow(row) {
    setMenuForm((current) => ({
      ...EMPTY_MENU_FORM,
      menuItemId: String(row.menu_item_id ?? ''),
      menuItemCategory: String(row.menu_item_category ?? ''),
      pricePerUnit: String(row.price_per_unit ?? ''),
      recipeQuantity: current.recipeQuantity || '1'
    }));
    loadRecipeForMenuItem(row.menu_item_id);
  }

  function selectRecipeRow(row) {
    setMenuForm((current) => ({
      ...current,
      selectedRecipeRowRef: String(row.row_ref ?? ''),
      selectedIngredientId: String(row.item_inventory_id ?? ''),
      recipeQuantity: String(row.quantity ?? '')
    }));
  }

  function clearMenuForm() {
    setMenuForm(EMPTY_MENU_FORM);
    setRecipeRows([]);
  }

  async function handleAddMenuItem(event) {
    event.preventDefault();
    setBusy((current) => ({ ...current, menuAdd: true }));
    try {
      const payload = await fetchJson('/api/menu/manage/items', {
        method: 'POST',
        body: JSON.stringify({
          menuItemCategory: menuForm.menuItemCategory,
          pricePerUnit: menuForm.pricePerUnit
        })
      });
      const created = payload?.item;
      if (created) {
        setMenuItems((current) => [...current, created].sort((a, b) => Number(a.menu_item_id) - Number(b.menu_item_id)));
      } else {
        await loadMenuItems();
      }
      clearMenuForm();
      setStatus(created ? `Added menu item "${created.menu_item_category}".` : 'Menu item added.');
    } catch (error) {
      setStatus(`Menu add failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, menuAdd: false }));
    }
  }

  async function handleUpdateMenuItem() {
    if (!menuForm.menuItemId) {
      setStatus('Select a menu item first.');
      return;
    }
    setBusy((current) => ({ ...current, menuUpdate: true }));
    try {
      const payload = await fetchJson(`/api/menu/manage/items/${menuForm.menuItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          menuItemCategory: menuForm.menuItemCategory,
          pricePerUnit: menuForm.pricePerUnit
        })
      });
      const updated = payload?.item;
      if (updated) {
        setMenuItems((current) =>
          current.map((row) => (String(row.menu_item_id) === String(updated.menu_item_id) ? updated : row))
        );
        selectMenuItemRow(updated);
      } else {
        await loadMenuItems();
      }
      setStatus(updated ? `Updated menu item "${updated.menu_item_category}".` : 'Menu item updated.');
    } catch (error) {
      setStatus(`Menu update failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, menuUpdate: false }));
    }
  }

  async function handleAddRecipeComponent() {
    if (!menuForm.menuItemId) {
      setStatus('Select a menu item first.');
      return;
    }
    if (!menuForm.selectedIngredientId) {
      setStatus('Select an ingredient ID before adding.');
      return;
    }
    const recipeQty = Number(menuForm.recipeQuantity);
    if (!Number.isInteger(recipeQty) || recipeQty <= 0) {
      setStatus('Recipe quantity must be a whole number greater than 0.');
      return;
    }
    setBusy((current) => ({ ...current, recipeAdd: true }));
    try {
      await fetchJson(`/api/menu/manage/items/${menuForm.menuItemId}/recipe`, {
        method: 'POST',
        body: JSON.stringify({
          itemInventoryId: menuForm.selectedIngredientId,
          quantity: recipeQty
        })
      });
      await loadRecipeForMenuItem(menuForm.menuItemId);
      setMenuForm((current) => ({
        ...current,
        selectedIngredientId: '',
        recipeQuantity: '1',
        selectedRecipeRowRef: ''
      }));
      setStatus('Component added to recipe.');
    } catch (error) {
      setStatus(`Failed to add recipe component: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, recipeAdd: false }));
    }
  }

  function handleStartNewIngredient() {
    if (!menuForm.menuItemId) {
      setStatus('Select a menu item first.');
      return;
    }
    setMenuForm((current) => ({
      ...current,
      selectedIngredientId: '',
      selectedRecipeRowRef: '',
      recipeQuantity: '1'
    }));
    setStatus('Ready to add a new ingredient.');
  }

  async function handleUpdateRecipeQuantity() {
    if (!menuForm.selectedRecipeRowRef) {
      setStatus('Select a recipe row first.');
      return;
    }
    setBusy((current) => ({ ...current, recipeUpdate: true }));
    try {
      await fetchJson('/api/menu/manage/recipe-row', {
        method: 'PATCH',
        body: JSON.stringify({
          rowRef: menuForm.selectedRecipeRowRef,
          quantity: menuForm.recipeQuantity
        })
      });
      await loadRecipeForMenuItem(menuForm.menuItemId);
      setStatus('Recipe quantity updated.');
    } catch (error) {
      setStatus(`Failed to update recipe quantity: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, recipeUpdate: false }));
    }
  }

  async function handleRemoveRecipeComponent() {
    if (!menuForm.selectedRecipeRowRef) {
      setStatus('Select a recipe row first.');
      return;
    }
    setBusy((current) => ({ ...current, recipeRemove: true }));
    try {
      await fetchJson('/api/menu/manage/recipe-row', {
        method: 'DELETE',
        body: JSON.stringify({
          rowRef: menuForm.selectedRecipeRowRef
        })
      });
      await loadRecipeForMenuItem(menuForm.menuItemId);
      setMenuForm((current) => ({ ...current, selectedRecipeRowRef: '', recipeQuantity: '' }));
      setStatus('Recipe component removed.');
    } catch (error) {
      setStatus(`Failed to remove recipe component: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, recipeRemove: false }));
    }
  }

  async function handleAddInventoryItem(event) {
    event.preventDefault();
    setBusy((current) => ({ ...current, inventoryCreate: true }));
    try {
      const payload = await fetchJson('/api/inventory', {
        method: 'POST',
        body: JSON.stringify({
          name: inventoryForm.name,
          quantityAvailable: inventoryForm.quantityAvailable,
          pricePerUnit: inventoryForm.pricePerUnit,
          itemCategory: inventoryForm.itemCategory
        })
      });
      const createdItem = payload?.item;
      if (createdItem) {
        setInventory((current) =>
          [...current, createdItem].sort((a, b) => Number(a.item_inventory_id) - Number(b.item_inventory_id))
        );
      } else {
        await loadInventory();
      }
      clearInventoryForm();
      setStatus(createdItem ? `Added inventory item "${createdItem.name}".` : 'Added inventory item.');
    } catch (error) {
      setStatus(`Failed to add inventory item: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, inventoryCreate: false }));
    }
  }

  async function handleUpdateInventoryItem() {
    if (!inventoryForm.itemInventoryId) {
      setStatus('Select an inventory item first.');
      return;
    }

    setBusy((current) => ({ ...current, inventoryUpdate: true }));
    try {
      const payload = await fetchJson(`/api/inventory/${inventoryForm.itemInventoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: inventoryForm.name,
          quantityAvailable: inventoryForm.quantityAvailable,
          pricePerUnit: inventoryForm.pricePerUnit,
          itemCategory: inventoryForm.itemCategory
        })
      });
      const updated = payload?.item;
      if (updated) {
        setInventory((current) =>
          current.map((row) =>
            String(row.item_inventory_id) === String(updated.item_inventory_id) ? updated : row
          )
        );
        selectInventoryRow(updated);
      } else {
        await loadInventory();
      }
      setStatus(updated ? `Updated "${updated.name}".` : 'Inventory item updated.');
    } catch (error) {
      setStatus(`Failed to update inventory item: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, inventoryUpdate: false }));
    }
  }

  function updateEmployeeEditForm(field, value) {
    setEmployeeEditForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function selectEmployeeRow(row) {
    setEmployeeEditForm({
      employeeId: String(row.employee_id ?? ''),
      jobTitle: String(row.job_title ?? ''),
      firstName: String(row.first_name ?? ''),
      lastName: String(row.last_name ?? ''),
      schedule: String(row.schedule ?? ''),
      paymentInfo: String(row.payment_info ?? ''),
      startDate: String(row.start_date ?? '').slice(0, 10),
      hourlyPay: String(row.hourly_pay ?? ''),
      benefits: String(row.benefits ?? ''),
      email: String(row.email ?? ''),
      pin: ''
    });
  }

  function clearEmployeeEditForm() {
    setEmployeeEditForm(EMPTY_EMPLOYEE_EDIT_FORM);
  }

  async function handleCreateEmployee() {
    if (!/^\d{4}$/.test(String(employeeEditForm.pin ?? ''))) {
      setStatus('A 4-digit PIN is required to create an employee.');
      return;
    }

    setBusy((current) => ({ ...current, employeeCreate: true }));

    try {
      const payload = await fetchJson('/api/employees', {
        method: 'POST',
        body: JSON.stringify({
          jobTitle: employeeEditForm.jobTitle,
          firstName: employeeEditForm.firstName,
          lastName: employeeEditForm.lastName,
          schedule: employeeEditForm.schedule,
          paymentInfo: employeeEditForm.paymentInfo,
          startDate: employeeEditForm.startDate,
          hourlyPay: employeeEditForm.hourlyPay,
          benefits: employeeEditForm.benefits,
          email: employeeEditForm.email,
          pin: employeeEditForm.pin
        })
      });

      const createdEmployee = payload?.item;
      setEmployees((current) => {
        const next = createdEmployee ? [...current, createdEmployee] : current;
        return next.slice().sort((a, b) => Number(a.employee_id) - Number(b.employee_id));
      });
      setEmployeeEditForm({
        ...EMPTY_EMPLOYEE_EDIT_FORM,
        startDate: new Date().toISOString().slice(0, 10)
      });
      setActiveTab('employees');
      setStatus(
        createdEmployee
          ? `Created ${createdEmployee.job_title} account for ${createdEmployee.first_name} ${createdEmployee.last_name}.`
          : 'Employee created.'
      );
    } catch (error) {
      setStatus(`Employee creation failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, employeeCreate: false }));
    }
  }

  async function handleUpdateEmployeeDetails(event) {
    event.preventDefault();
    if (!employeeEditForm.employeeId) {
      setStatus('Select an employee first.');
      return;
    }

    setBusy((current) => ({ ...current, employeeUpdate: true }));
    try {
      const payload = await fetchJson(`/api/employees/${employeeEditForm.employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          jobTitle: employeeEditForm.jobTitle,
          firstName: employeeEditForm.firstName,
          lastName: employeeEditForm.lastName,
          schedule: employeeEditForm.schedule,
          paymentInfo: employeeEditForm.paymentInfo,
          startDate: employeeEditForm.startDate,
          hourlyPay: employeeEditForm.hourlyPay,
          benefits: employeeEditForm.benefits,
          email: employeeEditForm.email
        })
      });

      const updated = payload?.item;
      if (updated) {
        setEmployees((current) =>
          current.map((row) => (String(row.employee_id) === String(updated.employee_id) ? updated : row))
        );
        selectEmployeeRow(updated);
      } else {
        await loadEmployees();
      }
      setStatus(updated ? `Updated employee details for ${updated.first_name} ${updated.last_name}.` : 'Employee updated.');
    } catch (error) {
      setStatus(`Employee detail update failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, employeeUpdate: false }));
    }
  }

  async function handleTerminateEmployee() {
    if (!employeeEditForm.employeeId) {
      setStatus('Select an employee first.');
      return;
    }

    setBusy((current) => ({ ...current, employeeTerminate: true }));
    try {
      const payload = await fetchJson(`/api/employees/${employeeEditForm.employeeId}/terminate`, {
        method: 'POST'
      });
      const updated = payload?.item;
      if (updated) {
        setEmployees((current) =>
          current.map((row) => (String(row.employee_id) === String(updated.employee_id) ? updated : row))
        );
        selectEmployeeRow(updated);
      } else {
        await loadEmployees();
      }
      setStatus(updated ? `Terminated employee ${updated.first_name} ${updated.last_name}.` : 'Employee terminated.');
    } catch (error) {
      setStatus(`Termination failed: ${error.message}`);
    } finally {
      setBusy((current) => ({ ...current, employeeTerminate: false }));
    }
  }

  useEffect(() => {
    refreshAll();
    refreshMenuManagement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>MOONWAKE TEA ATELIER</p>
          <h1 style={styles.title}>Manager Dashboard</h1>
          <p style={styles.subtitle}>Inventory, recent orders, reporting tools, and employee account creation.</p>
        </div>

        <div style={styles.headerActions}>
          <Link to="/" style={styles.linkButton}>
            Back to portal
          </Link>
          <button type="button" style={styles.primaryButton} onClick={refreshAll}>
            {busy.inventory || busy.orders || busy.employees ? 'Refreshing…' : 'Refresh'}
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
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'employees'}
            style={activeTab === 'employees' ? styles.tabSelected : styles.tab}
            onClick={() => setActiveTab('employees')}
          >
            Employees
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'menu'}
            style={activeTab === 'menu' ? styles.tabSelected : styles.tab}
            onClick={() => setActiveTab('menu')}
          >
            Menu
          </button>
        </div>

        {activeTab === 'inventory' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Inventory Items tab">
            <div style={styles.tabActions}>
              <button type="button" style={styles.secondaryButton} onClick={loadInventory} disabled={busy.inventory}>
                {busy.inventory ? 'Loading…' : 'Reload inventory'}
              </button>
            </div>
            <InventoryManagePanel
              rows={inventory}
              form={inventoryForm}
              onFormChange={updateInventoryForm}
              onAddItem={handleAddInventoryItem}
              onUpdateItem={handleUpdateInventoryItem}
              onSelectRow={selectInventoryRow}
              onClearForm={clearInventoryForm}
              busy={busy}
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
                    <p style={styles.hint}>Loads 24 hourly rows from reports_total, including sales and payment breakdowns.</p>
                  </div>
                  <button type="button" style={styles.secondaryButton} onClick={loadXReport} disabled={busy.xReport}>
                    {busy.xReport ? 'Loading…' : "Load today's X-Report"}
                  </button>
                </div>

                <DataTable
                  title="X-Report Preview"
                  rows={xReportRows}
                  preferredOrder={[
                    'hour',
                    'order_count',
                    'total_sales',
                    'total_cash_payments',
                    'total_card_payments',
                    'total_cash_amount',
                    'total_card_amount',
                    'last_updated'
                  ]}
                  formatters={{
                    total_sales: (v) => formatMoney(v),
                    total_cash_amount: (v) => formatMoney(v),
                    total_card_amount: (v) => formatMoney(v)
                  }}
                />
              </div>

              <div style={styles.reportSection}>
                <div style={styles.splitRow}>
                  <div>
                    <h3 style={styles.reportTitle}>Z-Report (daily closeout export)</h3>
                    <p style={styles.hint}>Downloads the daily closeout, then clears today&apos;s hourly report totals. This should only be run once per day.</p>
                  </div>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => {
                      setXReportRows([]);
                      downloadZReportCsv();
                    }}
                    disabled={busy.zReport}
                  >
                    {busy.zReport ? 'Preparing…' : 'Download Z-Report CSV'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'employees' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Employees tab">
            <div style={styles.tabActionsLeft}>
              <button type="button" style={styles.secondaryButton} onClick={loadEmployees} disabled={busy.employees}>
                {busy.employees ? 'Loading…' : 'Reload employees'}
              </button>
            </div>
            <EmployeeManagePanel
              rows={employees}
              form={employeeEditForm}
              onFormChange={updateEmployeeEditForm}
              onSelectRow={selectEmployeeRow}
              onCreateEmployee={handleCreateEmployee}
              onUpdateDetails={handleUpdateEmployeeDetails}
              onTerminateEmployee={handleTerminateEmployee}
              onClearForm={clearEmployeeEditForm}
              busy={busy}
            />
          </div>
        ) : null}

        {activeTab === 'menu' ? (
          <div style={styles.tabBody} role="tabpanel" aria-label="Menu tab">
            <div style={styles.tabActionsLeft}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={refreshMenuManagement}
                disabled={busy.menuItems || busy.ingredientOptions}
              >
                {busy.menuItems || busy.ingredientOptions ? 'Loading…' : 'Reload menu & ingredients'}
              </button>
            </div>
            <MenuManagePanel
              menuItems={menuItems}
              recipeRows={recipeRows}
              ingredientOptions={ingredientOptions}
              form={menuForm}
              onFormChange={updateMenuForm}
              onSelectMenuRow={selectMenuItemRow}
              onSelectRecipeRow={selectRecipeRow}
              onAddMenuItem={handleAddMenuItem}
              onUpdateMenuItem={handleUpdateMenuItem}
              onStartNewIngredient={handleStartNewIngredient}
              onAddRecipeComponent={handleAddRecipeComponent}
              onUpdateRecipeQuantity={handleUpdateRecipeQuantity}
              onRemoveRecipeComponent={handleRemoveRecipeComponent}
              onClearForm={clearMenuForm}
              busy={busy}
            />
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
    alignItems: 'center',
    flexWrap: 'wrap'
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
    marginBottom: '12px',
    flexWrap: 'wrap'
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
  selectedRow: {
    background: '#fff3e6',
    cursor: 'pointer'
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
    margin: '6px 0 0',
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
    minWidth: '0',
    background: '#ffffff',
    color: '#2f211b'
  },
  employeeFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px'
  },
  inventoryFormGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px',
    marginTop: '14px'
  },
  menuIngredientSection: {
    gridColumn: '1 / -1',
    marginTop: '16px',
    borderTop: '1px solid #eadfd3',
    paddingTop: '12px'
  },
  inventoryPickerWrap: {
    marginTop: '24px',
    marginBottom: '14px',
    maxWidth: '460px'
  },
  formActionsRow: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'flex-start',
    gap: '10px',
    flexWrap: 'wrap',
    paddingTop: '6px'
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
  tabActionsLeft: {
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
      authMethod="google"
      requiredAuthMethod="google"
      requiredRole="manager"
      title="Manager Dashboard"
      description="Managers must sign in before accessing reporting, inventory, and administration tools."
      accessDeniedMessage="You do not have access to the manager portal. Please return to the staff portal and sign in with a manager account."
    >
      <ManagerDashboard />
    </StaffAccessPage>
  );
}
