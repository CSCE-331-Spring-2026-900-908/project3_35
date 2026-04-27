import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth.js';
import { formatBusinessDate, getBusinessHour, normalizePaymentMethod, recordOrderInReportTotals } from '../reportTotals.js';

function validateOrder(payload) {
  if (!payload.customerName || !Array.isArray(payload.items) || payload.items.length === 0) {
    return 'Customer name and at least one item are required.';
  }
  return null;
}

function normalizeLineItem(item) {
  const quantity = Number(item.quantity || 1);

  return {
    menuItemId: Number(item.menuItemId || item.itemId || item.id),
    name: item.name,
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    size: item.size || 'Regular',
    sweetness: item.sweetness || '75%',
    ice: item.ice || 'Regular Ice',
    notes: item.notes || '',
    total: Number(item.total || 0),
    toppingInventoryIds: Array.isArray(item.toppingInventoryIds)
      ? item.toppingInventoryIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
      : [],
    toppings: Array.isArray(item.toppings) ? item.toppings : []
  };
}

function addRequiredInventory(requiredInventory, inventoryId, quantityNeeded) {
  requiredInventory.set(inventoryId, (requiredInventory.get(inventoryId) || 0) + quantityNeeded);
}

async function findInventoryIdByName(client, cache, name, category) {
  const cacheKey = `${category}::${name}`.toLowerCase();
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await client.query(
    `
      SELECT item_inventory_id
      FROM item_inventory
      WHERE LOWER(name) = LOWER($1)
        AND LOWER(item_category) = LOWER($2)
      ORDER BY item_inventory_id
      LIMIT 1
    `,
    [name, category]
  );

  if (result.rows.length === 0) {
    throw new Error(`Inventory item "${name}" in category "${category}" was not found.`);
  }

  const inventoryId = Number(result.rows[0].item_inventory_id);
  cache.set(cacheKey, inventoryId);
  return inventoryId;
}

async function calculateRequiredInventory(client, items) {
  const requiredInventory = new Map();
  const inventoryLookupCache = new Map();

  for (const item of items) {
    const recipeResult = await client.query(
      `
        SELECT item_inventory_id, quantity
        FROM other_item_ingredients
        WHERE menu_item_id = $1
      `,
      [item.menuItemId]
    );

    const recipeInventoryIds = new Set();
    for (const row of recipeResult.rows) {
      const inventoryId = Number(row.item_inventory_id);
      const needed = Number(row.quantity) * item.quantity;
      recipeInventoryIds.add(inventoryId);
      addRequiredInventory(requiredInventory, inventoryId, needed);
    }

    const normalizedSize = String(item.size || 'Regular').trim().toLowerCase();
    const cupName = normalizedSize === 'large' ? 'Large Cup' : 'Medium Cup';
    const lidName = normalizedSize === 'large' ? 'Lid Large' : 'Lid Medium';
    const [cupInventoryId, lidInventoryId, strawInventoryId, napkinInventoryId] = await Promise.all([
      findInventoryIdByName(client, inventoryLookupCache, cupName, 'packaging'),
      findInventoryIdByName(client, inventoryLookupCache, lidName, 'packaging'),
      findInventoryIdByName(client, inventoryLookupCache, 'Straw', 'supply'),
      findInventoryIdByName(client, inventoryLookupCache, 'Napkin', 'supply')
    ]);

    if (!recipeInventoryIds.has(cupInventoryId)) {
      addRequiredInventory(requiredInventory, cupInventoryId, item.quantity);
    }
    if (!recipeInventoryIds.has(lidInventoryId)) {
      addRequiredInventory(requiredInventory, lidInventoryId, item.quantity);
    }
    if (!recipeInventoryIds.has(strawInventoryId)) {
      addRequiredInventory(requiredInventory, strawInventoryId, item.quantity);
    }
    if (!recipeInventoryIds.has(napkinInventoryId)) {
      addRequiredInventory(requiredInventory, napkinInventoryId, item.quantity);
    }

    for (const toppingInventoryId of item.toppingInventoryIds) {
      addRequiredInventory(requiredInventory, toppingInventoryId, item.quantity);
    }
  }

  return requiredInventory;
}

