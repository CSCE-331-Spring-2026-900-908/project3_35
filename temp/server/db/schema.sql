CREATE TABLE IF NOT EXISTS menu_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS menu_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES menu_categories(id),
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS topping_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS drink_toppings (
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  topping_id INTEGER NOT NULL REFERENCES topping_types(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, topping_id)
);

CREATE TABLE IF NOT EXISTS customer_orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  order_type VARCHAR(40) NOT NULL,
  pickup_window VARCHAR(40) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'received',
  external_order_number VARCHAR(40) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  menu_item_name VARCHAR(120) NOT NULL,
  size_choice VARCHAR(20) NOT NULL,
  sweetness_choice VARCHAR(20) NOT NULL,
  ice_choice VARCHAR(20) NOT NULL,
  special_instructions TEXT NOT NULL DEFAULT '',
  item_total NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_item_toppings (
  id SERIAL PRIMARY KEY,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  topping_name VARCHAR(120) NOT NULL
);

INSERT INTO menu_categories (name)
VALUES ('Milk Tea'), ('Fruit Tea'), ('Seasonal'), ('Slush')
ON CONFLICT (name) DO NOTHING;

INSERT INTO topping_types (name, price)
VALUES
  ('Brown Sugar Boba', 0.90),
  ('Sea Salt Foam', 0.80),
  ('Lychee Jelly', 0.70),
  ('Crystal Boba', 0.85),
  ('Aloe Vera', 0.75),
  ('Mango Stars', 0.95),
  ('Strawberry Poppers', 0.95),
  ('Whipped Foam', 0.80),
  ('Rainbow Jelly', 0.75),
  ('Peach Bits', 0.90),
  ('Coconut Jelly', 0.70),
  ('Red Bean', 0.85),
  ('Coffee Jelly', 0.80)
ON CONFLICT (name) DO NOTHING;

INSERT INTO menu_items (category_id, name, description, base_price)
SELECT mc.id, item_name, item_description, item_price
FROM (
  VALUES
    ('Milk Tea', 'Tidal Drift Milk Tea', 'Black tea with brown sugar pearls and a silky house cream cap.', 5.40),
    ('Fruit Tea', 'Moonlit Mango Green Tea', 'Jasmine green tea shaken with mango puree and citrus brightness.', 5.70),
    ('Slush', 'Nebula Strawberry Slush', 'A frozen strawberry cloud drink finished with popping pearls.', 6.10),
    ('Fruit Tea', 'Lantern Oolong Peach Tea', 'Roasted oolong, white peach syrup, and a bright floral finish.', 5.60),
    ('Seasonal', 'Equinox Matcha Tide', 'Ceremonial-style matcha with toasted vanilla milk and oat cream.', 6.25),
    ('Milk Tea', 'Harbor Thai Velvet', 'Bold Thai tea layered with condensed milk and amber pearls.', 5.95)
) AS seed(category_name, item_name, item_description, item_price)
JOIN menu_categories mc ON mc.name = seed.category_name
ON CONFLICT (name) DO NOTHING;

INSERT INTO drink_toppings (menu_item_id, topping_id)
SELECT mi.id, tt.id
FROM (
  VALUES
    ('Tidal Drift Milk Tea', 'Brown Sugar Boba'),
    ('Tidal Drift Milk Tea', 'Sea Salt Foam'),
    ('Tidal Drift Milk Tea', 'Lychee Jelly'),
    ('Moonlit Mango Green Tea', 'Crystal Boba'),
    ('Moonlit Mango Green Tea', 'Aloe Vera'),
    ('Moonlit Mango Green Tea', 'Mango Stars'),
    ('Nebula Strawberry Slush', 'Strawberry Poppers'),
    ('Nebula Strawberry Slush', 'Whipped Foam'),
    ('Nebula Strawberry Slush', 'Rainbow Jelly'),
    ('Lantern Oolong Peach Tea', 'Peach Bits'),
    ('Lantern Oolong Peach Tea', 'Coconut Jelly'),
    ('Lantern Oolong Peach Tea', 'Aloe Vera'),
    ('Equinox Matcha Tide', 'Red Bean'),
    ('Equinox Matcha Tide', 'Sea Salt Foam'),
    ('Equinox Matcha Tide', 'Crystal Boba'),
    ('Harbor Thai Velvet', 'Brown Sugar Boba'),
    ('Harbor Thai Velvet', 'Coffee Jelly'),
    ('Harbor Thai Velvet', 'Sea Salt Foam')
) AS link(menu_name, topping_name)
JOIN menu_items mi ON mi.name = link.menu_name
JOIN topping_types tt ON tt.name = link.topping_name
ON CONFLICT (menu_item_id, topping_id) DO NOTHING;
