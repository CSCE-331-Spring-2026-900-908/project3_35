import StaffAccessPage from './components/StaffAccessPage';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl } from './apiBase';
import { buildAuthHeaders } from './auth';
import MenuCard from './components/MenuCard';
import CartPanel from './components/CartPanel';
import CustomizerPanel from './components/CustomizerPanel';

app.use('/api/auth', authRoutes);      // Handled by auth.js
app.use('/api/inventory', inventoryRoutes); // Handled by inventory.js
app.use('/api/menu', menuRoutes);       // Handled by menu.js
app.use('/api/orders', orderRoutes);    // Handled by orders.js


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
  const toppingTotal = item.toppings
    .filter((topping) => selection.toppings.includes(topping.name))
    .reduce((sum, topping) => sum + topping.price, 0);
  return item.basePrice + sizeUpcharge + toppingTotal;
}







// Main cashier dashboard and variables 
function CashierDashboard() {
  //code cashier front end design
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);
  const [customerName, setCustomerName] = useState('Walk-in');

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

    if (!response.ok) {
      const errorDetails = parseApiError(payload) || 'Menu request failed';
      console.error(errorDetails);
      return;
    }

    setMenu(payload.items || []);
  } 
  
  catch (error) {
    console.error("Menu failed to load:", error);
  }
}

  // Item cart count
  function updateQuantity(id, delta) {
  setCart(current => current.map(item => 
    item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
  ));
}

  // Submit Order
  async function handleSubmitOrder() {
  const orderData = {
    customerName: customerName || 'Walk-in',
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
      body: JSON.stringify(orderData) 
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
  <div className="cashier-layout" style={{ display: 'flex', gap: '20px', padding: '20px' }}>
    {/* Menu Grid */}
    <div className="menu-grid" style={{ flex: 2 }}>
      {menu.map(item => (
        <MenuCard 
          key={item.id} 
          item={item} 
          onCustomize={() => openCustomizer(item)} 
        />
      ))}
    </div>

    {/* Cart Panel */}
    <div className="cart-sidebar" style={{ flex: 1 }}>
      <CartPanel 
        cart={cart} 
        subtotal={subtotal} 
        tax={tax} 
        total={total} 
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity} 
        onSubmitOrder={handleSubmitOrder} 
      />
    </div>

    {/* Customizer Popup */}
    {selectedItem && (
      <CustomizerPanel 
        item={selectedItem} 
        selection={selection}
        onSelectionChange={updateSelection}
        onToggleTopping={toggleTopping}    
        onClose={() => setSelectedItem(null)} 
        onAddToCart={addToCart}             
      />
    )}
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