async function decrementInventory(client, requiredInventory) {
  for (const [inventoryId, needed] of requiredInventory.entries()) {
    const lockResult = await client.query(
      `
        SELECT quantity_available
        FROM item_inventory
        WHERE item_inventory_id = $1
        FOR UPDATE
      `,
      [inventoryId]
    );

    if (lockResult.rows.length === 0) {
      throw new Error(`Inventory item ${inventoryId} was not found.`);
    }

    const available = Number(lockResult.rows[0].quantity_available);
    if (available < needed) {
      throw new Error(`Inventory item ${inventoryId} is out of stock. Need ${needed}, have ${available}.`);
    }

    await client.query(
      `
        UPDATE item_inventory
        SET quantity_available = quantity_available - $1
        WHERE item_inventory_id = $2
      `,
      [needed, inventoryId]
    );
  }
}

async function syncTableSequence(client, tableName) {
  const serialColumnResult = await client.query(
    `
      SELECT
        a.attname AS column_name,
        pg_get_serial_sequence($1, a.attname) AS sequence_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE c.relname = $2
        AND n.nspname = 'public'
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY a.attnum
    `,
    [`public.${tableName}`, tableName]
  );

  const serialColumn = serialColumnResult.rows.find((row) => row.sequence_name);
  if (!serialColumn?.sequence_name || !serialColumn?.column_name) {
    return;
  }

  const maxValueResult = await client.query(
    `
      SELECT COALESCE(MAX(${serialColumn.column_name}), 0) AS max_value
      FROM ${tableName}
    `
  );

  const nextValue = Number(maxValueResult.rows[0]?.max_value || 0) + 1;
  if (!Number.isFinite(nextValue)) {
    return;
  }

  await client.query(
    `
      SELECT setval($1, $2, false)
    `,
    [serialColumn.sequence_name, nextValue]
  );
}

function mergeItemsForExistingSchema(items) {
  const mergedItems = new Map();

  for (const item of items) {
    const key = String(item.menuItemId);
    const current = mergedItems.get(key);

    if (current) {
      current.quantity += item.quantity;
      continue;
    }

    mergedItems.set(key, {
      ...item
    });
  }

  return [...mergedItems.values()];
}

async function createOrderInExistingSchema(client, payload, items) {
  const employeeId = Number(payload.employeeId || process.env.DEFAULT_EMPLOYEE_ID || 1);
  const total = Number(payload.totals?.total || items.reduce((sum, item) => sum + item.total, 0));
  const orderTimestamp = new Date();
  const businessDate = formatBusinessDate(orderTimestamp);
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod);

  const requiredInventory = await calculateRequiredInventory(client, items);
  await decrementInventory(client, requiredInventory);
  await syncTableSequence(client, 'orders');
  await syncTableSequence(client, 'order_item');

  const orderInsert = await client.query(
    `
      INSERT INTO orders (employee_id, price, order_time)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING order_id
    `,
    [employeeId, total]
  );

  const orderId = orderInsert.rows[0].order_id;
  const mergedItems = mergeItemsForExistingSchema(items);

  for (const item of mergedItems) {
    const menuPriceResult = await client.query(
      `
        SELECT price_per_unit
        FROM menu_item
        WHERE menu_item_id = $1
      `,
      [item.menuItemId]
    );

    if (menuPriceResult.rows.length === 0) {
      throw new Error(`Menu item ${item.menuItemId} was not found.`);
    }

    const pricePerUnit = Number(menuPriceResult.rows[0].price_per_unit);

    await client.query(
      `
        INSERT INTO order_item (order_id, menu_item_id, quantity, price_per_unit)
        VALUES ($1, $2, $3, $4)
      `,
      [orderId, item.menuItemId, item.quantity, pricePerUnit]
    );
  }

  await recordOrderInReportTotals(client, {
    businessDate,
    reportHour: getBusinessHour(orderTimestamp),
    orderTotal: total,
    paymentMethod
  });

  return {
    orderId,
    orderNumber: `ORD-${orderId}`,
    stored: true,
    schema: 'existing'
  };
}

