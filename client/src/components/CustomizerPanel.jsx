import { useEffect, useMemo, useState } from 'react';

const SIZE_CHOICES = ['Regular', 'Large'];
const SWEETNESS_CHOICES = ['0%', '25%', '50%', '75%', '100%'];
const ICE_CHOICES = ['Hot', 'No Ice', 'Light Ice', 'Regular Ice'];

const TTS_RATE = 1.45;

function speakText(text, enabled) {
  if (!enabled) {
    return;
  }

  if (!('speechSynthesis' in window)) {
    return;
  }

  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = TTS_RATE;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
}

function formatToppingPrice(price) {
  return `$${Number(price || 0).toFixed(2)}`;
}

function buildToppingDescription(topping, index, totalCount, selected) {
  if (!topping) {
    return 'No topping is selected.';
  }

  const name = topping.displayName || topping.name;
  const price = formatToppingPrice(topping.price);
  const selectedText = selected ? 'Selected.' : 'Not selected.';

  return `Topping ${index + 1} of ${totalCount}. ${name}. Price ${price}. ${selectedText}`;
}

function buildSelectedToppingsSummary(item, selection) {
  const selectedToppings = (item.toppings || []).filter((topping) =>
    selection.toppings.includes(topping.name)
  );

  if (selectedToppings.length === 0) {
    return 'No toppings are currently selected.';
  }

  const toppingNames = selectedToppings
    .map((topping) => `${topping.displayName || topping.name}, ${formatToppingPrice(topping.price)}`)
    .join('. ');

  return `Selected toppings: ${toppingNames}.`;
}

