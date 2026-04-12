import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';
import { buildAuthHeaders } from './auth';


import StaffAccessPage from './components/StaffAccessPage.jsx';
import MenuCard from './components/MenuCard.jsx';
import CartPanel from './components/CartPanel.jsx';
import CustomizerPanel from './components/CustomizerPanel.jsx';


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
    <div className="cashier-layout" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', minHeight: '100vh', background: '#efe7dc' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ color: '#2f211b', margin: 0 }}>POS Terminal</h1>
        <Link to="/" style={{ textDecoration: 'none', padding: '10px 20px', background: '#fff', border: '1px solid #6f3c20', color: '#6f3c20', borderRadius: '12px', fontWeight: 'bold' }}>
          Back to Portal
        </Link>
      </header>

      <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* Shows Drinks OR Toppings, never both with a selectedItem variable */}
          {!selectedItem ? (
            <>
              {/* drink filter */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    style={{
                      padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer',
                      border: activeCategory === category ? '2px solid #6f3c20' : '1px solid #bda99a',
                      background: activeCategory === category ? '#fff3e6' : '#ffffff',
                      color: activeCategory === category ? '#6f3c20' : '#2f211b',
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* drink grid */}
              <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px', alignContent: 'start', overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
                {menu.length === 0 ? (
                  <p style={{color: '#6f3c20'}}>Loading menu items...</p>
                ) : displayedMenu.length === 0 ? (
                  <p style={{color: '#6f3c20'}}>No items found in {activeCategory}.</p>
                ) : (
                  displayedMenu.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => openCustomizer(item)}
                      style={{ background: '#ffffff', border: '1px solid #e3d8cb', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}
                    >
                      <strong style={{ fontSize: '18px', color: '#2f211b', marginBottom: '10px' }}>{item.name}</strong>
                      <span style={{ fontSize: '16px', color: '#6f3c20' }}>${(Number(item.basePrice) || 0).toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </>
            
          ) : (
            
            // TOPPINGS CUSTOMIZER GRID ---
            <div style={{ background: '#f8f3eb', borderRadius: '12px', border: '1px solid #e3d8cb', padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 6px 12px rgba(0,0,0,0.08)' }}>    
              
              {/* Customizer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f8f3eb', paddingBottom: '15px', marginBottom: '15px' }}>
                <div>
                  <h2 style={{ margin: 0, color: '#2f211b', fontSize: '28px' }}>{selectedItem.name}</h2>
                  <span style={{ fontSize: '18px', color: '#6b5b50', fontWeight: 'bold' }}>Current Total: ${selection.total.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => { setSelectedItem(null); setSelection(null); }} 
                  style={{ padding: '12px 24px', background: '#fff', border: '2px solid #a33a2b', color: '#a33a2b', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>

              {/* Customizer Options */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div>
                  <h3 style={{ color: '#2f211b', margin: '0 0 10px 0' }}>Size</h3>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {['Regular', 'Large'].map(size => (
                      <button key={size} onClick={() => updateSelection('size', size)} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: selection.size === size ? '2px solid #6f3c20' : '1px solid #e3d8cb', background: selection.size === size ? '#fff3e6' : '#fff', color: selection.size === size ? '#6f3c20' : '#2f211b', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                        {size} {size === 'Large' ? '(+$0.90)' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#2f211b', margin: '0 0 10px 0' }}>Sweetness</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {['0%', '25%', '50%', '75%', '100%'].map(level => (
                        <button key={level} onClick={() => updateSelection('sweetness', level)} style={{ padding: '12px', borderRadius: '8px', border: selection.sweetness === level ? '2px solid #6f3c20' : '1px solid #e3d8cb', background: selection.sweetness === level ? '#fff3e6' : '#fff', color: selection.sweetness === level ? '#6f3c20' : '#2f211b', fontWeight: 'bold', cursor: 'pointer' }}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#2f211b', margin: '0 0 10px 0' }}>Ice Level</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {['No Ice', 'Less Ice', 'Regular Ice', 'Extra Ice'].map(level => (
                        <button key={level} onClick={() => updateSelection('ice', level)} style={{ padding: '12px', borderRadius: '8px', border: selection.ice === level ? '2px solid #6f3c20' : '1px solid #e3d8cb', background: selection.ice === level ? '#fff3e6' : '#fff', color: selection.ice === level ? '#6f3c20' : '#2f211b', fontWeight: 'bold', cursor: 'pointer' }}>
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ color: '#2f211b', margin: '0 0 10px 0' }}>Toppings</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '15px' }}>
                    {(!selectedItem.toppings || selectedItem.toppings.length === 0) ? (
                      <p style={{ color: '#6b5b50' }}>No toppings mapped for this drink.</p>
                    ) : (
                      selectedItem.toppings.map(topping => {
                        const isSelected = selection.toppings.includes(topping.name);
                        return (
                          <button key={topping.name} onClick={() => toggleTopping(topping.name)} style={{ padding: '15px', borderRadius: '12px', border: isSelected ? '3px solid #6f3c20' : '2px solid #e3d8cb', background: isSelected ? '#fff3e6' : '#ffffff', color: isSelected ? '#6f3c20' : '#2f211b', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'all 0.1s' }}>
                            <strong style={{ fontSize: '16px', marginBottom: '5px' }}>{topping.name}</strong>
                            <span style={{ fontSize: '14px', color: isSelected ? '#6f3c20' : '#6b5b50' }}>+${(Number(topping.price) || 0).toFixed(2)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Add to Cart Button */}
              <div style={{ paddingTop: '15px', borderTop: '2px solid #f8f3eb', marginTop: '10px' }}>
                <button onClick={addToCart} style={{ width: '100%', padding: '20px', background: '#6f3c20', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Add Drink to Cart
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart sidebar*/}    
        <div style={{ flex: 1, minWidth: '350px', background: '#fff', borderRadius: '12px', border: '1px solid #e3d8cb', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          {/* cart sidebar header */}
          <div style={{ background: '#f8f3eb', padding: '20px', borderBottom: '1px solid #e3d8cb' }}>
            <h2 style={{ margin: 0, color: '#2f211b', fontSize: '22px' }}>Current Order</h2>
          </div>

          {/* receipt (scrollable items) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {cart.length === 0 ? (
              <p style={{ color: '#bda99a', textAlign: 'center', marginTop: '40px', fontSize: '18px' }}>Order is empty.</p>
            ) : (
              cart.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e3d8cb', paddingBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: '18px', color: '#2f211b' }}>{item.name}</strong>
                    <span style={{ display: 'block', fontSize: '14px', color: '#6b5b50', marginTop: '4px' }}>
                      {item.size} • {item.sweetness} • {item.ice}
                    </span>
                    {item.toppings && item.toppings.length > 0 && (
                      <span style={{ display: 'block', fontSize: '14px', color: '#6b5b50' }}>
                        + {item.toppings.join(', ')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '16px', color: '#2f211b' }}>${item.total.toFixed(2)}</strong>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: 'transparent', border: 'none', color: '#a33a2b', cursor: 'pointer', fontSize: '14px', padding: 0, marginTop: '8px', fontWeight: 'bold' }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart buttons */}
          <div style={{ background: '#f8f3eb', padding: '20px', borderTop: '1px solid #e3d8cb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#6b5b50' }}>
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#6b5b50' }}>
              <span>Tax</span><span>${tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '24px', fontWeight: 'bold', color: '#2f211b' }}>
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCart([])} style={{ flex: 1, padding: '15px', background: '#ffffff', border: '2px solid #a33a2b', color: '#a33a2b', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
                Clear
              </button>
              <button onClick={handleSubmitOrder} disabled={cart.length === 0} style={{ flex: 2, padding: '15px', background: cart.length === 0 ? '#bda99a' : '#6f3c20', border: 'none', color: '#fff', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}>
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