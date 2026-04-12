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
  statusMessage,
  labels
}) {
  return (
    <aside className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-panel__header">
        <p className="section-tag">{labels.currentOrder}</p>
        <h2 id="cart-title">{labels.cart}</h2>
      </div>

      <div className="cart-list" aria-live="polite">
        {cart.length === 0 ? (
          <p className="empty-state">{labels.emptyCart}</p>
        ) : (
          cart.map((item) => (
            <article key={item.id} className="cart-item">
              <div>
                <h3>{item.displayName || item.name}</h3>
                <p>
                  {item.displaySize || item.size} • {item.displaySweetness || item.sweetness} • {item.displayIce || item.ice}
                </p>
                {(item.displayToppings || item.toppings).length > 0 ? (
                  <p>
                    {labels.toppings}: {(item.displayToppings || item.toppings).join(', ')}
                  </p>
                ) : null}
                {item.notes ? (
                  <p>
                    {labels.note}: {item.notes}
                  </p>
                ) : null}
              </div>

              <div className="cart-item__meta">
                <strong>${item.total.toFixed(2)}</strong>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => onRemoveItem(item.id)}
                >
                  {labels.remove}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <form className="checkout-form" onSubmit={onSubmitOrder}>
        <label>
          <span>{labels.name}</span>
          <input
            name="customerName"
            value={checkoutForm.customerName}
            onChange={onCheckoutChange}
            placeholder={labels.customerNamePlaceholder}
            required
          />
        </label>

        <label>
          <span>{labels.pickupTime}</span>
          <select name="pickupWindow" value={checkoutForm.pickupWindow} onChange={onCheckoutChange}>
            <option value="ASAP">{labels.asap}</option>
            <option value="10 minutes">{labels.tenMinutes}</option>
            <option value="20 minutes">{labels.twentyMinutes}</option>
            <option value="30 minutes">{labels.thirtyMinutes}</option>
          </select>
        </label>

        <label>
          <span>{labels.orderType}</span>
          <select name="orderType" value={checkoutForm.orderType} onChange={onCheckoutChange}>
            <option value="Pickup">{labels.pickup}</option>
            <option value="Dine-In">{labels.dineIn}</option>
          </select>
        </label>

        <div className="totals">
          <div>
            <span>{labels.subtotal}</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>
          <div>
            <span>{labels.tax}</span>
            <strong>${tax.toFixed(2)}</strong>
          </div>
          <div className="totals__grand">
            <span>{labels.total}</span>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </div>

        <button
          type="submit"
          className="button button--primary button--full"
          disabled={cart.length === 0 || submitting}
        >
          {submitting ? labels.submittingOrder : labels.placeOrder}
        </button>

        <p className="status-message" aria-live="polite">
          {statusMessage}
        </p>
      </form>
    </aside>
  );
}