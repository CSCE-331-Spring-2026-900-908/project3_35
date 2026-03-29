import { useEffect, useMemo, useState } from 'react';
import CartPanel from './components/CartPanel';
import CustomizerPanel from './components/CustomizerPanel';
import MenuCard from './components/MenuCard';

const TAX_RATE = 0.0825;

const fallbackMenu = [
  {
    id: 1,
    name: 'Tidal Drift Milk Tea',
    category: 'Milk Tea',
    description: 'Black tea with brown sugar pearls and a silky house cream cap.',
    basePrice: 5.4,
    toppings: [
      { name: 'Brown Sugar Boba', price: 0.9 },
      { name: 'Sea Salt Foam', price: 0.8 },
      { name: 'Lychee Jelly', price: 0.7 }
    ]
  },
  {
    id: 2,
    name: 'Moonlit Mango Green Tea',
    category: 'Fruit Tea',
    description: 'Jasmine green tea shaken with mango puree and citrus brightness.',
    basePrice: 5.7,
    toppings: [
      { name: 'Crystal Boba', price: 0.85 },
      { name: 'Aloe Vera', price: 0.75 },
      { name: 'Mango Stars', price: 0.95 }
    ]
  },
  {
    id: 3,
    name: 'Nebula Strawberry Slush',
    category: 'Slush',
    description: 'A frozen strawberry cloud drink finished with popping pearls.',
    basePrice: 6.1,
    toppings: [
      { name: 'Strawberry Poppers', price: 0.95 },
      { name: 'Whipped Foam', price: 0.8 },
      { name: 'Rainbow Jelly', price: 0.75 }
    ]
  },
  {
    id: 4,
    name: 'Lantern Oolong Peach Tea',
    category: 'Fruit Tea',
    description: 'Roasted oolong, white peach syrup, and a bright floral finish.',
    basePrice: 5.6,
    toppings: [
      { name: 'Peach Bits', price: 0.9 },
      { name: 'Coconut Jelly', price: 0.7 },
      { name: 'Aloe Vera', price: 0.75 }
    ]
  },
  {
    id: 5,
    name: 'Equinox Matcha Tide',
    category: 'Seasonal',
    description: 'Ceremonial-style matcha with toasted vanilla milk and oat cream.',
    basePrice: 6.25,
    toppings: [
      { name: 'Red Bean', price: 0.85 },
      { name: 'Sea Salt Foam', price: 0.8 },
      { name: 'Crystal Boba', price: 0.85 }
    ]
  },
  {
    id: 6,
    name: 'Harbor Thai Velvet',
    category: 'Milk Tea',
    description: 'Bold Thai tea layered with condensed milk and amber pearls.',
    basePrice: 5.95,
    toppings: [
      { name: 'Brown Sugar Boba', price: 0.9 },
      { name: 'Coffee Jelly', price: 0.8 },
      { name: 'Sea Salt Foam', price: 0.8 }
    ]
  }
];

function buildDefaultSelection(item) {
  return {
    itemId: item.id,
    size: 'Regular',
    sweetness: '75%',
    ice: 'Regular Ice',
    toppings: [],
    notes: '',
    total: item.basePrice
  };
}

function calculateTotal(item, selection) {
  const sizeUpcharge = selection.size === 'Large' ? 0.9 : 0;
  const toppingTotal = item.toppings
    .filter((topping) => selection.toppings.includes(topping.name))
    .reduce((sum, topping) => sum + topping.price, 0);
  return item.basePrice + sizeUpcharge + toppingTotal;
}

