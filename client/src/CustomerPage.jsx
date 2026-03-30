import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from './apiBase';
import CartPanel from './components/CartPanel';
import CustomizerPanel from './components/CustomizerPanel';
import MenuCard from './components/MenuCard';

const TAX_RATE = 0.0825;

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

export default function CustomerPage() {
  const [menu, setMenu] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready for your next handcrafted drink.');
  const [menuError, setMenuError] = useState('');
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    pickupWindow: 'ASAP',
    orderType: 'Pickup'
  });

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch(apiUrl('/api/menu'));
        if (!response.ok) {
          let details = 'Menu request failed';
          try {
            const errorPayload = await response.json();
            details = errorPayload.details || errorPayload.error || details;
          } catch (_error) {
          }
          throw new Error(details);
        }
        const payload = await response.json();
        if (!Array.isArray(payload.items) || payload.items.length === 0) {
          throw new Error('No menu items were returned from the database.');
        }
        setMenu(payload.items);
        setMenuError('');
      } catch (error) {
        setMenu([]);
        setMenuError(error.message);
        setStatusMessage('Menu unavailable. Database menu data is required.');
      }
    }

    loadMenu();
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      document.body.classList.remove('modal-open');
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSelectedItem(null);
        setSelection(null);
      }
    }

    document.body.classList.add('modal-open');
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedItem]);

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

  function closeCustomizer() {
    setSelectedItem(null);
    setSelection(null);
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
      const response = await fetch(apiUrl('/api/orders'), {
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
          <p className="section-tag">Sharetea</p>
          <h1>Handcrafted bubble tea, made your way.</h1>
          <p>
            Explore signature milk teas, fruit blends, and seasonal specials in a storefront designed
            to feel like ordering from a modern cafe menu instead of a back-office register.
          </p>
          <div className="hero__details">
            <span>Fresh teas brewed daily</span>
            <span>Custom sweetness and ice levels</span>
            <span>Pickup ordering in a few taps</span>
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
            {menuError ? (
              <p className="empty-state">
                Unable to load menu items from the database: {menuError}
              </p>
            ) : visibleMenu.length > 0 ? (
              visibleMenu.map((item) => (
                <MenuCard key={item.id} item={item} onCustomize={openCustomizer} />
              ))
            ) : (
              <p className="empty-state">No menu items are currently available from the database.</p>
            )}
          </div>
        </section>

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

      {selectedItem && selection ? (
        <CustomizerPanel
          item={selectedItem}
          selection={selection}
          onSelectionChange={updateSelection}
          onToggleTopping={toggleTopping}
          onClose={closeCustomizer}
          onAddToCart={addToCart}
        />
      ) : null}
    </div>
  );
}
