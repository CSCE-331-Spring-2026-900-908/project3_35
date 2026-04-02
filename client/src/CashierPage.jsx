import StaffAccessPage from './components/StaffAccessPage';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from './apiBase';
import { buildAuthHeaders } from './auth';

const TAX_RATE = 0.0825;

// Error handler function
function parseApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  return payload.details || payload.error || null;
}

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

// Load menu from menu backend route
async function loadMenu() {
  try {
    const response = await fetch(apiUrl('/api/menu'), {
      headers: { ...buildAuthHeaders() } 
    });
    const payload = await response.json();
    setMenu(payload.items || []); // Assuming your state is named 'menu'
  } catch (error) {
    console.error("Menu failed to load:", error);
  }
}

// Submit Order
async function handleSubmitOrder() {
  const payload = {
    customerName: customerName || 'Walk-in',
    orderType: 'In-Store', // Different from Customer 'Pickup'
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
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      setCart([]); // Clear cart after success
      alert("Order submitted successfully!");
    }
  } catch (error) {
    alert("Checkout failed: " + error.message);
  }
}

// Item cart count
function updateQuantity(id, delta) {
  setCart(current => current.map(item => 
    item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
  ));
}


// Main cashier dashboard
function cashierDashboard() {
  // TODO code cashier front end design
}

// Cashier Webpage Style
const styles = {
  // TODO code the react.js website style
}


export default function CashierPage() {
  return (
    <StaffAccessPage
      requiredRole="employee"
      title="Cashier Interface"
      description="Staff must sign in before accessing the counter-facing POS experience."
    />
  );
}
