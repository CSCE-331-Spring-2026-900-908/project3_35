// Imports React hooks for state, side effects, and memoized calculations.
import { useEffect, useMemo, useState } from 'react';

// Imports the major customer-page components.
import AccessibilityOrderGuide from './components/AccessibilityOrderGuide';
import CartPanel from './components/CartPanel';
import CustomizerPanel from './components/CustomizerPanel';
import MenuCard from './components/MenuCard';
import PersonalAssistant from './components/PersonalAssistant';
import TtsToggle from './components/TtsToggle';

// Imports API URL helper and the custom TTS hook.
import { apiUrl } from './apiBase';
import useTextToSpeech from './hooks/useTextToSpeech';

// Sales tax rate used when calculating the final order total.
const TAX_RATE = 0.0825;
const CUSTOMER_CATEGORIES = ['All', 'Milk Tea', 'Fruit Tea', 'Seasonal', 'Slush'];
const FRUIT_KEYWORDS = ['mango', 'orange', 'peach', 'strawberry', 'lychee', 'passion', 'passionfruit', 'pineapple', 'apple', 'grape', 'watermelon', 'kiwi', 'lemon', 'lime', 'blueberry', 'raspberry', 'blackberry', 'cherry', 'coconut', 'banana', 'melon', 'honeydew', 'pomelo', 'grapefruit', 'guava', 'dragonfruit', 'pomegranate', 'fruit'];
const SEASONAL_KEYWORDS = ['seasonal', 'pumpkin', 'peppermint', 'gingerbread', 'holiday', 'autumn', 'summer', 'christmas', 'halloween', "valentine's"];
const SLUSH_KEYWORDS = ['slush', 'smoothie', 'frozen'];
const MILK_TEA_KEYWORDS = ['thai', 'taro', 'matcha', 'brown sugar', 'classic', 'oolong', 'jasmine'];

// Default English text used throughout the customer page.
// These values are also sent through the translation API when another language is selected.
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
  customize: 'Customize',
  currentOrder: 'Current Order',
  cart: 'Cart',
  emptyCart: 'Your cart is empty. Add a drink to start an order.',
  toppings: 'Toppings',
  note: 'Note',
  remove: 'Remove',
  quantity: 'Quantity',
  increaseQuantity: '+',
  decreaseQuantity: '-',
  name: 'Name',
  customerNamePlaceholder: 'Customer name (Optional)',
  pickupTime: 'Pickup Time',
  asap: 'ASAP',
  tenMinutes: '10 minutes',
  twentyMinutes: '20 minutes',
  thirtyMinutes: '30 minutes',
  orderType: 'Order Type',
  pickup: 'Pickup',
  dineIn: 'Dine-In',
  chooseLocation: 'Choose Location',
  locationSubtitle: 'Select the store where you want to pick up your order.',
  useMyLocation: 'Use My Location',
  locating: 'Finding your location...',
  distanceAway: '{distance} miles away',
  locationPermissionError: 'We could not access your location. Please allow GPS access and try again.',
  locationUnavailable: 'Distance will appear after you share your location.',
  selectedLocation: 'Selected Location',
  directions: 'Directions',
  directionsLoading: 'Loading in-app directions...',
  directionsLocationHint: 'Share your location to load directions inside the app.',
  routeSummary: '{distance} mi • about {duration} min',
  stepMeta: '{distance} mi • {duration} min',
  routeToStore: 'Route to Store',
  startLabel: 'You',
  destinationLabel: 'Store',
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
  orderFailed: 'Order could not be submitted: {message}',
  assistantTitle: 'Personal Assistant',
  assistantWelcome:
    'Hi! I can answer questions about our drinks and toppings, compare options, and explain how checkout works. What would you like to know?',
  assistantPlaceholder: 'Ask about the menu or ordering…',
  assistantSend: 'Send',
  assistantThinking: 'Thinking…',
  assistantClose: 'Close assistant',
  assistantYou: 'You',

  // Text labels used by the TTS accessibility system.
  ttsOn: 'TTS On',
  ttsOff: 'TTS Off',
  ttsEnable: 'Turn text-to-speech on',
  ttsDisable: 'Turn text-to-speech off',
  ttsInstructions:
    'Text-to-speech is on. For faster blind-accessible ordering, open Accessible Ordering. It reads one drink at a time and lets you add default drinks without tapping every option.',
  selectedCustomization: 'Customizing {itemName}.',
  selectionChanged: '{field} changed to {value}.',
  toppingAdded: '{toppingName} added.',
  toppingRemoved: '{toppingName} removed.',
  itemRemoved: '{itemName} removed from cart.',
  pickupTimeSelected: 'Pickup time selected: {value}.',
  orderTypeSelected: 'Order type selected: {value}.',
  pickupLocationSelected: 'Pickup location selected: {locationName}. Address: {address}.',
  nameFieldFocused: 'Customer name field. Enter the name for the order.',
  pickupTimeFocused: 'Pickup time field. Choose when the order should be ready.',
  orderTypeFocused: 'Order type field. Choose pickup or dine-in.',
  locationFocused: 'Store location option: {locationName}. Address: {address}.',
  categorySelected: 'Menu category selected: {category}.',

  // Text labels for the accessible ordering guide.
  accessibleGuideOpen: 'Open Accessible Ordering',
  accessibleGuideClose: 'Close Accessible Ordering',
  accessibleGuideTitle: 'Accessible Ordering Guide',
  accessibleGuideTag: 'Blind Accessibility',
  accessibleGuideShortHelp:
    'Use these large controls to hear the menu and build an order without tapping every menu card.',
  accessibleGuideInstructions:
    'Accessible ordering is open. Use the large buttons to move through the menu one drink at a time. You can read the item, customize it, add it with default options, or read your cart.',
  readFullMenu: 'Read Full Menu',
  readCurrentItem: 'Read Current Item',
  previousItem: 'Previous Item',
  nextItem: 'Next Item',
  customizeThisItem: 'Customize This Drink',
  addDefaultToCart: 'Add With Default Options',
  readCart: 'Read Cart',
  noMenuItemsAvailable: 'No menu items are available.',
  cartSummaryEmpty: 'Your cart is empty.',
  cartSummaryIntro: 'Your cart has {count} item. Total is {total}.',
  cartSummaryIntroPlural: 'Your cart has {count} items. Total is {total}.'
};