export default function App() {
  const [menu, setMenu] = useState(fallbackMenu);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready for your next handcrafted drink.');
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    pickupWindow: 'ASAP',
    orderType: 'Pickup'
  });

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
          throw new Error('Menu request failed');
        }
        const payload = await response.json();
        if (Array.isArray(payload.items) && payload.items.length > 0) {
          setMenu(payload.items);
        }
      } catch (error) {
        setStatusMessage('Using sample menu while the backend is unavailable.');
      }
    }

    loadMenu();
  }, []);

  const categories = useMemo(() => {
    return ['All', ...new Set(menu.map((item) => item.category))];
  }, [menu]);

  const visibleMenu = useMemo(() => {
    if (activeCategory === 'All') {
      return menu;
    }
    return menu.filter((item) => item.category === activeCategory);
  }, [activeCategory, menu]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  function openCustomizer(item) {
    const nextSelection = buildDefaultSelection(item);
    nextSelection.total = calculateTotal(item, nextSelection);
    setSelectedItem(item);
    setSelection(nextSelection);
  }

  function updateSelection(field, value) {
    if (!selectedItem || !selection) {
      return;
    }
    const next = { ...selection, [field]: value };
    next.total = calculateTotal(selectedItem, next);
    setSelection(next);
  }

  function toggleTopping(name) {
    if (!selectedItem || !selection) {
      return;
    }
    const toppings = selection.toppings.includes(name)
      ? selection.toppings.filter((item) => item !== name)
      : [...selection.toppings, name];
    const next = { ...selection, toppings };
    next.total = calculateTotal(selectedItem, next);
    setSelection(next);
  }

  function addToCart() {
    if (!selectedItem || !selection) {
      return;
    }
    const selectedToppings = selectedItem.toppings.filter((topping) =>
      selection.toppings.includes(topping.name)
    );
    setCart((current) => [
      ...current,
      {
        id: `${selectedItem.id}-${Date.now()}`,
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        quantity: 1,
        size: selection.size,
        sweetness: selection.sweetness,
        ice: selection.ice,
        toppings: selection.toppings,
        toppingInventoryIds: selectedToppings
          .map((topping) => topping.id)
          .filter((value) => Number.isInteger(value)),
        notes: selection.notes.trim(),
        total: selection.total
      }
    ]);
    setStatusMessage(`${selectedItem.name} added to cart.`);
    setSelectedItem(null);
    setSelection(null);
  }

  function removeCartItem(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function handleCheckoutChange(event) {
    const { name, value } = event.target;
    setCheckoutForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();
    if (cart.length === 0) {
      return;
    }

    const payload = {
      customerName: checkoutForm.customerName,
      pickupWindow: checkoutForm.pickupWindow,
      orderType: checkoutForm.orderType,
      totals: { subtotal, tax, total },
      items: cart
    };

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let details = 'Order request failed';
        try {
          const errorPayload = await response.json();
          details = errorPayload.details || errorPayload.error || details;
        } catch (_error) {
        }
        throw new Error(details);
      }

      const result = await response.json();
      setCart([]);
      setCheckoutForm({
        customerName: '',
        pickupWindow: 'ASAP',
        orderType: 'Pickup'
      });
      setStatusMessage(`Order confirmed. Ticket ${result.orderNumber} is in progress.`);
    } catch (error) {
      setStatusMessage(`Order could not be submitted: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="section-tag">Moonwake Tea Atelier</p>
          <h1>Order bubble tea like a curated tasting, not a spreadsheet.</h1>
          <p>
            This customer web POS keeps the category and customization strengths of the original cashier
            system while turning them into a calmer, more accessible ordering experience.
          </p>
        </div>
        <div className="hero__panel">
          <div className="hero-stat">
            <span>Vendor</span>
            <strong>Imaginary, original brand</strong>
          </div>
          <div className="hero-stat">
            <span>Experience</span>
            <strong>React storefront + Express API</strong>
          </div>
          <div className="hero-stat">
            <span>Backend</span>
            <strong>PostgreSQL-ready order model</strong>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="menu-section">
          <div className="menu-toolbar">
            <div>
              <p className="section-tag">Menu</p>
              <h2>Craft Your Order</h2>
            </div>
            <div className="choice-row" aria-label="Menu categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`choice-chip ${activeCategory === category ? 'choice-chip--selected' : ''}`}
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-grid">
            {visibleMenu.map((item) => (
              <MenuCard key={item.id} item={item} onCustomize={openCustomizer} />
            ))}
          </div>
        </section>

        <CustomizerPanel
          item={selectedItem}
          selection={selection}
          onSelectionChange={updateSelection}
          onToggleTopping={toggleTopping}
          onClose={() => {
            setSelectedItem(null);
            setSelection(null);
          }}
          onAddToCart={addToCart}
        />

        <CartPanel
          cart={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          checkoutForm={checkoutForm}
          onCheckoutChange={handleCheckoutChange}
          onRemoveItem={removeCartItem}
          onSubmitOrder={handleSubmitOrder}
          submitting={submitting}
          statusMessage={statusMessage}
        />
      </main>
    </div>
  );
}
