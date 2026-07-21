declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    snaptr?: (...args: any[]) => void;
    _snaptr?: any;
  }
}

let isPixelInitialized = false;
let activePixelId = "";
let activeConversionId = "";

let isSnapInitialized = false;
let activeSnapId = "";
let activeSnapCustomEventName = "";

/**
 * Initializes the Meta (Facebook) Pixel with a given Pixel ID.
 */
export const initFacebookPixel = (pixelId: string) => {
  if (!pixelId || typeof window === "undefined") return;
  
  activePixelId = pixelId;

  if (isPixelInitialized) {
    return;
  }

  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  if (window.fbq) {
    window.fbq("init", pixelId);
    window.fbq("track", "PageView");
    isPixelInitialized = true;
    console.log(`[Meta Pixel] Initialized successfully with ID: ${pixelId}`);
  }
};

/**
 * Initializes the Snapchat Pixel with a given Pixel ID.
 */
export const initSnapchatPixel = (pixelId: string) => {
  if (!pixelId || typeof window === "undefined") return;

  activeSnapId = pixelId;

  if (isSnapInitialized) {
    return;
  }

  /* eslint-disable */
  (function (win: any, doc: any, sdk_url: any, a?: any) {
    if (win.snaptr) return;
    a = win.snaptr = function () {
      a.handleRequest ? a.handleRequest.apply(a, arguments) : a.queue.push(arguments);
    };
    a.queue = [];
    var s = doc.createElement(sdk_url);
    s.async = !0;
    s.src = "https://sc-static.net/sce/p1/bundle.js";
    var r = doc.getElementsByTagName(sdk_url)[0];
    r.parentNode.insertBefore(s, r);
  })(window, document, "script");
  /* eslint-enable */

  if (window.snaptr) {
    window.snaptr("init", pixelId);
    window.snaptr("track", "PAGE_VIEW");
    isSnapInitialized = true;
    console.log(`[Snapchat Pixel] Initialized successfully with ID: ${pixelId}`);
  }
};

/**
 * Sets the active Conversion ID used for Purchase tracking.
 */
export const setFacebookConversionId = (conversionId: string) => {
  activeConversionId = conversionId;
  console.log(`[Meta Pixel] Active Conversion ID / Event ID set to: ${conversionId}`);
};

/**
 * Sets the active Snapchat Custom Event Name used for dynamic custom conversion tracking.
 */
export const setSnapchatCustomEventName = (eventName: string) => {
  activeSnapCustomEventName = eventName;
  console.log(`[Snapchat Pixel] Active Custom Event Name set to: ${eventName}`);
};

/**
 * Tracks a standard or custom Meta Pixel event.
 */
export const trackPixelEvent = (eventName: string, options: Record<string, any> = {}) => {
  if (typeof window === "undefined" || !isPixelInitialized || !window.fbq) {
    console.log(`[Meta Pixel Simulation] Event "${eventName}" not tracked (Pixel not initialized or ID not set).`, options);
    return;
  }

  try {
    window.fbq("track", eventName, options);
    console.log(`[Meta Pixel] Tracked Event: ${eventName}`, options);
  } catch (err) {
    console.error("[Meta Pixel] Failed to track event:", err);
  }
};

/**
 * Tracks a Snapchat Pixel conversion event.
 */
export const trackSnapchatEvent = (eventName: string, options: Record<string, any> = {}) => {
  if (typeof window === "undefined" || !isSnapInitialized || !window.snaptr) {
    console.log(`[Snapchat Pixel Simulation] Event "${eventName}" not tracked (Pixel not initialized or ID not set).`, options);
    return;
  }

  try {
    window.snaptr("track", eventName, options);
    console.log(`[Snapchat Pixel] Tracked Event: ${eventName}`, options);
  } catch (err) {
    console.error("[Snapchat Pixel] Failed to track event:", err);
  }
};

/**
 * Standard AddToCart tracker for both Meta and Snapchat Pixels
 */
export const trackAddToCart = (productId: string, productName: string, price: number, currency = "NGN") => {
  // Track Meta Pixel
  trackPixelEvent("AddToCart", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: price,
    currency: currency,
  });

  // Track Snapchat Pixel
  trackSnapchatEvent("ADD_CART", {
    price: price,
    currency: currency,
    item_ids: [productId],
    item_category: "Baked Goods"
  });
};

/**
 * Standard InitiateCheckout tracker for both Meta and Snapchat Pixels
 */
export const trackInitiateCheckout = (cartItems: any[], totalValue: number, currency = "NGN") => {
  const contentIds = cartItems.map((item) => item.product.id || item.product._id);
  
  // Track Meta Pixel
  trackPixelEvent("InitiateCheckout", {
    content_ids: contentIds,
    content_type: "product",
    value: totalValue,
    currency: currency,
    num_items: cartItems.length,
  });

  // Track Snapchat Pixel
  trackSnapchatEvent("START_CHECKOUT", {
    price: totalValue,
    currency: currency,
    item_ids: contentIds,
    number_items: cartItems.length
  });
};

/**
 * Standard Purchase tracker with Conversion ID / Event ID for both Meta and Snapchat Pixels
 */
export const trackPurchase = (orderId: string, totalAmount: number, cartItems: any[], currency = "NGN", conversionId?: string) => {
  const contentIds = cartItems.map((item) => item.product.id || item.product._id);
  const selectedConversionId = conversionId || activeConversionId || orderId;

  const eventData: Record<string, any> = {
    content_ids: contentIds,
    content_type: "product",
    value: totalAmount,
    currency: currency,
    order_id: orderId,
  };

  if (selectedConversionId) {
    eventData.conversion_id = selectedConversionId;
  }

  // Track Meta Pixel
  if (typeof window !== "undefined" && isPixelInitialized && window.fbq) {
    try {
      window.fbq("track", "Purchase", eventData, { eventID: selectedConversionId });
      console.log(`[Meta Pixel] Tracked Purchase with Event ID/Conversion ID: ${selectedConversionId}`, eventData);
    } catch (err) {
      console.error("[Meta Pixel] Failed to track Purchase:", err);
    }
  } else {
    console.log(`[Meta Pixel Simulation] Event "Purchase" not tracked (Pixel not initialized or ID not set).`, eventData);
  }

  // Track Snapchat Pixel
  trackSnapchatEvent("PURCHASE", {
    price: totalAmount,
    currency: currency,
    item_ids: contentIds,
    transaction_id: orderId,
    number_items: cartItems.length
  });

  // Track Dynamic Snapchat Custom Conversion Event if defined
  if (activeSnapCustomEventName) {
    trackSnapchatEvent(activeSnapCustomEventName, {
      price: totalAmount,
      currency: currency,
      item_ids: contentIds,
      transaction_id: orderId,
      number_items: cartItems.length
    });
  }
};