// Hard-coded store locations used for pickup selection and directions.
const STORE_LOCATIONS = [
  {
    id: 'northgate',
    name: 'Moonwake Tea Atelier - Northgate',
    address: '201 University Dr, College Station, TX 77840',
    lat: 30.62498,
    lon: -96.34079
  },
  {
    id: 'tower-point',
    name: 'Moonwake Tea Atelier - Tower Point',
    address: '15960 Texas 6, College Station, TX 77845',
    lat: 30.56173,
    lon: -96.28016
  },
  {
    id: 'bryan',
    name: 'Moonwake Tea Atelier - Bryan',
    address: '1801 Briarcrest Dr, Bryan, TX 77802',
    lat: 30.65545,
    lon: -96.34154
  }
];

// Sample menu used if the backend menu API is unavailable.
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

// Converts a raw topping object from the backend into a consistent frontend format.
function normalizeTopping(topping, index, itemId) {
  return {
    id: topping?.id ?? topping?.item_inventory_id ?? itemId * 100 + index + 1,
    name: topping?.name ?? topping?.item_category ?? topping?.displayName ?? `Topping ${index + 1}`,
    price: Number(topping?.price ?? topping?.price_per_unit ?? 0)
  };
}

// Converts a raw menu item from the backend into the format expected by the customer page.
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

// Normalizes the entire menu and falls back to sample data if no valid menu is provided.
function normalizeMenu(menu) {
  if (!Array.isArray(menu) || menu.length === 0) {
    return fallbackMenu;
  }

  return menu.map((item, index) => normalizeMenuItem(item, index));
}

