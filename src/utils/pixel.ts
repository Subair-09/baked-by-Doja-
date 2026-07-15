declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

let isPixelInitialized = false;
let activePixelId = "";
let activeConversionId = "";

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
 * Sets the active Conversion ID used for Purchase tracking.
 */
export const setFacebookConversionId = (conversionId: string) => {
  activeConversionId = conversionId;
  console.log(`[Meta Pixel] Active Conversion ID / Event ID set to: ${conversionId}`);
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
 * Standard AddToCart tracker
 */
export const trackAddToCart = (productId: string, productName: string, price: number, currency = "NGN") => {
  trackPixelEvent("AddToCart", {
    content_ids: [productId],
    content_name: productName,
    content_type: "product",
    value: price,
    currency: currency,
  });
};

/**
 * Standard InitiateCheckout tracker
 */
export const trackInitiateCheckout = (cartItems: any[], totalValue: number, currency = "NGN") => {
  const contentIds = cartItems.map((item) => item.product.id || item.product._id);
  trackPixelEvent("InitiateCheckout", {
    content_ids: contentIds,
    content_type: "product",
    value: totalValue,
    currency: currency,
    num_items: cartItems.length,
  });
};

/**
 * Standard Purchase tracker with Conversion ID / Event ID
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

  if (typeof window === "undefined" || !isPixelInitialized || !window.fbq) {
    console.log(`[Meta Pixel Simulation] Event "Purchase" not tracked (Pixel not initialized or ID not set).`, eventData);
    return;
  }

  try {
    // Pass eventID inside options object or as the 4th argument (used for Conversions API matching)
    window.fbq("track", "Purchase", eventData, { eventID: selectedConversionId });
    console.log(`[Meta Pixel] Tracked Purchase with Event ID/Conversion ID: ${selectedConversionId}`, eventData);
  } catch (err) {
    console.error("[Meta Pixel] Failed to track Purchase:", err);
  }
};
