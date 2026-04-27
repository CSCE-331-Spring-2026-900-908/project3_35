import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth.js';

function cleanString(value) {
  return String(value ?? '').trim();
}

function parseInventoryPayload(payload) {
  const name = cleanString(payload.name);
  const category = cleanString(payload.itemCategory);
  const quantity = Number(payload.quantityAvailable);
  const price = Number(payload.pricePerUnit);

  if (!name) {
    return { error: 'Item name is required.' };
  }
  if (!category) {
    return { error: 'Item category is required.' };
  }
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
    return { error: 'Quantity must be a non-negative whole number.' };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'Price must be a non-negative number.' };
  }

  return {
    item: {
      name,
      itemCategory: category,
      quantityAvailable: quantity,
      pricePerUnit: price.toFixed(2)
    }
  };
}

export function createInventoryRouter(pool) {
  const router = Router();

  router.use(authenticateRequest, requireRole('employee', 'manager'));

  router.get('/', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const category = request.query.category;
    const lowStock = request.query.lowStock === 'true';
    const threshold = Number(request.query.threshold || 10);

    const conditions = [];
    const values = [];

    if (category) {
      values.push(category);
      conditions.push(`item_category = $${values.length}`);
    }

    if (lowStock) {
      values.push(threshold);
      conditions.push(`quantity_available <= $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    try {
      const result = await pool.query(
        `
          SELECT
            item_inventory_id,
            name,
            quantity_available,
            price_per_unit,
            item_category
          FROM item_inventory
          ${whereClause}
          ORDER BY item_category, name, item_inventory_id
        `,
        values
      );

      return response.json({
        count: result.rows.length,
        items: result.rows
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to load inventory data.',
        details: error.message
      });
    }
  });

  router.post('/', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const { item, error } = parseInventoryPayload(request.body || {});
    if (error) {
      return response.status(400).json({ error });
    }

    try {
      const result = await pool.query(
        `
          INSERT INTO item_inventory (
            name,
            quantity_available,
            price_per_unit,
            item_category,
            order_requested
          )
          VALUES ($1, $2, $3, $4, FALSE)
          RETURNING
            item_inventory_id,
            name,
            quantity_available,
            price_per_unit,
            item_category
        `,
        [item.name, item.quantityAvailable, item.pricePerUnit, item.itemCategory]
      );

      return response.status(201).json({
        item: result.rows[0]
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to create inventory item.',
        details: error.message
      });
    }
  });

  router.patch('/:itemInventoryId', async (request, response) => {
    if (!pool) {
      return response.status(503).json({
        error: 'Database is not configured.',
        details: 'Set the PostgreSQL environment variables in server/.env and restart the server.'
      });
    }

    const itemInventoryId = Number(request.params.itemInventoryId);
    if (!Number.isInteger(itemInventoryId) || itemInventoryId <= 0) {
      return response.status(400).json({
        error: 'A valid item inventory ID is required.'
      });
    }

    const { item, error } = parseInventoryPayload(request.body || {});
    if (error) {
      return response.status(400).json({ error });
    }

    try {
      const result = await pool.query(
        `
          UPDATE item_inventory
          SET
            name = $1,
            quantity_available = $2,
            price_per_unit = $3,
            item_category = $4
          WHERE item_inventory_id = $5
          RETURNING
            item_inventory_id,
            name,
            quantity_available,
            price_per_unit,
            item_category
        `,
        [item.name, item.quantityAvailable, item.pricePerUnit, item.itemCategory, itemInventoryId]
      );

      if (result.rows.length === 0) {
        return response.status(404).json({
          error: 'Inventory item not found.'
        });
      }

      return response.json({
        item: result.rows[0]
      });
    } catch (error) {
      return response.status(500).json({
        error: 'Failed to update inventory item.',
        details: error.message
      });
    }
  });

  return router;
}
