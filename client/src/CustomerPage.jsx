import { useEffect, useMemo, useState } from 'react';
import CartPanel from './components/CartPanel';
import CustomizerPanel from './components/CustomizerPanel';
import MenuCard from './components/MenuCard';
import { apiUrl } from './apiBase';
import micOff from './assets/mic_off.png';
import micOn from './assets/mic_on.png';
import './styles.css';

const TAX_RATE = 0.0825;

const baseText = {
  heroTitle: 'Handcrafted bubble tea, made your way.',
  heroSubtitle:
    'Explore signature milk teas, fruit blends, and seasonal specials in a storefront designed to feel like ordering from a modern cafe menu instead of a back-office register.',
  detailFresh: 'Fresh teas brewed daily',
  detailCustom: 'Custom sweetness and ice levels',
  detailPickup: 'Pickup ordering in a few taps',
  menuLabel: 'Menu',
  menuTitle: 'Craft Your Order',
  statusReady: 'Ready for your next handcrafted drink.',
  statusFallback: 'Using sample menu while the backend is unavailable.',
  languageLabel: 'Language',
  ttsLabel: 'Text-to-Speech',
  ttsOn: 'TTS On',
  ttsOff: 'TTS Off',
  customize: 'Customize',
  currentOrder: 'Current Order',
  cart: 'Cart',
  emptyCart: 'Your cart is empty. Add a drink to start an order.',
  toppings: 'Toppings',
  note: 'Note',
  remove: 'Remove',
  name: 'Name',
  customerNamePlaceholder: 'Customer name',
  pickupTime: 'Pickup Time',
  asap: 'ASAP',
  tenMinutes: '10 minutes',
  twentyMinutes: '20 minutes',
  thirtyMinutes: '30 minutes',
  orderType: 'Order Type',
  pickup: 'Pickup',
  dineIn: 'Dine-In',
  subtotal: 'Subtotal',
  tax: 'Tax',
  total: 'Total',
  placeOrder: 'Place Order',
  submittingOrder: 'Submitting Order...',
  customization: 'Customization',
  close: 'Close',
  size: 'Size',
  drinkSize: 'Drink size',
  sweetness: 'Sweetness',
  sweetnessLevel: 'Sweetness level',
  ice: 'Ice',
  iceLevel: 'Ice level',
  specialInstructions: 'Special Instructions',
  specialInstructionsPlaceholder: 'Example: less boba, extra creamy foam',
  drinkTotal: 'Drink total',
  addToCart: 'Add To Cart',
  orderConfirmed: 'Order confirmed. Ticket {orderNumber} is in progress.',
  addedToCart: '{itemName} added to cart.',
  orderFailed: 'Order could not be submitted: {message}'
};

const fallbackMenu = [
  {
    id: 1,
    name: 'Tidal Drift Milk Tea',
    category: 'Milk Tea',
    description: 'Black tea with brown sugar pearls and a silky house cream cap.',
    basePrice: 5.4,
    toppings: [
      { id: 101, name: 'Brown Sugar Boba', price: 0.9 },
      { id: 102, name: 'Sea Salt Foam', price: 0.8 },
      { id: 103, name: 'Lychee Jelly', price: 0.7 }
    ]
  },
  {
    id: 2,
    name: 'Moonlit Mango Green Tea',
    category: 'Fruit Tea',
    description: 'Jasmine green tea shaken with mango puree and citrus brightness.',
    basePrice: 5.7,
    toppings: [
      { id: 201, name: 'Crystal Boba', price: 0.85 },
      { id: 202, name: 'Aloe Vera', price: 0.75 },
      { id: 203, name: 'Mango Stars', price: 0.95 }
    ]
  },
  {
    id: 3,
    name: 'Nebula Strawberry Slush',
    category: 'Slush',
    description: 'A frozen strawberry cloud drink finished with popping pearls.',
    basePrice: 6.1,
    toppings: [
      { id: 301, name: 'Strawberry Poppers', price: 0.95 },
      { id: 302, name: 'Whipped Foam', price: 0.8 },
      { id: 303, name: 'Rainbow Jelly', price: 0.75 }
    ]
  },
  {
    id: 4,
    name: 'Lantern Oolong Peach Tea',
    category: 'Fruit Tea',
    description: 'Roasted oolong, white peach syrup, and a bright floral finish.',
    basePrice: 5.6,
    toppings: [
      { id: 401, name: 'Peach Bits', price: 0.9 },
      { id: 402, name: 'Coconut Jelly', price: 0.7 },
      { id: 403, name: 'Aloe Vera', price: 0.75 }
    ]
  },
  {
    id: 5,
    name: 'Equinox Matcha Tide',
    category: 'Seasonal',
    description: 'Ceremonial-style matcha with toasted vanilla milk and oat cream.',
    basePrice: 6.25,
    toppings: [
      { id: 501, name: 'Red Bean', price: 0.85 },
      { id: 502, name: 'Sea Salt Foam', price: 0.8 },
      { id: 503, name: 'Crystal Boba', price: 0.85 }
    ]
  },
  {
    id: 6,
    name: 'Harbor Thai Velvet',
    category: 'Milk Tea',
    description: 'Bold Thai tea layered with condensed milk and amber pearls.',
    basePrice: 5.95,
    toppings: [
      { id: 601, name: 'Brown Sugar Boba', price: 0.9 },
      { id: 602, name: 'Coffee Jelly', price: 0.8 },
      { id: 603, name: 'Sea Salt Foam', price: 0.8 }
    ]
  }
];