function inferCategory(name) {
  const lowerName = (name || '').toLowerCase();

  if (SLUSH_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return 'Slush';
  if (SEASONAL_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return 'Seasonal';
  if (FRUIT_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return 'Fruit Tea';
  if (lowerName.includes('milk') || MILK_TEA_KEYWORDS.some((keyword) => lowerName.includes(keyword))) return 'Milk Tea';

  return 'Milk Tea';
}

// Creates the default drink customization state when a menu item is selected.
function buildDefaultSelection(item) {
  return {
    itemId: item.id,
    quantity: 1,
    size: 'Regular',
    sweetness: '75%',
    ice: 'Regular Ice',
    toppings: [],
    notes: '',
    total: item.basePrice
  };
}

// Calculates the drink total based on size and selected toppings.
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

// Adds display fields to menu items so translated and original text can be handled separately.
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

// Converts degrees to radians for the distance formula.
function toRadians(value) {
  return (value * Math.PI) / 180;
}

// Calculates the distance in miles between the user's location and a store.
function calculateDistanceMiles(origin, destination) {
  if (!origin || !destination) {
    return null;
  }

  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(destination.lat - origin.lat);
  const dLon = toRadians(destination.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

// Main customer ordering page.
export default function CustomerPage() {
  // Menu and translation state.
  const [menu, setMenu] = useState(normalizeMenu(fallbackMenu));
  const [translatedMenu, setTranslatedMenu] = useState(withDisplayFields(normalizeMenu(fallbackMenu)));
  const [viewCart, setViewCart] = useState(false);
  // Current visible menu category.
  const [activeCategory, setActiveCategory] = useState('All');

  // Current item being customized.
  const [selectedItem, setSelectedItem] = useState(null);
  const [selection, setSelection] = useState(null);

  // Cart and checkout state.
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(baseText.statusReady);

  // Customer checkout form state.
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    pickupWindow: 'ASAP',
    orderType: 'Pickup',
    pickupLocationId: STORE_LOCATIONS[0].id
  });

  // Language and translated UI text state.
  const [language, setLanguage] = useState('en');
  const [translatedText, setTranslatedText] = useState(baseText);

  // Location and directions state.
  const [userCoordinates, setUserCoordinates] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [directions, setDirections] = useState({
    loading: false,
    error: '',
    summary: null,
    steps: [],
    routeCoordinates: []
  });

  // Accessible ordering guide state.
  const [accessibilityGuideOpen, setAccessibilityGuideOpen] = useState(false);
  const [accessibilityGuideIndex, setAccessibilityGuideIndex] = useState(0);

  // TTS state and functions from the custom hook.
  const {
    ttsEnabled,
    toggleTts,
    speak,
    speakNow,
    cancelSpeech
  } = useTextToSpeech(language);

  // Finds the currently selected pickup location.
  const selectedLocation = useMemo(
    () => STORE_LOCATIONS.find((location) => location.id === checkoutForm.pickupLocationId) || STORE_LOCATIONS[0],
    [checkoutForm.pickupLocationId]
  );

  // Calculates the displayed distance to the selected pickup location.
  const selectedLocationDistance = useMemo(() => {
    const distance = calculateDistanceMiles(userCoordinates, selectedLocation);
    return distance === null ? null : distance.toFixed(1);
  }, [selectedLocation, userCoordinates]);

  // Loads route directions whenever the selected store or user location changes.
  useEffect(() => {
    let cancelled = false;

    async function loadDirections() {
      if (!selectedLocation || !userCoordinates) {
        setDirections({
          loading: false,
          error: '',
          summary: null,
          steps: [],
          routeCoordinates: []
        });
        return;
      }

      setDirections((current) => ({
        ...current,
        loading: true,
        error: ''
      }));

      try {
        const response = await fetch(apiUrl('/api/directions'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: userCoordinates,
            destination: selectedLocation
          })
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Directions failed.');
        }

        if (!cancelled) {
          setDirections({
            loading: false,
            error: '',
            summary: payload.summary || null,
            steps: Array.isArray(payload.steps) ? payload.steps : [],
            routeCoordinates: Array.isArray(payload.routeCoordinates) ? payload.routeCoordinates : []
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDirections({
            loading: false,
            error: error.message || 'Directions are unavailable right now.',
            summary: null,
            steps: [],
            routeCoordinates: []
          });
        }
      }
    }

    loadDirections();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, userCoordinates]);

  // Sends text to the backend translation API.
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

  // Provides simple hard-coded translations for category labels.
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

  // Translates drink size labels.
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

  // Translates ice level labels.
  function translateIce(level) {
    if (language === 'es') {
      if (level === 'Hot') return 'Caliente';
      if (level === 'No Ice') return 'Sin hielo';
      if (level === 'Light Ice') return 'Poco hielo';
      if (level === 'Regular Ice') return 'Hielo regular';
    }
    if (language === 'zh-CN') {
      if (level === 'Hot') return '热饮';
      if (level === 'No Ice') return '去冰';
      if (level === 'Light Ice') return '少冰';
      if (level === 'Regular Ice') return '正常冰';
    }
    if (language === 'ko') {
      if (level === 'Hot') return '따뜻하게';
      if (level === 'No Ice') return '얼음 없음';
      if (level === 'Light Ice') return '적은 얼음';
      if (level === 'Regular Ice') return '보통 얼음';
    }
    return level;
  }

  // Speaks an accessibility message.
  // If TTS is off, this turns it on first so the accessible guide can immediately read instructions.
  function speakAccessibly(message) {
    if (ttsEnabled) {
      speak(message);
      return;
    }

    toggleTts();

    setTimeout(() => {
      speakNow(message);
    }, 100);
  }

  // Loads menu data from the backend, or falls back to sample data if the request fails.
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

  // Translates general UI text whenever the selected language changes.
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

  // Translates menu item names, descriptions, and topping names.
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

        // Creates a flat list of menu text to translate and tracks where each translation belongs.
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

        // Sends translations in batches to avoid sending too much text at once.
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

  // Adds modal behavior when the customizer is open.
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

  // Builds the category list from the loaded menu.
  const categories = useMemo(() => {
    return CUSTOMER_CATEGORIES;
  }, []);

  // Filters the visible menu based on the selected category.
  const visibleMenu = useMemo(() => {
    if (activeCategory === 'All') {
      return translatedMenu;
    }

    return translatedMenu.filter((item) => inferCategory(item.name) === activeCategory);
  }, [activeCategory, translatedMenu]);

  // Resets the accessible guide index if the visible menu becomes shorter.
  useEffect(() => {
    if (accessibilityGuideIndex > visibleMenu.length - 1) {
      setAccessibilityGuideIndex(0);
    }
  }, [accessibilityGuideIndex, visibleMenu.length]);

  // Calculates order subtotal, tax, and total.
  const subtotal = useMemo(
    () => Number(cart.reduce((sum, item) => sum + Number(item.total || 0) * Number(item.quantity || 1), 0).toFixed(2)),
    [cart]
  );
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));

  // Toggles text-to-speech on or off.
  function handleToggleTts() {
    const nextEnabled = !ttsEnabled;
    toggleTts();

    if (nextEnabled) {
      setTimeout(() => {
        speakNow(
          translatedText.ttsInstructions ||
            'Text-to-speech is on. For faster blind-accessible ordering, open Accessible Ordering.'
        );
      }, 100);
    } else {
      cancelSpeech();
    }
  }

  // Changes the active menu category and announces the change if TTS is enabled.
  function handleCategorySelect(category) {
    setActiveCategory(category);
    setAccessibilityGuideIndex(0);

    speak(
      (translatedText.categorySelected || 'Menu category selected: {category}.').replace(
        '{category}',
        getTranslatedCategory(category)
      )
    );
  }

  // Opens the drink customization modal for the selected item.
  function openCustomizer(item) {
    const translatedItem = translatedMenu.find((entry) => entry.id === item.id) || item;
    const nextSelection = buildDefaultSelection(translatedItem);
    nextSelection.total = calculateTotal(translatedItem, nextSelection);
    setSelectedItem(translatedItem);
    setSelection(nextSelection);

    speak(
      (translatedText.selectedCustomization || 'Customizing {itemName}.').replace(
        '{itemName}',
        translatedItem.displayName || translatedItem.name
      )
    );
  }

  // Updates a customization field and recalculates the drink total.
  function updateSelection(field, value) {
    if (!selectedItem || !selection) {
      return;
    }

    const normalizedValue =
      field === 'quantity'
        ? Math.max(1, Number.parseInt(value, 10) || 1)
        : value;
    const next = { ...selection, [field]: normalizedValue };
    next.total = calculateTotal(selectedItem, next);
    setSelection(next);

    if (field === 'notes') {
      return;
    }

    let spokenValue = value;

    if (field === 'size') {
      spokenValue = translateSize(value);
    }

    if (field === 'ice') {
      spokenValue = translateIce(value);
    }

    speak(
      (translatedText.selectionChanged || '{field} changed to {value}.')
        .replace('{field}', field)
        .replace('{value}', spokenValue)
    );
  }

  // Adds or removes a topping from the current drink selection.
  function toggleTopping(name) {
    if (!selectedItem || !selection) {
      return;
    }

    const wasSelected = selection.toppings.includes(name);

    const toppings = wasSelected
      ? selection.toppings.filter((item) => item !== name)
      : [...selection.toppings, name];

    const next = { ...selection, toppings };
    next.total = calculateTotal(selectedItem, next);
    setSelection(next);

    const topping = selectedItem.toppings.find((entry) => entry.name === name);
    const toppingName = topping?.displayName || topping?.name || name;

    speak(
      wasSelected
        ? (translatedText.toppingRemoved || '{toppingName} removed.').replace('{toppingName}', toppingName)
        : (translatedText.toppingAdded || '{toppingName} added.').replace('{toppingName}', toppingName)
    );
  }

  // Builds a cart item from a customized drink selection.
  function buildCartItemFromSelection(item, currentSelection) {
    const selectedToppings = (item.toppings || []).filter((topping) =>
      currentSelection.toppings.includes(topping.name)
    );

    return {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      displayName: item.displayName || item.name,
      quantity: currentSelection.quantity || 1,
      size: currentSelection.size || 'Regular',
      displaySize: translateSize(currentSelection.size || 'Regular'),
      sweetness: currentSelection.sweetness,
      ice: currentSelection.ice,
      displayIce: translateIce(currentSelection.ice),
      toppings: currentSelection.toppings,
      displayToppings: selectedToppings.map((topping) => topping.displayName || topping.name),
      toppingInventoryIds: selectedToppings
        .map((topping) => topping.id)
        .filter((value) => Number.isInteger(value)),
      notes: currentSelection.notes.trim(),
      total: currentSelection.total
    };
  }

  // Adds the customized drink to the cart.
  function addToCart() {
    if (!selectedItem || !selection) {
      return;
    }

    const cartItem = buildCartItemFromSelection(selectedItem, selection);

    setCart((current) => [...current, cartItem]);

    const message = (translatedText.addedToCart || '{itemName} added to cart.').replace(
      '{itemName}',
      selectedItem.displayName || selectedItem.name
    );

    setStatusMessage(message);
    speak(message);

    setSelectedItem(null);
    setSelection(null);
  }

  // Adds an item to the cart using default customization options.
  function addDefaultItemToCart(item) {
    const translatedItem = translatedMenu.find((entry) => entry.id === item.id) || item;
    const defaultSelection = buildDefaultSelection(translatedItem);
    defaultSelection.total = calculateTotal(translatedItem, defaultSelection);

    const cartItem = buildCartItemFromSelection(translatedItem, defaultSelection);

    setCart((current) => [...current, cartItem]);

    const message = (translatedText.addedToCart || '{itemName} added to cart.').replace(
      '{itemName}',
      translatedItem.displayName || translatedItem.name
    );

    setStatusMessage(message);
    speakAccessibly(`${message} Default options are regular size, 75 percent sweetness, and regular ice.`);
  }

  // Reads a spoken summary of the current cart.
  function readCartSummary() {
    if (cart.length === 0) {
      speakAccessibly(translatedText.cartSummaryEmpty || 'Your cart is empty.');
      return;
    }

    const introTemplate =
      cart.length === 1
        ? translatedText.cartSummaryIntro || 'Your cart has {count} item. Total is {total}.'
        : translatedText.cartSummaryIntroPlural || 'Your cart has {count} items. Total is {total}.';

    const intro = introTemplate
      .replace('{count}', String(cart.length))
      .replace('{total}', `$${total.toFixed(2)}`);

    const itemText = cart
      .map((item, index) => {
        const toppings =
          Array.isArray(item.displayToppings) && item.displayToppings.length > 0
            ? `Toppings: ${item.displayToppings.join(', ')}.`
            : 'No toppings.';
        return `${index + 1}. ${item.displayName || item.name}. ${item.displaySize || item.size}. Sweetness ${item.sweetness}. ${item.displayIce || item.ice}. ${toppings} Price ${Number(item.total || 0).toFixed(2)}.`;
      })
      .join(' ');

    speakAccessibly(`${intro} ${itemText}`);
  }

  // Removes an item from the cart.
  function removeCartItem(id) {
    const removedItem = cart.find((item) => item.id === id);

    setCart((current) => current.filter((item) => item.id !== id));

    if (removedItem) {
      const message = (translatedText.itemRemoved || '{itemName} removed from cart.').replace(
        '{itemName}',
        removedItem.displayName || removedItem.name || 'Item'
      );

      speak(message);
    }
  }

  // Updates quantity for a cart item.
  function updateCartItemQuantity(id, nextQuantity) {
    const safeQuantity = Math.max(1, Number(nextQuantity || 1));
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: safeQuantity } : item))
    );
  }

  // Closes the customization modal.
  function closeCustomizer() {
    setSelectedItem(null);
    setSelection(null);
  }

  // Updates checkout form fields and announces important changes through TTS.
  function handleCheckoutChange(event) {
    const { name, value } = event.target;

    setCheckoutForm((current) => ({ ...current, [name]: value }));

    if (name === 'pickupWindow') {
      const pickupTimeLabels = {
        ASAP: translatedText.asap || 'ASAP',
        '10 minutes': translatedText.tenMinutes || '10 minutes',
        '20 minutes': translatedText.twentyMinutes || '20 minutes',
        '30 minutes': translatedText.thirtyMinutes || '30 minutes'
      };

      speak(
        (translatedText.pickupTimeSelected || 'Pickup time selected: {value}.').replace(
          '{value}',
          pickupTimeLabels[value] || value
        )
      );
    }

    if (name === 'orderType') {
      const orderTypeLabels = {
        Pickup: translatedText.pickup || 'Pickup',
        'Dine-In': translatedText.dineIn || 'Dine-In'
      };

      speak(
        (translatedText.orderTypeSelected || 'Order type selected: {value}.').replace(
          '{value}',
          orderTypeLabels[value] || value
        )
      );
    }

    if (name === 'pickupLocationId') {
      const location = STORE_LOCATIONS.find((entry) => entry.id === value);

      if (location) {
        speak(
          (translatedText.pickupLocationSelected || 'Pickup location selected: {locationName}. Address: {address}.')
            .replace('{locationName}', location.name)
            .replace('{address}', location.address)
        );
      }
    }
  }

  // Announces checkout fields when they receive focus.
  function speakCheckoutFocus(fieldName, extraValue = '') {
    if (fieldName === 'customerName') {
      speak(translatedText.nameFieldFocused || 'Customer name field. Enter the name for the order.');
    }

    if (fieldName === 'pickupWindow') {
      speak(translatedText.pickupTimeFocused || 'Pickup time field. Choose when the order should be ready.');
    }

    if (fieldName === 'orderType') {
      speak(translatedText.orderTypeFocused || 'Order type field. Choose pickup or dine-in.');
    }

    if (fieldName === 'pickupLocationId') {
      const location = STORE_LOCATIONS.find((entry) => entry.id === extraValue);

      if (location) {
        speak(
          (translatedText.locationFocused || 'Store location option: {locationName}. Address: {address}.')
            .replace('{locationName}', location.name)
            .replace('{address}', location.address)
        );
      }
    }
  }

  // Requests the user's current location and updates distance/directions information.
  function requestUserLocation() {
    if (!navigator.geolocation) {
      setStatusMessage(translatedText.locationPermissionError);
      speak(translatedText.locationPermissionError);
      return;
    }

    setLocatingUser(true);
    setStatusMessage(translatedText.locating || 'Finding your location...');
    speak(translatedText.locating || 'Finding your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setLocatingUser(false);
        const distanceText = calculateDistanceMiles(
          { lat: position.coords.latitude, lon: position.coords.longitude },
          selectedLocation
        );
        if (distanceText === null) {
          setStatusMessage(translatedText.statusReady);
          speak(translatedText.statusReady);
          return;
        }

        const message = `${selectedLocation.name} • ${(translatedText.distanceAway || '{distance} miles away').replace(
          '{distance}',
          distanceText.toFixed(1)
        )}`;

        setStatusMessage(message);
        speak(message);
      },
      () => {
        setLocatingUser(false);
        setStatusMessage(translatedText.locationPermissionError);
        speak(translatedText.locationPermissionError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  }

  // Sends the order to the backend order API.
  async function handleSubmitOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
      return;
    }

    const payload = {
      customerName: checkoutForm.customerName || 'Guest',
      pickupWindow: checkoutForm.pickupWindow,
      orderType: checkoutForm.orderType,
      pickupLocationId: checkoutForm.pickupLocationId,
      pickupLocationName: selectedLocation.name,
      pickupLocationAddress: selectedLocation.address,
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
        orderType: 'Pickup',
        pickupLocationId: STORE_LOCATIONS[0].id
      });

      const message = (translatedText.orderConfirmed || 'Order confirmed. Ticket {orderNumber} is in progress.')
        .replace('{orderNumber}', result.orderNumber);

      setStatusMessage(message);
      speak(message);
    } catch (error) {
      const message = (translatedText.orderFailed || 'Order could not be submitted: {message}').replace(
        '{message}',
        error.message
      );

      setStatusMessage(message);
      speak(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Creates translated cart display fields for the cart panel.
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

            <TtsToggle
              enabled={ttsEnabled}
              onToggle={handleToggleTts}
              labels={translatedText}
            />
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
          <AccessibilityOrderGuide
            open={accessibilityGuideOpen}
            onToggle={setAccessibilityGuideOpen}
            menuItems={visibleMenu}
            selectedIndex={accessibilityGuideIndex}
            onSelectIndex={setAccessibilityGuideIndex}
            onCustomize={openCustomizer}
            onAddDefault={addDefaultItemToCart}
            onReadCart={readCartSummary}
            labels={translatedText}
            speakText={speakAccessibly}
          />

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
                  onClick={() => handleCategorySelect(category)}
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

        
          {!viewCart && (
            <button 
              className="kiosk-cart-fab"
              onClick={() => setViewCart(true)}
              style={{
                position: 'fixed', 
                top: '20px',           // Anchored to top
                right: '20px',         // Anchored to right
                zIndex: 3000, 
                padding: '12px 20px', 
                background: '#6f3c20', 
                color: '#fff',
                borderRadius: '8px',   // Slightly sharper corners look better at the top
                fontSize: '15px', 
                fontWeight: 'bold',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                border: 'none', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '18px' }}>🛒</span> 
              <span>
                {translatedText.cart} ({cart.length}) — ${total.toFixed(2)}
              </span>
            </button>
          )}

      {/* wrapping existing CartPanel in an overlay/modal */}
        {viewCart && (
        <div className="kiosk-cart-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', justifyContent: 'flex-end'
          }}>
          <div className="kiosk-cart-container" style={{
            width: '100%', maxWidth: '450px', background: '#fff', height: '100%',
            overflowY: 'auto', padding: '20px', position: 'relative', boxShadow: '-5px 0 15px rgba(0,0,0,0.2)'
          }}>
            <button 
            onClick={() => setViewCart(false)}
            style={{
              background: '#a33a2b', color: '#fff', border: 'none', 
              padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', 
              marginBottom: '20px', cursor: 'pointer'
              }}
            >
          {translatedText.close}
        </button>

        <CartPanel
              cart={translatedCart}
              subtotal={subtotal}
              tax={tax}
              total={total}
              checkoutForm={checkoutForm}
              onCheckoutChange={handleCheckoutChange}
              onCheckoutFocus={speakCheckoutFocus}
              onUpdateItemQuantity={updateCartItemQuantity}
              onRemoveItem={removeCartItem}
              onSubmitOrder={handleSubmitOrder}
              storeLocations={STORE_LOCATIONS}
              selectedLocation={selectedLocation}
              selectedLocationDistance={selectedLocationDistance}
              onUseMyLocation={requestUserLocation}
              locatingUser={locatingUser}
              userCoordinates={userCoordinates}
              routeCoordinates={directions.routeCoordinates}
              directionsSummary={directions.summary}
              directionsSteps={directions.steps}
              directionsLoading={directions.loading}
              directionsError={directions.error}
              submitting={submitting}
              statusMessage={statusMessage}
              labels={translatedText}
            />
          </div>
        </div>
      )}
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
          ttsEnabled={ttsEnabled}
        />
      ) : null}

      <PersonalAssistant
        menu={menu}
        cart={cart}
        language={language}
        labels={translatedText}
        ttsEnabled={ttsEnabled}
        speakText={speak}
      />
    </div>
  );
}
