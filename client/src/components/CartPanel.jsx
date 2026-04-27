import LocationMap from './LocationMap';

function formatRouteSummary(summary, labels) {
  if (!summary) {
    return '';
  }

  return (labels.routeSummary || '{distance} mi • about {duration} min')
    .replace('{distance}', Number(summary.distanceMiles || 0).toFixed(1))
    .replace('{duration}', String(summary.durationMinutes || 0));
}

function formatStepMeta(step, labels) {
  return (labels.stepMeta || '{distance} mi • {duration} min')
    .replace('{distance}', Number(step.distanceMiles || 0).toFixed(1))
    .replace('{duration}', String(step.durationMinutes || 0));
}

export default function CartPanel({
  cart,
  subtotal,
  tax,
  total,
  checkoutForm,
  onCheckoutChange,
  onCheckoutFocus,
  onRemoveItem,
  onSubmitOrder,
  storeLocations,
  selectedLocation,
  selectedLocationDistance,
  onUseMyLocation,
  locatingUser,
  userCoordinates,
  routeCoordinates,
  directionsSummary,
  directionsSteps,
  directionsLoading,
  directionsError,
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
            onFocus={() => onCheckoutFocus?.('customerName')}
            placeholder={labels.customerNamePlaceholder}
            required
          />
        </label>

        <label>
          <span>{labels.pickupTime}</span>
          <select
            name="pickupWindow"
            value={checkoutForm.pickupWindow}
            onChange={onCheckoutChange}
            onFocus={() => onCheckoutFocus?.('pickupWindow')}
          >
            <option value="ASAP">{labels.asap}</option>
            <option value="10 minutes">{labels.tenMinutes}</option>
            <option value="20 minutes">{labels.twentyMinutes}</option>
            <option value="30 minutes">{labels.thirtyMinutes}</option>
          </select>
        </label>

        <label>
          <span>{labels.orderType}</span>
          <select
            name="orderType"
            value={checkoutForm.orderType}
            onChange={onCheckoutChange}
            onFocus={() => onCheckoutFocus?.('orderType')}
          >
            <option value="Pickup">{labels.pickup}</option>
            <option value="Dine-In">{labels.dineIn}</option>
          </select>
        </label>

        <div className="location-picker">
          <div className="location-picker__header">
            <div>
              <span>{labels.chooseLocation}</span>
              <p className="location-picker__subtitle">{labels.locationSubtitle}</p>
            </div>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={onUseMyLocation}
              disabled={locatingUser}
            >
              {locatingUser ? labels.locating : labels.useMyLocation}
            </button>
          </div>

          <div className="location-list" role="radiogroup" aria-label={labels.chooseLocation}>
            {storeLocations.map((location) => (
              <label
                key={location.id}
                className={`location-card ${checkoutForm.pickupLocationId === location.id ? 'location-card--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="pickupLocationId"
                  value={location.id}
                  checked={checkoutForm.pickupLocationId === location.id}
                  onChange={onCheckoutChange}
                  onFocus={() => onCheckoutFocus?.('pickupLocationId', location.id)}
                />
                <div>
                  <strong>{location.name}</strong>
                  <p>{location.address}</p>
                </div>
              </label>
            ))}
          </div>

          {selectedLocation ? (
            <div className="location-details">
              <div className="location-details__text">
                <strong>{labels.selectedLocation}</strong>
                <p>{selectedLocation.name}</p>
                <p>{selectedLocation.address}</p>
                <p>
                  {selectedLocationDistance
                    ? (labels.distanceAway || '{distance} miles away').replace('{distance}', selectedLocationDistance)
                    : labels.locationUnavailable}
                </p>
              </div>

              <div className="location-actions">
                <strong>{labels.directions}</strong>
                {directionsLoading ? <p>{labels.directionsLoading}</p> : null}
                {!directionsLoading && directionsError ? <p>{directionsError}</p> : null}
                {!directionsLoading && !directionsError && directionsSummary ? (
                  <p>{formatRouteSummary(directionsSummary, labels)}</p>
                ) : null}
                {!directionsLoading && !directionsError && !directionsSummary && !userCoordinates ? (
                  <p>{labels.directionsLocationHint}</p>
                ) : null}
              </div>

              <LocationMap
                selectedLocation={selectedLocation}
                userCoordinates={userCoordinates}
                routeCoordinates={routeCoordinates}
                labels={labels}
              />

              {Array.isArray(directionsSteps) && directionsSteps.length > 0 ? (
                <div className="directions-panel">
                  <strong>{labels.routeToStore}</strong>
                  <ol className="directions-list">
                    {directionsSteps.map((step, index) => (
                      <li key={`${step.instruction}-${index}`}>
                        <span>{step.instruction}</span>
                        <small>{formatStepMeta(step, labels)}</small>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

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
