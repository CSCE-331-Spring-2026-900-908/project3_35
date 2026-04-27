import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth.js';

function normalizeMenuRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.id)) {
      grouped.set(row.id, {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        basePrice: Number(row.base_price),
        toppings: []
      });
    }

    if (row.topping_name) {
      grouped.get(row.id).toppings.push({
        id: row.topping_id ? Number(row.topping_id) : undefined,
        name: row.topping_name,
        price: Number(row.topping_price)
      });
    }
  }

  return [...grouped.values()];
}

function normalizeExistingSchemaMenu(menuRows, toppingRows) {
  const toppings = toppingRows.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price)
  }));

  return menuRows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || `A signature ${row.category.toLowerCase()} from Sharetea.`,
    basePrice: Number(row.base_price),
    toppings
  }));
}

export function createMenuRouter(pool) {
  const router = Router();

  router.get('/', async (_request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Menu data must be loaded from PostgreSQL. Set the database environment variables and restart the server.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            mi.id,
            mi.name,
            mc.name AS category,
            mi.description,
            mi.base_price,
            tt.id AS topping_id,
            tt.name AS topping_name,
            tt.price AS topping_price
          FROM menu_items mi
          JOIN menu_categories mc ON mc.id = mi.category_id
          LEFT JOIN drink_toppings dt ON dt.menu_item_id = mi.id
          LEFT JOIN topping_types tt ON tt.id = dt.topping_id
          WHERE mi.is_active = TRUE
          ORDER BY mc.name, mi.name, tt.name
        `
      );

      const items = normalizeMenuRows(result.rows);
      if (items.length > 0) {
        return response.json({ source: 'database-menu_items', items });
      }
    } catch (_menuItemsError) {
    }

    try {
      const menuResult = await pool.query(
        `
          SELECT
            menu_item_id AS id,
            menu_item_category AS name,
            CASE
              WHEN LOWER(menu_item_category) SIMILAR TO '%(mango|orange|peach|strawberry|lychee|passion|pineapple|apple|grape|watermelon|kiwi|lemon|lime|blueberry|raspberry|blackberry|cherry|guava|dragon|fruit)%' THEN 'Fruit Tea'
              WHEN LOWER(menu_item_category) SIMILAR TO '%(pumpkin|peppermint|holiday|seasonal|matcha)%' THEN 'Seasonal'
              WHEN LOWER(menu_item_category) SIMILAR TO '%(slush|smoothie|frozen)%' THEN 'Slush'
              ELSE 'Milk Tea'
            END AS category,
            NULL::text AS description,
            price_per_unit AS base_price
          FROM menu_item
          ORDER BY menu_item_id
        `
      );

      const toppingResult = await pool.query(
        `
          SELECT
            item_inventory_id AS id,
            name,
            price_per_unit AS price
          FROM item_inventory
          WHERE LOWER(TRIM(item_category)) = 'ingredient'
          ORDER BY name, item_inventory_id
        `
      );

      if (menuResult.rows.length > 0) {
        return response.json({
          source: 'database-existing',
          items: normalizeExistingSchemaMenu(menuResult.rows, toppingResult.rows)
        });
      }
    } catch (_existingSchemaError) {
    }

    return response.status(500).json({
      error: 'Failed to load menu data.',
      details: 'No supported database menu table returned usable rows.'
    });
  });

  router.get('/manage/items', authenticateRequest, requireRole('manager'), async (_request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT menu_item_id, menu_item_category, price_per_unit
          FROM menu_item
          ORDER BY menu_item_id
        `
      );
      return response.json({ items: result.rows });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load menu items.',
        details: error.message
      });
    }
  });

  router.post('/manage/items', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const name = String(request.body?.menuItemCategory ?? '').trim();
    const price = Number(request.body?.pricePerUnit);
    if (!name) {
      return response.status(400).json({ error: 'Menu item name is required.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return response.status(400).json({ error: 'Price must be a non-negative number.' });
    }

    try {
      const result = await pool.query(
        `
          INSERT INTO menu_item (menu_item_category, price_per_unit)
          VALUES ($1, $2)
          RETURNING menu_item_id, menu_item_category, price_per_unit
        `,
        [name, price.toFixed(2)]
      );
      return response.status(201).json({ item: result.rows[0] });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to add menu item.',
        details: error.message
      });
    }
  });

  router.patch('/manage/items/:menuItemId/price', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const menuItemId = Number(request.params.menuItemId);
    const price = Number(request.body?.pricePerUnit);
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return response.status(400).json({ error: 'Valid menu item ID is required.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return response.status(400).json({ error: 'Price must be a non-negative number.' });
    }

    try {
      const result = await pool.query(
        `
          UPDATE menu_item
          SET price_per_unit = $1
          WHERE menu_item_id = $2
          RETURNING menu_item_id, menu_item_category, price_per_unit
        `,
        [price.toFixed(2), menuItemId]
      );
      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Menu item not found.' });
      }
      return response.json({ item: result.rows[0] });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update menu price.',
        details: error.message
      });
    }
  });

  router.patch('/manage/items/:menuItemId', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const menuItemId = Number(request.params.menuItemId);
    const name = String(request.body?.menuItemCategory ?? '').trim();
    const price = Number(request.body?.pricePerUnit);
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return response.status(400).json({ error: 'Valid menu item ID is required.' });
    }
    if (!name) {
      return response.status(400).json({ error: 'Menu item name is required.' });
    }
    if (!Number.isFinite(price) || price < 0) {
      return response.status(400).json({ error: 'Price must be a non-negative number.' });
    }

    try {
      const result = await pool.query(
        `
          UPDATE menu_item
          SET menu_item_category = $1, price_per_unit = $2
          WHERE menu_item_id = $3
          RETURNING menu_item_id, menu_item_category, price_per_unit
        `,
        [name, price.toFixed(2), menuItemId]
      );
      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Menu item not found.' });
      }
      return response.json({ item: result.rows[0] });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update menu item.',
        details: error.message
      });
    }
  });

  router.get('/manage/ingredient-options', authenticateRequest, requireRole('manager'), async (_request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    try {
      const result = await pool.query(
        `
          SELECT item_inventory_id, name, item_category
          FROM item_inventory
          WHERE item_category IN ('ingredient', 'packaging', 'supply')
          ORDER BY
            CASE item_category
              WHEN 'packaging' THEN 1
              WHEN 'supply' THEN 2
              WHEN 'ingredient' THEN 3
              ELSE 4
            END,
            name, item_inventory_id
        `
      );
      return response.json({ items: result.rows });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load ingredient options.',
        details: error.message
      });
    }
  });

  router.get('/manage/items/:menuItemId/recipe', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const menuItemId = Number(request.params.menuItemId);
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return response.status(400).json({ error: 'Valid menu item ID is required.' });
    }

    try {
      const result = await pool.query(
        `
          SELECT
            o.ctid::text AS row_ref,
            o.menu_item_id,
            o.item_inventory_id,
            i.name AS ingredient_name,
            o.quantity
          FROM other_item_ingredients o
          JOIN item_inventory i ON i.item_inventory_id = o.item_inventory_id
          WHERE o.menu_item_id = $1
          ORDER BY o.item_inventory_id, o.quantity, o.ctid
        `,
        [menuItemId]
      );
      return response.json({ items: result.rows });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load recipe components.',
        details: error.message
      });
    }
  });

  router.post('/manage/items/:menuItemId/recipe', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const menuItemId = Number(request.params.menuItemId);
    const itemInventoryId = Number(request.body?.itemInventoryId);
    const quantity = Number(request.body?.quantity);
    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return response.status(400).json({ error: 'Valid menu item ID is required.' });
    }
    if (!Number.isInteger(itemInventoryId) || itemInventoryId <= 0) {
      return response.status(400).json({ error: 'Valid component inventory ID is required.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return response.status(400).json({ error: 'Quantity must be a whole number greater than 0.' });
    }

    try {
      await pool.query(
        `
          INSERT INTO other_item_ingredients (menu_item_id, item_inventory_id, quantity)
          VALUES ($1, $2, $3)
        `,
        [menuItemId, itemInventoryId, quantity]
      );
      return response.status(201).json({ ok: true });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to add recipe component.',
        details: error.message
      });
    }
  });

  router.patch('/manage/recipe-row', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const rowRef = String(request.body?.rowRef ?? '').trim();
    const quantity = Number(request.body?.quantity);
    if (!rowRef) {
      return response.status(400).json({ error: 'Recipe row reference is required.' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return response.status(400).json({ error: 'Quantity must be a whole number greater than 0.' });
    }

    try {
      const result = await pool.query(
        `
          UPDATE other_item_ingredients
          SET quantity = $1
          WHERE ctid = $2::tid
          RETURNING ctid::text AS row_ref
        `,
        [quantity, rowRef]
      );
      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Recipe row not found.' });
      }
      return response.json({ ok: true });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update recipe row.',
        details: error.message
      });
    }
  });

  router.delete('/manage/recipe-row', authenticateRequest, requireRole('manager'), async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const rowRef = String(request.body?.rowRef ?? '').trim();
    if (!rowRef) {
      return response.status(400).json({ error: 'Recipe row reference is required.' });
    }

    try {
      const result = await pool.query(
        `
          DELETE FROM other_item_ingredients
          WHERE ctid = $1::tid
          RETURNING ctid::text AS row_ref
        `,
        [rowRef]
      );
      if (result.rows.length === 0) {
        return response.status(404).json({ error: 'Recipe row not found.' });
      }
      return response.json({ ok: true });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to remove recipe row.',
        details: error.message
      });
    }
  });

  return router;
}