function normalizeTopping(topping, index, itemId) {
  return {
    id: topping?.id ?? topping?.item_inventory_id ?? itemId * 100 + index + 1,
    name: topping?.name ?? topping?.item_category ?? topping?.displayName ?? `Topping ${index + 1}`,
    price: Number(topping?.price ?? topping?.price_per_unit ?? 0)
  };
}

function normalizeMenuItem(item, index) {
  const rawToppings = Array.isArray(item?.toppings)
    ? item.toppings
    : Array.isArray(item?.extras)
      ? item.extras
      : [];

  return {
    id: item?.id ?? item?.menu_item_id ?? index + 1,
    name: item?.name ?? item?.menu_item_category ?? item?.displayName ?? `Item ${index + 1}`,
    category: item?.category ?? item?.menu_item_type ?? item?.type ?? 'Milk Tea',
    description: item?.description ?? item?.details ?? 'No description available.',
    basePrice: Number(item?.basePrice ?? item?.price ?? item?.price_per_unit ?? 0),
    toppings: rawToppings.map((topping, toppingIndex) =>
      normalizeTopping(topping, toppingIndex, item?.id ?? item?.menu_item_id ?? index + 1)
    )
  };
}

function normalizeMenu(menu) {
  if (!Array.isArray(menu) || menu.length === 0) {
    return fallbackMenu;
  }

  return menu.map((item, index) => normalizeMenuItem(item, index));
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

function calculateTotal(item, selection) {
  if (!item || !selection) {
    return 0;
  }

  const sizeUpcharge = selection.size === 'Large' ? 0.9 : 0;
  const toppingTotal = (item.toppings || [])
    .filter((topping) => selection.toppings.includes(topping.name))
    .reduce((sum, topping) => sum + Number(topping.price || 0), 0);

  return Number((item.basePrice + sizeUpcharge + toppingTotal).toFixed(2));
}

function withDisplayFields(menu) {
  return menu.map((item) => ({
    ...item,
    displayName: item.name,
    displayDescription: item.description,
    displayCategory: item.category,
    toppings: (item.toppings || []).map((topping) => ({
      ...topping,
      displayName: topping.name
    }))
  }));
}

export default function CustomerPage() {
  const [menu, setMenu] = useState(normalizeMenu(fallbackMenu));
  const [translatedMenu, setTranslatedMenu] = useState(withDisplayFields(normalizeMenu(fallbackMenu)));
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(baseText.statusReady);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    pickupWindow: 'ASAP',
    orderType: 'Pickup'
  });
  const [language, setLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState(baseText);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  async function translateTexts(texts, targetLanguage) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    const response = await fetch(apiUrl('/api/translate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, targetLanguage })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Translation failed.');
    }

    return Array.isArray(data.translations) ? data.translations : [];
  }

  function handleTtsToggle() {
    setTtsEnabled((current) => {
      const next = !current;
      setStatusMessage(next ? 'Text-to-speech enabled.' : 'Text-to-speech disabled.');
      return next;
    });
  }

  function getTranslatedCategory(category) {
    const categoryMap = {
      All:
        language === 'es'
          ? 'Todo'
          : language === 'zh-CN'
            ? '全部'
            : language === 'ko'
              ? '전체'
              : 'All',
      'Milk Tea':
        language === 'es'
          ? 'Té con leche'
          : language === 'zh-CN'
            ? '奶茶'
            : language === 'ko'
              ? '밀크티'
              : 'Milk Tea',
      'Fruit Tea':
        language === 'es'
          ? 'Té de frutas'
          : language === 'zh-CN'
            ? '水果茶'
            : language === 'ko'
              ? '과일차'
              : 'Fruit Tea',
      Slush:
        language === 'es'
          ? 'Granizado'
          : language === 'zh-CN'
            ? '冰沙'
            : language === 'ko'
              ? '슬러시'
              : 'Slush',
      Seasonal:
        language === 'es'
          ? 'De temporada'
          : language === 'zh-CN'
            ? '季节限定'
            : language === 'ko'
              ? '시즌 한정'
              : 'Seasonal'
    };

    return categoryMap[category] || category;
  }

  function translateSize(size) {
    if (language === 'es') {
      if (size === 'Regular') return 'Regular';
      if (size === 'Large') return 'Grande';
    }
    if (language === 'zh-CN') {
      if (size === 'Regular') return '常规';
      if (size === 'Large') return '大杯';
    }
    if (language === 'ko') {
      if (size === 'Regular') return '기본';
      if (size === 'Large') return '라지';
    }
    return size;
  }

  function translateIce(level) {
    if (language === 'es') {
      if (level === 'No Ice') return 'Sin hielo';
      if (level === 'Light Ice') return 'Poco hielo';
      if (level === 'Regular Ice') return 'Hielo regular';
    }
    if (language === 'zh-CN') {
      if (level === 'No Ice') return '去冰';
      if (level === 'Light Ice') return '少冰';
      if (level === 'Regular Ice') return '正常冰';
    }
    if (language === 'ko') {
      if (level === 'No Ice') return '얼음 없음';
      if (level === 'Light Ice') return '적은 얼음';
      if (level === 'Regular Ice') return '보통 얼음';
    }
    return level;
  }

  useEffect(() => {
    async function loadMenu() {
      try {
        const response = await fetch(apiUrl('/api/menu'));

        if (!response.ok) {
          throw new Error('Menu request failed');
        }

        const payload = await response.json();
        const incomingItems = Array.isArray(payload?.items)
          ? payload.items
          : Array.isArray(payload)
            ? payload
            : [];

        if (incomingItems.length > 0) {
          setMenu(normalizeMenu(incomingItems));
          setStatusMessage(baseText.statusReady);
        } else {
          setMenu(normalizeMenu(fallbackMenu));
          setStatusMessage(baseText.statusFallback);
        }
      } catch (_error) {
        setMenu(normalizeMenu(fallbackMenu));
        setStatusMessage(baseText.statusFallback);
      }
    }

    loadMenu();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runTranslation() {
      if (language === 'en') {
        setTranslatedText(baseText);
        return;
      }

      const keys = Object.keys(baseText);
      const values = Object.values(baseText);

      try {
        const translations = await translateTexts(values, language);
        if (cancelled) return;

        const rebuilt = {};
        keys.forEach((key, index) => {
          rebuilt[key] = translations[index] || baseText[key];
        });

        setTranslatedText(rebuilt);
      } catch (error) {
        console.error('UI translation failed:', error);
        if (!cancelled) {
          setTranslatedText(baseText);
        }
      }
    }

    runTranslation();

    return () => {
      cancelled = true;
    };
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function runMenuTranslation() {
      if (language === 'en') {
        setTranslatedMenu(
          menu.map((item) => ({
            ...item,
            displayName: item.name,
            displayDescription: item.description,
            displayCategory: getTranslatedCategory(item.category),
            toppings: (item.toppings || []).map((topping) => ({
              ...topping,
              displayName: topping.name
            }))
          }))
        );
        return;
      }

      try {
        const rebuiltMenu = menu.map((item) => ({
          ...item,
          displayName: item.name,
          displayDescription: item.description,
          displayCategory: getTranslatedCategory(item.category),
          toppings: (item.toppings || []).map((topping) => ({
            ...topping,
            displayName: topping.name
          }))
        }));

        const allTexts = [];
        const markers = [];

        menu.forEach((item) => {
          allTexts.push(item.name);
          markers.push({ type: 'itemName', itemId: item.id });

          allTexts.push(item.description);
          markers.push({ type: 'itemDescription', itemId: item.id });

          (item.toppings || []).forEach((topping, toppingIndex) => {
            allTexts.push(topping.name);
            markers.push({ type: 'toppingName', itemId: item.id, toppingIndex });
          });
        });

        const BATCH_SIZE = 25;

        for (let i = 0; i < allTexts.length; i += BATCH_SIZE) {
          const textBatch = allTexts.slice(i, i + BATCH_SIZE);
          const markerBatch = markers.slice(i, i + BATCH_SIZE);

          const translations = await translateTexts(textBatch, language);
          if (cancelled) return;

          markerBatch.forEach((marker, index) => {
            const translatedValue = translations[index];
            const menuItem = rebuiltMenu.find((entry) => entry.id === marker.itemId);

            if (!menuItem || !translatedValue) {
              return;
            }

            if (marker.type === 'itemName') {
              menuItem.displayName = translatedValue;
            } else if (marker.type === 'itemDescription') {
              menuItem.displayDescription = translatedValue;
            } else if (marker.type === 'toppingName' && menuItem.toppings[marker.toppingIndex]) {
              menuItem.toppings[marker.toppingIndex].displayName = translatedValue;
            }
          });
        }

        if (!cancelled) {
          setTranslatedMenu(rebuiltMenu);
        }
      } catch (error) {
        console.error('Menu translation failed:', error);
        if (!cancelled) {
          setTranslatedMenu(withDisplayFields(menu));
        }
      }
    }

    runMenuTranslation();

    return () => {
      cancelled = true;
    };
  }, [language, menu]);

  useEffect(() => {
    if (!selectedItem) {
      document.body.classList.remove('modal-open');
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setSelectedItem(null);
        setSelection(null);
      }
    }

    document.body.classList.add('modal-open');
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleEscape);
    };
  }, [selectedItem]);

  const categories = useMemo(() => {
    return ['All', ...new Set(menu.map((item) => item.category))];
  }, [menu]);

  const visibleMenu = useMemo(() => {
    if (activeCategory === 'All') {
      return translatedMenu;
    }

    return translatedMenu.filter((item) => item.category === activeCategory);
  }, [activeCategory, translatedMenu]);

  const subtotal = useMemo(
    () => Number(cart.reduce((sum, item) => sum + Number(item.total || 0), 0).toFixed(2)),
    [cart]
  );
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  function openCustomizer(item) {
    const translatedItem = translatedMenu.find((entry) => entry.id === item.id) || item;
    const nextSelection = buildDefaultSelection(translatedItem);
    nextSelection.total = calculateTotal(translatedItem, nextSelection);
    setSelectedItem(translatedItem);
    setSelection(nextSelection);
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

  function addToCart() {
    if (!selectedItem || !selection) {
      return;
    }

    const selectedToppings = (selectedItem.toppings || []).filter((topping) =>
      selection.toppings.includes(topping.name)
    );

    const cartItem = {
      id: `${selectedItem.id}-${Date.now()}`,
      menuItemId: selectedItem.id,
      name: selectedItem.name,
      displayName: selectedItem.displayName || selectedItem.name,
      quantity: 1,
      size: selection.size || 'Regular',
      displaySize: translateSize(selection.size || 'Regular'),
      sweetness: selection.sweetness,
      ice: selection.ice,
      displayIce: translateIce(selection.ice),
      toppings: selection.toppings,
      displayToppings: selectedToppings.map((topping) => topping.displayName || topping.name),
      toppingInventoryIds: selectedToppings
        .map((topping) => topping.id)
        .filter((value) => Number.isInteger(value)),
      notes: selection.notes.trim(),
      total: selection.total
    };

    setCart((current) => [...current, cartItem]);

    setStatusMessage(
      (translatedText.addedToCart || '{itemName} added to cart.').replace(
        '{itemName}',
        selectedItem.displayName || selectedItem.name
      )
    );
    setSelectedItem(null);
    setSelection(null);
  }

  function removeCartItem(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function closeCustomizer() {
    setSelectedItem(null);
    setSelection(null);
  }

  function handleCheckoutChange(event) {
    const { name, value } = event.target;
    setCheckoutForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmitOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    const payload = {
      customerName: checkoutForm.customerName,
      pickupWindow: checkoutForm.pickupWindow,
      orderType: checkoutForm.orderType,
      totals: { subtotal, tax, total },
      items: cart.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        size: item.size || 'Regular',
        sweetness: item.sweetness,
        ice: item.ice,
        toppings: item.toppings,
        toppingInventoryIds: item.toppingInventoryIds,
        notes: item.notes,
        total: item.total
      }))
    };

    setSubmitting(true);

    try {
      const response = await fetch(apiUrl('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let details = 'Order request failed';

        try {
          const errorPayload = await response.json();
          details = errorPayload.details || errorPayload.error || details;
        } catch (_error) {
          // keep fallback message
        }

        throw new Error(details);
      }

      const result = await response.json();

      setCart([]);
      setCheckoutForm({
        customerName: '',
        pickupWindow: 'ASAP',
        orderType: 'Pickup'
      });
      setStatusMessage(
        (translatedText.orderConfirmed || 'Order confirmed. Ticket {orderNumber} is in progress.')
          .replace('{orderNumber}', result.orderNumber)
      );
    } catch (error) {
      setStatusMessage(
        (translatedText.orderFailed || 'Order could not be submitted: {message}').replace(
          '{message}',
          error.message
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  const translatedCart = useMemo(
    () =>
      cart.map((item) => ({
        ...item,
        displayName: item.displayName || item.name,
        displaySize: item.displaySize || translateSize(item.size || 'Regular'),
        displayIce: item.displayIce || translateIce(item.ice),
        displayToppings: item.displayToppings || item.toppings || []
      })),
    [cart, language]
  );

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="section-tag">Moonwake Tea Atelier</p>

          <div className="hero__controls">
            <div className="language-picker">
              <label htmlFor="language-select" className="language-picker__label">
                {translatedText.languageLabel}
              </label>
              <select
                id="language-select"
                className="language-picker__select"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="zh-CN">简体中文</option>
                <option value="ko">한국어</option>
              </select>
            </div>

            <div className="tts-toggle-wrap">
              <span className="tts-toggle-wrap__label">{translatedText.ttsLabel}</span>
              <button
                type="button"
                className={`tts-toggle ${ttsEnabled ? 'tts-toggle--on' : 'tts-toggle--off'}`}
                onClick={handleTtsToggle}
                aria-pressed={ttsEnabled}
                aria-label={ttsEnabled ? 'Turn text to speech off' : 'Turn text to speech on'}
                title={ttsEnabled ? translatedText.ttsOn : translatedText.ttsOff}
              >
                <img
                  src={ttsEnabled ? micOn : micOff}
                  alt=""
                  className="tts-toggle__icon"
                />
                <span className="tts-toggle__text">
                  {ttsEnabled ? translatedText.ttsOn : translatedText.ttsOff}
                </span>
              </button>
            </div>
          </div>

          <h1>{translatedText.heroTitle}</h1>
          <p>{translatedText.heroSubtitle}</p>

          <div className="hero__details">
            <span>{translatedText.detailFresh}</span>
            <span>{translatedText.detailCustom}</span>
            <span>{translatedText.detailPickup}</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="menu-section">
          <div className="menu-toolbar">
            <div>
              <p className="section-tag">{translatedText.menuLabel}</p>
              <h2>{translatedText.menuTitle}</h2>
            </div>

            <div className="choice-row" aria-label="Menu categories">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`choice-chip ${activeCategory === category ? 'choice-chip--selected' : ''}`}
                  aria-pressed={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {getTranslatedCategory(category)}
                </button>
              ))}
            </div>
          </div>

          <div className="menu-grid">
            {visibleMenu.map((item) => (
              <MenuCard
                key={item.id}
                item={item}
                onCustomize={openCustomizer}
                labels={translatedText}
              />
            ))}
          </div>
        </section>

        <CartPanel
          cart={translatedCart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          checkoutForm={checkoutForm}
          onCheckoutChange={handleCheckoutChange}
          onRemoveItem={removeCartItem}
          onSubmitOrder={handleSubmitOrder}
          submitting={submitting}
          statusMessage={statusMessage}
          labels={translatedText}
        />
      </main>

      {selectedItem && selection ? (
        <CustomizerPanel
          item={selectedItem}
          selection={selection}
          onSelectionChange={updateSelection}
          onToggleTopping={toggleTopping}
          onClose={closeCustomizer}
          onAddToCart={addToCart}
          labels={translatedText}
          translateSize={translateSize}
          translateIce={translateIce}
        />
      ) : null}
    </div>
  );
}