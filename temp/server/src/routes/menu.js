import { Router } from 'express';
import { sampleMenu } from '../data/sampleMenu.js';

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
    description: row.description || `A signature ${row.category.toLowerCase()} from Moonwake Tea Atelier.`,
    basePrice: Number(row.base_price),
    toppings
  }));
}

export function createMenuRouter(pool) {
  const router = Router();

  router.get('/', async (_request, response) => {
    if (!pool) {
      return response.json({ source: 'sample', items: sampleMenu });
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

    try {
      return response.json({ source: 'sample-fallback', items: sampleMenu });
    } catch (error) {
      return response.json({ source: 'sample-fallback', items: sampleMenu, warning: error.message });
    }
  });

  return router;
}