async function project3SchemaExists(client) {
  const result = await client.query(
    `
      SELECT to_regclass('public.customer_orders') AS customer_orders_table
    `
  );

  return Boolean(result.rows[0]?.customer_orders_table);
}

async function loadOrdersFromExistingSchema(pool, limit) {
  const result = await pool.query(
    `
      SELECT
        order_id AS id,
        employee_id,
        price AS total,
        order_time AS created_at
      FROM orders
      ORDER BY order_time DESC, order_id DESC
      LIMIT $1
    `,
    [limit]
  );

  return {
    schema: 'existing',
    orders: result.rows
  };
}

async function loadOrdersFromProject3Schema(pool, limit) {
  const result = await pool.query(
    `
      SELECT
        id,
        customer_name,
        order_type,
        pickup_window,
        subtotal,
        tax,
        total,
        status,
        external_order_number,
        created_at
      FROM customer_orders
      ORDER BY created_at DESC, id DESC
      LIMIT $1
    `,
    [limit]
  );

  return {
    schema: 'project3',
    orders: result.rows
  };
}

async function loadOrderDetailsFromExistingSchema(pool, orderId) {
  const orderResult = await pool.query(
    `
      SELECT
        order_id AS id,
        employee_id,
        price AS total,
        order_time AS created_at
      FROM orders
      WHERE order_id = $1
    `,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  let items = [];
  try {
    const itemResult = await pool.query(
      `
        SELECT
          oi.order_item_id AS id,
          oi.menu_item_id,
          mi.menu_item_category AS menu_item_name,
          oi.quantity
        FROM order_item oi
        LEFT JOIN menu_item mi ON mi.menu_item_id = oi.menu_item_id
        WHERE oi.order_id = $1
        ORDER BY oi.order_item_id
      `,
      [orderId]
    );
    items = itemResult.rows;
  } catch (_error) {
    items = [];
  }

  return {
    schema: 'existing',
    order: orderResult.rows[0],
    items
  };
}

async function loadOrderDetailsFromProject3Schema(pool, orderId) {
  const orderResult = await pool.query(
    `
      SELECT
        id,
        customer_name,
        order_type,
        pickup_window,
        subtotal,
        tax,
        total,
        status,
        external_order_number,
        created_at
      FROM customer_orders
      WHERE id = $1
    `,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    return null;
  }

  const itemResult = await pool.query(
    `
      SELECT
        oi.id,
        oi.menu_item_name,
        oi.size_choice,
        oi.sweetness_choice,
        oi.ice_choice,
        oi.special_instructions,
        oi.item_total,
        COALESCE(
          JSON_AGG(oit.topping_name ORDER BY oit.topping_name)
          FILTER (WHERE oit.topping_name IS NOT NULL),
          '[]'::json
        ) AS toppings
      FROM order_items oi
      LEFT JOIN order_item_toppings oit ON oit.order_item_id = oi.id
      WHERE oi.order_id = $1
      GROUP BY oi.id
      ORDER BY oi.id
    `,
    [orderId]
  );

  return {
    schema: 'project3',
    order: orderResult.rows[0],
    items: itemResult.rows
  };
}

export function createOrdersRouter(pool) {
  const router = Router();

  router.get('/', authenticateRequest, requireRole('employee', 'manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const requestedLimit = Number(request.query.limit || 25);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 25;

    try {
      const payload = await loadOrdersFromExistingSchema(pool, limit);
      return response.json(payload);
    } catch (_existingSchemaError) {
      try {
        const payload = await loadOrdersFromProject3Schema(pool, limit);
        return response.json(payload);
      } catch (project3SchemaError) {
        return response.status(500).json({
          error: 'Failed to load order data.',
          details: project3SchemaError.message
        });
      }
    }
  });

  router.get('/:id', authenticateRequest, requireRole('employee', 'manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const orderId = Number(request.params.id);
    if (!Number.isInteger(orderId) || orderId < 1) {
      return response.status(400).json({ error: 'Order id must be a positive integer.' });
    }

    try {
      const payload = await loadOrderDetailsFromExistingSchema(pool, orderId);
      if (payload) {
        return response.json(payload);
      }
    } catch (_existingSchemaError) {
    }

    try {
      const payload = await loadOrderDetailsFromProject3Schema(pool, orderId);
      if (!payload) {
        return response.status(404).json({ error: 'Order not found.' });
      }
      return response.json(payload);
    } catch (project3SchemaError) {
      return response.status(500).json({
        error: 'Failed to load order details.',
        details: project3SchemaError.message
      });
    }
  });

  router.post('/', async (request, response) => {
    const validationError = validateOrder(request.body);
    if (validationError) {
      return response.status(400).json({ error: validationError });
    }

    const items = request.body.items.map(normalizeLineItem);
    if (items.some((item) => !Number.isInteger(item.menuItemId) || item.menuItemId < 1)) {
      return response.status(400).json({ error: 'Each order item must include a valid menu item id.' });
    }

    const orderNumber = `MW-${Date.now().toString().slice(-6)}`;

    if (!pool) {
      return response.status(201).json({
        orderNumber,
        stored: false,
        message: 'Accepted in sample-data mode.'
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let existingSchemaError = null;

      try {
        await client.query('SAVEPOINT existing_schema_attempt');
        const result = await createOrderInExistingSchema(client, request.body, items);
        await client.query('RELEASE SAVEPOINT existing_schema_attempt');
        await client.query('COMMIT');
        return response.status(201).json(result);
      } catch (error) {
        existingSchemaError = error;
        await client.query('ROLLBACK TO SAVEPOINT existing_schema_attempt');
      }

      const hasProject3Schema = await project3SchemaExists(client);
      if (!hasProject3Schema) {
        throw existingSchemaError || new Error('The existing order schema failed, and the fallback schema is not installed.');
      }

      const orderInsert = await client.query(
        `
          INSERT INTO customer_orders (
            customer_name,
            order_type,
            pickup_window,
            subtotal,
            tax,
            total,
            status,
            external_order_number
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'received', $7)
          RETURNING id
        `,
        [
          request.body.customerName,
          request.body.orderType,
          request.body.pickupWindow,
          request.body.totals.subtotal,
          request.body.totals.tax,
          request.body.totals.total,
          orderNumber
        ]
      );

      const orderId = orderInsert.rows[0].id;
      const orderTimestamp = new Date();
      const businessDate = formatBusinessDate(orderTimestamp);
      const paymentMethod = normalizePaymentMethod(request.body?.paymentMethod);

      for (const item of items) {
        const itemInsert = await client.query(
          `
            INSERT INTO order_items (
              order_id,
              menu_item_name,
              size_choice,
              sweetness_choice,
              ice_choice,
              special_instructions,
              item_total
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `,
          [orderId, item.name, item.size, item.sweetness, item.ice, item.notes || '', item.total]
        );

        for (const topping of item.toppings) {
          const toppingName = typeof topping === 'string' ? topping : topping.name;
          await client.query(
            `
              INSERT INTO order_item_toppings (order_item_id, topping_name)
              VALUES ($1, $2)
            `,
            [itemInsert.rows[0].id, toppingName]
          );
        }
      }

      await recordOrderInReportTotals(client, {
        businessDate,
        reportHour: getBusinessHour(orderTimestamp),
        orderTotal: Number(request.body?.totals?.total || 0),
        paymentMethod
      });

      await client.query('COMMIT');
      return response.status(201).json({ orderNumber, stored: true, schema: 'project3' });
    } catch (error) {
      await client.query('ROLLBACK');
      return response.status(500).json({ error: 'Failed to store order.', details: error.message });
    } finally {
      client.release();
    }
  });

  return router;
}
