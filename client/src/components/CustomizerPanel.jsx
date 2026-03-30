const SIZE_CHOICES = ['Regular', 'Large'];
const SWEETNESS_CHOICES = ['0%', '25%', '50%', '75%', '100%'];
const ICE_CHOICES = ['No Ice', 'Light Ice', 'Regular Ice'];

export default function CustomizerPanel({
  item,
  selection,
  onSelectionChange,
  onToggleTopping,
  onClose,
  onAddToCart
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <aside
        className="customizer customizer--modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customizer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="customizer__header">
          <div>
            <p className="section-tag">Customization</p>
            <h2 id="customizer-title">{item.name}</h2>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="customizer__description">{item.description}</p>

        <section className="customizer__section">
          <h3>Size</h3>
          <div className="choice-row" role="radiogroup" aria-label="Drink size">
            {SIZE_CHOICES.map((size) => (
              <button
                key={size}
                type="button"
                className={`choice-chip ${selection.size === size ? 'choice-chip--selected' : ''}`}
                aria-pressed={selection.size === size}
                onClick={() => onSelectionChange('size', size)}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <section className="customizer__section">
          <h3>Sweetness</h3>
          <div className="choice-row" role="radiogroup" aria-label="Sweetness level">
            {SWEETNESS_CHOICES.map((level) => (
              <button
                key={level}
                type="button"
                className={`choice-chip ${selection.sweetness === level ? 'choice-chip--selected' : ''}`}
                aria-pressed={selection.sweetness === level}
                onClick={() => onSelectionChange('sweetness', level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        <section className="customizer__section">
          <h3>Ice</h3>
          <div className="choice-row" role="radiogroup" aria-label="Ice level">
            {ICE_CHOICES.map((level) => (
              <button
                key={level}
                type="button"
                className={`choice-chip ${selection.ice === level ? 'choice-chip--selected' : ''}`}
                aria-pressed={selection.ice === level}
                onClick={() => onSelectionChange('ice', level)}
              >
                {level}
              </button>
            ))}
          </div>
        </section>

        <section className="customizer__section">
          <h3>Toppings</h3>
          <div className="toppings-grid">
            {item.toppings.map((topping) => {
              const selected = selection.toppings.includes(topping.name);
              return (
                <button
                  key={topping.name}
                  type="button"
                  className={`topping-pill ${selected ? 'topping-pill--selected' : ''}`}
                  aria-pressed={selected}
                  onClick={() => onToggleTopping(topping.name)}
                >
                  <span>{topping.name}</span>
                  <span>+${topping.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="notes-field">
          <span>Special Instructions</span>
          <textarea
            rows="4"
            value={selection.notes}
            onChange={(event) => onSelectionChange('notes', event.target.value)}
            placeholder="Example: less boba, extra creamy foam"
          />
        </label>

        <div className="customizer__summary">
          <div>
            <span>Drink total</span>
            <strong>${selection.total.toFixed(2)}</strong>
          </div>
          <button type="button" className="button button--primary" onClick={onAddToCart}>
            Add To Cart
          </button>
        </div>
      </aside>
    </div>
  );
}
