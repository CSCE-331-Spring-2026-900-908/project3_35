import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';
import { buildAuthHeaders } from './auth';
import './cashierstyles.css'

import StaffAccessPage from './components/StaffAccessPage.jsx';
import MenuCard from './components/MenuCard.jsx';
import CartPanel from './components/CartPanel.jsx';
import CustomizerPanel from './components/CustomizerPanel.jsx';
import './cashierstyles.css';

const TAX_RATE = 0.0825;

// Error handler function
function parseApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload.details || payload.error || null;
}
// Initialize new drink state
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
// calculate subtotal
function calculateTotal(item, selection) {
  const sizeUpcharge = selection.size === 'Large' ? 0.9 : 0;
  const toppingTotal = (item.toppings || [])
    .filter((topping) => selection.toppings.includes(topping.name))
    .reduce((sum, topping) => sum + topping.price, 0);
  return item.basePrice + sizeUpcharge + toppingTotal;
}

function normalizeRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

// Drink categories (transfered from project 2)
const CATEGORIES = ["All", "Milk Tea", "Fruit Tea", "Seasonal", "Slush"];

const FRUIT_KEYWORDS = ["mango", "orange", "peach", "strawberry", "lychee", "passion", "passionfruit", "pineapple", "apple", "grape", "watermelon", "kiwi", "lemon", "lime", "blueberry", "raspberry", "blackberry", "cherry", "coconut", "banana", "melon", "honeydew", "pomelo", "grapefruit", "guava", "dragonfruit", "pomegranate", "fruit"];
const SEASONAL_KEYWORDS = ["seasonal", "pumpkin", "peppermint", "gingerbread", "holiday", "autumn", "summer", "christmas", "halloween", "valentine's"];
const SLUSH_KEYWORDS = ["slush", "smoothie", "frozen"];
const MILK_TEA_KEYWORDS = ["thai", "taro", "matcha", "brown sugar", "classic", "oolong", "jasmine"];

function inferCategory(name) {
  const lowerName = (name || "").toLowerCase();
  
  if (SLUSH_KEYWORDS.some(k => lowerName.includes(k))) return "Slush";
  if (SEASONAL_KEYWORDS.some(k => lowerName.includes(k))) return "Seasonal";
  if (FRUIT_KEYWORDS.some(k => lowerName.includes(k))) return "Fruit Tea";
  if (lowerName.includes("milk") || MILK_TEA_KEYWORDS.some(k => lowerName.includes(k))) return "Milk Tea";
  
  return "Milk Tea"; 
}



