export default function CartPanel({
  cart,
  subtotal,
  tax,
  total,
  checkoutForm,
  onCheckoutChange,
  onRemoveItem,
  onSubmitOrder,
  submitting,
  statusMessage
}) {
  return (
    <aside className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-panel__header">
        <p className="section-tag">Current Order</p>
        <h2 id="cart-title">Cart</h2>
      </div>

      <div className="cart-list" aria-live="polite">
        {cart.length === 0 ? (
          <p className="empty-state">Your cart is empty. Add a drink to start an order.</p>
        ) : (
          cart.map((item) => (
            <article key={item.id} className="cart-item">
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.size} • {item.sweetness} • {item.ice}
                </p>
                {item.toppings.length > 0 ? <p>Toppings: {item.toppings.join(', ')}</p> : null}
                {item.notes ? <p>Note: {item.notes}</p> : null}
              </div>
              <div className="cart-item__meta">
                <strong>${item.total.toFixed(2)}</strong>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => onRemoveItem(item.id)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <form className="checkout-form" onSubmit={onSubmitOrder}>
        <label>
          <span>Name</span>
          <input
            name="customerName"
            value={checkoutForm.customerName}
            onChange={onCheckoutChange}
            placeholder="Customer name"
            required
          />
        </label>

        <label>
          <span>Pickup Time</span>
          <select name="pickupWindow" value={checkoutForm.pickupWindow} onChange={onCheckoutChange}>
            <option value="ASAP">ASAP</option>
            <option value="10 minutes">10 minutes</option>
            <option value="20 minutes">20 minutes</option>
            <option value="30 minutes">30 minutes</option>
          </select>
        </label>

        <label>
          <span>Order Type</span>
          <select name="orderType" value={checkoutForm.orderType} onChange={onCheckoutChange}>
            <option value="Pickup">Pickup</option>
            <option value="Dine-In">Dine-In</option>
          </select>
        </label>

        <div className="totals">
          <div><span>Subtotal</span><strong>${subtotal.toFixed(2)}</strong></div>
          <div><span>Tax</span><strong>${tax.toFixed(2)}</strong></div>
          <div className="totals__grand"><span>Total</span><strong>${total.toFixed(2)}</strong></div>
        </div>

        <button type="submit" className="button button--primary button--full" disabled={cart.length === 0 || submitting}>
          {submitting ? 'Submitting Order...' : 'Place Order'}
        </button>

        <p className="status-message" aria-live="polite">
          {statusMessage}
        </p>
      </form>
    </aside>
  );
}
