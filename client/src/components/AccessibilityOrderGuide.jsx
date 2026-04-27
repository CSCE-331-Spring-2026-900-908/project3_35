// Formats a number as a dollar amount for display and spoken menu descriptions.
function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

// Builds the spoken description for the currently selected menu item.
function describeItem(item, index, count) {
  if (!item) {
    return 'No menu item is currently selected.';
  }

  // Adds position context so users know where they are in the menu list.
  const position = count > 0 ? `Item ${index + 1} of ${count}. ` : '';
  const name = item.displayName || item.name || 'Drink';
  const category = item.displayCategory || item.category || 'Menu item';
  const description = item.displayDescription || item.description || '';
  const price = formatMoney(item.basePrice);

  return `${position}${name}. Category: ${category}. ${description} Base price: ${price}.`;
}

// Provides a simplified ordering guide for users who benefit from audio-guided navigation.
export default function AccessibilityOrderGuide({
  open,
  onToggle,
  menuItems,
  selectedIndex,
  onSelectIndex,
  onCustomize,
  onAddDefault,
  onReadCart,
  labels,
  speakText
}) {
  // Ensures menuItems is always treated as an array before rendering or navigating it.
  const items = Array.isArray(menuItems) ? menuItems : [];

  // Uses the selected item if it exists, otherwise falls back to the first menu item.
  const selectedItem = items[selectedIndex] || items[0] || null;

  // Safely calls the parent TTS function if it was provided.
  function speak(message) {
    if (typeof speakText === 'function') {
      speakText(message);
    }
  }

  // Opens or closes the accessible ordering guide.
  // When opening, it immediately reads the guide instructions and the first selected item.
  function handleToggle() {
    const nextOpen = !open;
    onToggle(nextOpen);

    if (nextOpen) {
      const intro =
        labels.accessibleGuideInstructions ||
        'Accessible ordering is open. Use the large buttons to move through the menu one drink at a time. You can read the item, customize it, add it with default options, or read your cart.';

      const firstItemText = selectedItem
        ? describeItem(selectedItem, selectedIndex, items.length)
        : 'No menu items are available.';

      speak(`${intro} ${firstItemText}`);
    }
  }

  // Reads every visible menu item in the current category/filter.
  function readMenuOverview() {
    if (items.length === 0) {
      speak(labels.noMenuItemsAvailable || 'No menu items are available.');
      return;
    }

    const menuText = items
      .map((item, index) => {
        const name = item.displayName || item.name || `Item ${index + 1}`;
        const category = item.displayCategory || item.category || 'Menu item';
        const price = formatMoney(item.basePrice);
        return `${index + 1}. ${name}, ${category}, ${price}.`;
      })
      .join(' ');

    speak(`${labels.menuTitle || 'Menu'}. ${menuText}`);
  }

  // Reads only the currently selected menu item.
  function readSelectedItem() {
    speak(describeItem(selectedItem, selectedIndex, items.length));
  }

  // Moves to the previous item and wraps around to the end when needed.
  function goToPreviousItem() {
    if (items.length === 0) {
      speak(labels.noMenuItemsAvailable || 'No menu items are available.');
      return;
    }

    const nextIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
    onSelectIndex(nextIndex);
    speak(describeItem(items[nextIndex], nextIndex, items.length));
  }

  // Moves to the next item and wraps around to the beginning when needed.
  function goToNextItem() {
    if (items.length === 0) {
      speak(labels.noMenuItemsAvailable || 'No menu items are available.');
      return;
    }

    const nextIndex = selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
    onSelectIndex(nextIndex);
    speak(describeItem(items[nextIndex], nextIndex, items.length));
  }

  // Opens the normal customization modal for the currently selected item.
  function handleCustomize() {
    if (!selectedItem) {
      speak(labels.noMenuItemsAvailable || 'No menu items are available.');
      return;
    }

    onCustomize(selectedItem);
  }

  // Adds the current item to the cart using its default options.
  function handleAddDefault() {
    if (!selectedItem) {
      speak(labels.noMenuItemsAvailable || 'No menu items are available.');
      return;
    }

    onAddDefault(selectedItem);
  }

  return (
    <section className="accessibility-guide" aria-label={labels.accessibleGuideTitle || 'Accessible ordering guide'}>
      <button
        type="button"
        className="accessibility-guide__toggle"
        aria-expanded={open}
        onClick={handleToggle}
      >
        {open
          ? labels.accessibleGuideClose || 'Close Accessible Ordering'
          : labels.accessibleGuideOpen || 'Open Accessible Ordering'}
      </button>

      {open ? (
        <div className="accessibility-guide__panel">
          <div className="accessibility-guide__header">
            <div>
              <p className="section-tag">{labels.accessibleGuideTag || 'Blind Accessibility'}</p>
              <h2>{labels.accessibleGuideTitle || 'Accessible Ordering Guide'}</h2>
            </div>
            <p>
              {labels.accessibleGuideShortHelp ||
                'Use these large controls to hear the menu and build an order without tapping every menu card.'}
            </p>
          </div>

          {/* Displays the currently selected item and announces updates politely to assistive technologies. */}
          <article className="accessibility-guide__selected" aria-live="polite">
            <p className="accessibility-guide__count">
              {items.length > 0 ? `${selectedIndex + 1} / ${items.length}` : '0 / 0'}
            </p>
            <h3>{selectedItem?.displayName || selectedItem?.name || labels.noMenuItemsAvailable || 'No menu items available'}</h3>
            {selectedItem ? (
              <>
                <p>{selectedItem.displayCategory || selectedItem.category}</p>
                <p>{selectedItem.displayDescription || selectedItem.description}</p>
                <strong>{formatMoney(selectedItem.basePrice)}</strong>
              </>
            ) : null}
          </article>

          {/* Large shortcut controls reduce the need to search through every visual menu card manually. */}
          <div className="accessibility-guide__controls">
            <button type="button" className="button button--ghost" onClick={readMenuOverview}>
              {labels.readFullMenu || 'Read Full Menu'}
            </button>

            <button type="button" className="button button--ghost" onClick={readSelectedItem}>
              {labels.readCurrentItem || 'Read Current Item'}
            </button>

            <button type="button" className="button button--ghost" onClick={goToPreviousItem}>
              {labels.previousItem || 'Previous Item'}
            </button>

            <button type="button" className="button button--ghost" onClick={goToNextItem}>
              {labels.nextItem || 'Next Item'}
            </button>

            <button type="button" className="button button--primary" onClick={handleCustomize}>
              {labels.customizeThisItem || 'Customize This Drink'}
            </button>

            <button type="button" className="button button--primary" onClick={handleAddDefault}>
              {labels.addDefaultToCart || 'Add With Default Options'}
            </button>

            <button type="button" className="button button--ghost" onClick={onReadCart}>
              {labels.readCart || 'Read Cart'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}