// Main cashier dashboard and variables 
function CashierDashboard() {
  //code cashier front end design
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Math Calculations
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.total * item.quantity), 0), [cart]);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  
  // Customizer to customize drinks
  function openCustomizer(item) {
    const nextSelection = buildDefaultSelection(item);
    nextSelection.total = calculateTotal(item, nextSelection);
    setSelectedItem(item);
    setSelection(nextSelection);
  }

  // Drink Filter (from project 2)
  const displayedMenu = useMemo(() => {
    return menu.filter(item => {
      if (activeCategory === 'All') return true;
      return inferCategory(item.name) === activeCategory;
    });
  }, [menu, activeCategory]);


  // Add to cart function
  function addToCart() {
    if (!selectedItem || !selection) return;
    
    setCart((current) => [
      ...current,
      {
        id: `${selectedItem.id}-${Date.now()}`, // Unique ID for this specific drink
        menuItemId: selectedItem.id,
        name: selectedItem.name,
        quantity: 1,
        size: selection.size,
        sweetness: selection.sweetness,
        ice: selection.ice,
        toppings: selection.toppings,
        total: selection.total
      }
    ]);
    setSelectedItem(null); // Close the popup
    setSelection(null);

    console.log("Menu State:", menu);
    console.log("Is SelectedItem open?:", !!selectedItem);
  }

  // remove from cart
  function removeFromCart(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  // Toggle Toppings
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

  // Load menu from menu backend route
  async function loadMenu() {
  try {
    const response = await fetch(apiUrl('/api/menu'), {
      headers: { ...buildAuthHeaders() }
    });
    const payload = await response.json();

    if (!response.ok) throw new Error('Failed to load menu');

    // Use the manager's logic to clean the data
    const items = normalizeRows(payload);
    
  
    setMenu(items.map(item => ({
      ...item,
      basePrice: Number(item.basePrice) || 0,
      toppings: item.toppings || []
    })));
  } 
  
  catch (error) {
    console.error("Menu failed:", error);
  }
}

  // Submit Order
  async function handleSubmitOrder() {
  const orderData = {
    customerName: customerName || '',
    orderType: 'In-Store',
    totals: { subtotal, tax, total },
    items: cart
  };

  try {
    const response = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...buildAuthHeaders() 
      },
      body: JSON.stringify(orderData) // Use the renamed variable here
    });

    // Parse the JSON only ONCE
    const result = await response.json();

    if (response.ok) {
      setCart([]); // Clear cart after success
      alert("Order submitted successfully!");
    } 
    else {
      // Use the 'result' variable we just parsed
      const errorMessage = parseApiError(result) || `Request failed (${response.status})`;
      alert("Checkout failed: " + errorMessage);
    }
  } 
  catch (error) {
    alert("Network error: " + error.message);
  }
}

  function updateSelection(field, value) {
    if (!selectedItem || !selection) {
      return;
    }
    const next = { ...selection, [field]: value };
    next.total = calculateTotal(selectedItem, next);
    setSelection(next);
  }

  useEffect(() => {loadMenu();}, []); // Startup

  // UI
  return (
    <div className="cashier-layout">
      <header className="cashier-header">
        <h1>POS Terminal</h1>
      </header>

      <div className="main-content-flex">
        <div className="menu-column">
          {!selectedItem ? (
            <>
              <div className="category-row">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`category-btn ${activeCategory === category ? 'active' : ''}`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="pos-menu-grid">
                {menu.length === 0 ? (
                  <p className="loading-text">Loading menu items...</p>
                ) : displayedMenu.length === 0 ? (
                  <p className="loading-text">No items found in {activeCategory}.</p>
                ) : (
                  displayedMenu.map(item => (
                    <div key={item.id} onClick={() => openCustomizer(item)} className="drink-card">
                      <strong className="drink-card-name">{item.name}</strong>
                      <span className="drink-card-price">${(Number(item.basePrice) || 0).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="customizer-container">
              <div className="customizer-header">
                <div className="header-info">
                  <h2 className="customizer-title">{selectedItem.name}</h2>
                  <span className="customizer-total">Current Total: ${selection.total.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => { setSelectedItem(null); setSelection(null); }} 
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>

              <div className="customizer-options-list">
                {/* SIZE SECTION */}
                <div className="option-section">
                  <h3 className="option-label">Size</h3>
                  <div className="category-row">
                    {['Regular', 'Large'].map(size => (
                      <button 
                        key={size} 
                        onClick={() => updateSelection('size', size)} 
                        className={`category-btn flex-1 ${selection.size === size ? 'active' : ''}`}
                      >
                        {size} {size === 'Large' ? '(+$0.90)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SWEETNESS & ICE SECTION */}
                <div className="dual-options-row">
                  <div className="option-column">
                    <h3 className="option-label">Sweetness</h3>
                    <div className="options-grid">
                      {['0%', '25%', '50%', '75%', '100%'].map(level => (
                        <button 
                          key={level} 
                          onClick={() => updateSelection('sweetness', level)} 
                          className={`category-btn ${selection.sweetness === level ? 'active' : ''}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="option-column">
                    <h3 className="option-label">Ice Level</h3>
                    <div className="options-grid">
                      {['No Ice', 'Less Ice', 'Regular Ice', 'Extra Ice'].map(level => (
                        <button 
                          key={level} 
                          onClick={() => updateSelection('ice', level)} 
                          className={`category-btn ${selection.ice === level ? 'active' : ''}`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TOPPINGS SECTION */}
                <div className="option-section">
                  <h3 className="option-label">Toppings</h3>
                  <div className="toppings-selection-grid">
                    {(!selectedItem.toppings || selectedItem.toppings.length === 0) ? (
                      <p className="no-items-text">No toppings available.</p>
                    ) : (
                      selectedItem.toppings.map(topping => {
                        const isSelected = selection.toppings.includes(topping.name);
                        return (
                          <button 
                            key={topping.name} 
                            onClick={() => toggleTopping(topping.name)} 
                            className={`topping-choice-btn ${isSelected ? 'active' : ''}`}
                          >
                            <strong className="topping-name">{topping.name}</strong>
                            <span className="topping-price">+${Number(topping.price).toFixed(2)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="customizer-footer">
                <button onClick={addToCart} className="btn-add-to-cart">
                  Add Drink to Cart
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="cart-sidebar">
          <div className="cart-header">
            <h2 className="sidebar-title">Current Order</h2>
            <div className="customer-input-group">
              <label className="input-label">Customer Name:</label>
              <input 
                type="text" 
                placeholder="Enter name" 
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="customer-input"
              />
            </div>
          </div>

          <div className="cart-items-scroll">
            {cart.length === 0 ? (
              <p className="empty-cart-msg">Order is empty.</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item-row">
                  <div className="item-info">
                    <strong className="item-name">{item.name}</strong>
                    <span className="item-meta">{item.size} • {item.sweetness} • {item.ice}</span>
                  </div>
                  <div className="item-price-actions">
                    <strong className="item-price">${item.total.toFixed(2)}</strong>
                    <button onClick={() => removeFromCart(item.id)} className="btn-remove-item">Remove</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="totals-panel">
            <div className="totals-breakdown">
              <div className="totals-row"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="totals-row"><span>Tax (8.25%):</span><span>${tax.toFixed(2)}</span></div>
              <div className="grand-total-row"><span>Total:</span><span>${total.toFixed(2)}</span></div>
            </div>

            <div className="action-row">
              <button onClick={() => { setCart([]); setCustomerName(''); }} className="btn-clear-order">Clear</button>
              <button 
                onClick={handleSubmitOrder} 
                disabled={cart.length === 0 || !customerName.trim()}
                className="btn-submit-order"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CashierPage() {
  return (
    <StaffAccessPage
      authMethod="pin"
      requiredRole="employee"
      title="Cashier Interface"
      description="Staff must sign in before accessing the counter-facing POS experience."
    >
      {/* CRITICAL: This is the "Child" component. 
         StaffAccessPage will only show this AFTER the user logs in.
      */}
      <CashierDashboard />
    </StaffAccessPage>
  );
}