export default function CustomizerPanel({
  item,
  selection,
  onSelectionChange,
  onToggleTopping,
  onClose,
  onAddToCart,
  labels,
  translateSize,
  translateIce,
  ttsEnabled = false
}) {
  const [toppingHelperOpen, setToppingHelperOpen] = useState(false);
  const [activeToppingIndex, setActiveToppingIndex] = useState(0);

  const toppings = useMemo(() => {
    return Array.isArray(item?.toppings) ? item.toppings : [];
  }, [item]);

  const activeTopping = toppings[activeToppingIndex] || null;
  const activeToppingSelected = activeTopping
    ? selection.toppings.includes(activeTopping.name)
    : false;

  useEffect(() => {
    if (activeToppingIndex > toppings.length - 1) {
      setActiveToppingIndex(0);
    }
  }, [activeToppingIndex, toppings.length]);

  function readCurrentDrink() {
    const selectedToppingsText = buildSelectedToppingsSummary(item, selection);
    const message = `${item.displayName || item.name}. Size ${translateSize(selection.size)}. Sweetness ${selection.sweetness}. Ice ${translateIce(selection.ice)}. Drink total $${selection.total.toFixed(2)}. ${selectedToppingsText}`;

    speakText(message, ttsEnabled);
  }

  function toggleToppingHelper() {
    const nextOpen = !toppingHelperOpen;
    setToppingHelperOpen(nextOpen);

    if (!nextOpen) {
      return;
    }

    if (toppings.length === 0) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    speakText(
      `Topping helper opened. Use next topping, previous topping, and toggle topping. ${buildToppingDescription(
        activeTopping,
        activeToppingIndex,
        toppings.length,
        activeToppingSelected
      )}`,
      ttsEnabled
    );
  }

  function readCurrentTopping() {
    if (!activeTopping) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    speakText(
      buildToppingDescription(
        activeTopping,
        activeToppingIndex,
        toppings.length,
        activeToppingSelected
      ),
      ttsEnabled
    );
  }

  function goToPreviousTopping() {
    if (toppings.length === 0) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    const nextIndex = activeToppingIndex <= 0 ? toppings.length - 1 : activeToppingIndex - 1;
    const nextTopping = toppings[nextIndex];
    const nextSelected = selection.toppings.includes(nextTopping.name);

    setActiveToppingIndex(nextIndex);

    speakText(buildToppingDescription(nextTopping, nextIndex, toppings.length, nextSelected), ttsEnabled);
  }

  function goToNextTopping() {
    if (toppings.length === 0) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    const nextIndex = activeToppingIndex >= toppings.length - 1 ? 0 : activeToppingIndex + 1;
    const nextTopping = toppings[nextIndex];
    const nextSelected = selection.toppings.includes(nextTopping.name);

    setActiveToppingIndex(nextIndex);

    speakText(buildToppingDescription(nextTopping, nextIndex, toppings.length, nextSelected), ttsEnabled);
  }

  function toggleCurrentTopping() {
    if (!activeTopping) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    const wasSelected = selection.toppings.includes(activeTopping.name);
    onToggleTopping(activeTopping.name);

    const name = activeTopping.displayName || activeTopping.name;
    const price = formatToppingPrice(activeTopping.price);

    speakText(
      wasSelected
        ? `${name} removed. Price ${price}.`
        : `${name} added. Price ${price}.`,
      ttsEnabled
    );
  }

  function readSelectedToppings() {
    speakText(buildSelectedToppingsSummary(item, selection), ttsEnabled);
  }

  function readAllToppings() {
    if (toppings.length === 0) {
      speakText('This drink has no available toppings.', ttsEnabled);
      return;
    }

    const toppingText = toppings
      .map((topping, index) => {
        const name = topping.displayName || topping.name;
        const price = formatToppingPrice(topping.price);
        const selected = selection.toppings.includes(topping.name)
          ? 'selected'
          : 'not selected';

        return `${index + 1}. ${name}, ${price}, ${selected}.`;
      })
      .join(' ');

    speakText(`Available toppings. ${toppingText}`, ttsEnabled);
  }

  function clearSelectedToppings() {
    if (selection.toppings.length === 0) {
      speakText('No toppings are currently selected.', ttsEnabled);
      return;
    }

    selection.toppings.forEach((toppingName) => {
      onToggleTopping(toppingName);
    });

    speakText('All toppings removed.', ttsEnabled);
  }

  function addToCartWithoutForcedSpeech() {
    onAddToCart();
  }

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

        <div className="customizer-quick-audio">
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={readCurrentDrink}
          >
            Read Drink
          </button>
        </div>

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
          <h3>{labels.quantity || 'Quantity'}</h3>
          <div className="choice-row" role="group" aria-label={labels.quantity || 'Quantity'}>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => onSelectionChange('quantity', Math.max(1, Number(selection.quantity || 1) - 1))}
              disabled={Number(selection.quantity || 1) <= 1}
            >
              {labels.decreaseQuantity || '-'}
            </button>
            <input
              type="number"
              min="1"
              step="1"
              value={selection.quantity || 1}
              onChange={(event) => onSelectionChange('quantity', event.target.value)}
              style={{ width: '90px', textAlign: 'center' }}
            />
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => onSelectionChange('quantity', Number(selection.quantity || 1) + 1)}
            >
              {labels.increaseQuantity || '+'}
            </button>
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
          <div className="toppings-heading-row">
            <h3>{labels.toppings}</h3>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={toggleToppingHelper}
              aria-expanded={toppingHelperOpen}
            >
              {toppingHelperOpen ? 'Hide Helper' : 'Topping Helper'}
            </button>
          </div>

          {toppingHelperOpen ? (
            <div className="topping-helper topping-helper--compact">
              <article className="topping-helper__current" aria-live="polite">
                <p className="topping-helper__count">
                  {toppings.length > 0 ? `${activeToppingIndex + 1} / ${toppings.length}` : '0 / 0'}
                </p>
                <h4>
                  {activeTopping
                    ? activeTopping.displayName || activeTopping.name
                    : 'No toppings available'}
                </h4>
                {activeTopping ? (
                  <p>
                    {formatToppingPrice(activeTopping.price)} • {activeToppingSelected ? 'Selected' : 'Not selected'}
                  </p>
                ) : null}
              </article>

              <div className="topping-helper__controls topping-helper__controls--compact">
                <button type="button" className="button button--ghost button--small" onClick={readCurrentTopping}>
                  Read
                </button>

                <button type="button" className="button button--ghost button--small" onClick={goToPreviousTopping}>
                  Previous
                </button>

                <button type="button" className="button button--ghost button--small" onClick={goToNextTopping}>
                  Next
                </button>

                <button type="button" className="button button--primary button--small" onClick={toggleCurrentTopping}>
                  Toggle
                </button>

                <button type="button" className="button button--ghost button--small" onClick={readSelectedToppings}>
                  Selected
                </button>

                <button type="button" className="button button--ghost button--small" onClick={readAllToppings}>
                  Read All
                </button>

                <button type="button" className="button button--ghost button--small" onClick={clearSelectedToppings}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          <div className="toppings-grid">
            {toppings.map((topping) => {
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
          <button type="button" className="button button--primary" onClick={addToCartWithoutForcedSpeech}>
            {labels.addToCart}
          </button>
        </div>
      </aside>
    </div>
  );
}