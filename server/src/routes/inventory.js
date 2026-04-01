import { Router } from 'express';
import { authenticateRequest, requireRole } from '../auth.js';

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

  return router;
}
