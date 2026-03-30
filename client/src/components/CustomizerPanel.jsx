const SIZE_CHOICES = ['Regular', 'Large'];
const SWEETNESS_CHOICES = ['0%', '25%', '50%', '75%', '100%'];
const ICE_CHOICES = ['No Ice', 'Light Ice', 'Regular Ice'];

export default function CustomizerPanel({
  item,
  selection,
  onSelectionChange,
  onToggleTopping,
  onClose,
  onAddToCart,
  labels,
  translateSize,
  translateIce
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
            <p className="section-tag">{labels.customization}</p>
            <h2 id="customizer-title">{item.displayName || item.name}</h2>
          </div>
          <button type="button" className="button button--ghost" onClick={onClose}>
            {labels.close}
          </button>
        </div>

        <p className="customizer__description">{item.displayDescription || item.description}</p>

        <section className="customizer__section">
          <h3>{labels.size}</h3>
          <div className="choice-row" role="radiogroup" aria-label={labels.drinkSize}>
            {SIZE_CHOICES.map((size) => (
              <button
                key={size}
                type="button"
                className={`choice-chip ${selection.size === size ? 'choice-chip--selected' : ''}`}
                aria-pressed={selection.size === size}
                onClick={() => onSelectionChange('size', size)}
              >
                {translateSize(size)}
              </button>
            ))}
          </div>
        </section>

        <section className="customizer__section">
          <h3>{labels.sweetness}</h3>
          <div className="choice-row" role="radiogroup" aria-label={labels.sweetnessLevel}>
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
          <h3>{labels.ice}</h3>
          <div className="choice-row" role="radiogroup" aria-label={labels.iceLevel}>
            {ICE_CHOICES.map((level) => (
              <button
                key={level}
                type="button"
                className={`choice-chip ${selection.ice === level ? 'choice-chip--selected' : ''}`}
                aria-pressed={selection.ice === level}
                onClick={() => onSelectionChange('ice', level)}
              >
                {translateIce(level)}
              </button>
            ))}
          </div>
        </section>

        <section className="customizer__section">
          <h3>{labels.toppings}</h3>
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
                  <span>{topping.displayName || topping.name}</span>
                  <span>+${topping.price.toFixed(2)}</span>
                </button>
              );
            })}
          </div>
        </section>

        <label className="notes-field">
          <span>{labels.specialInstructions}</span>
          <textarea
            rows="4"
            value={selection.notes}
            onChange={(event) => onSelectionChange('notes', event.target.value)}
            placeholder={labels.specialInstructionsPlaceholder}
          />
        </label>

        <div className="customizer__summary">
          <div>
            <span>{labels.drinkTotal}</span>
            <strong>${selection.total.toFixed(2)}</strong>
          </div>
          <button type="button" className="button button--primary" onClick={onAddToCart}>
            {labels.addToCart}
          </button>
        </div>
      </aside>
    </div>
  );
}