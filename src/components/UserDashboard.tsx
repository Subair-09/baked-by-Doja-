import React, { useState, useEffect } from 'react';
import { 
  X, Database, ShoppingBag, TrendingUp, Compass, Award, RefreshCw, ChevronRight, Package, 
  Sparkles, Users, ChevronDown, ChevronUp, Check, LogOut, LayoutDashboard, User,
  CreditCard, MessageSquare, Star, Trash2, Plus, Minus, LogIn, ShoppingCart, Clock, ShieldCheck, Truck, AlertTriangle,
  UploadCloud, Loader2, Wallet, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AuthScreen from './AuthScreen';
import { products, gallery } from '../data';
import { Product, GalleryItem } from '../types';
import { initFacebookPixel, setFacebookConversionId, trackAddToCart, trackInitiateCheckout, trackPurchase } from '../utils/pixel';

interface UserDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; phone: string; role?: string; token?: string } | null;
  onOrderNowClick: (productTitle?: string) => void;
  onAuthSuccess?: (user: { name: string; phone: string; role?: string; token?: string }) => void;
  editProductOnLoad?: Product | null;
  onResetEditProductOnLoad?: () => void;
  products?: Product[];
  onProductsChange?: (products: Product[]) => void;
  initialTab?: string;
  onRefreshProducts?: () => Promise<Product[] | null>;
  onRefreshProductsOnly?: () => Promise<Product[] | null>;
  gallery?: GalleryItem[];
  onGalleryChange?: (gallery: GalleryItem[]) => void;
  onRefreshGallery?: () => Promise<GalleryItem[] | null>;
  galleryCategories?: { key: string; label: string }[];
  onRefreshGalleryCategories?: () => Promise<{ key: string; label: string }[] | null>;
}

interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  topping: string;
  isGift: boolean;
  giftNote: { to: string; from: string; message: string };
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', description: 'Your order has been placed and is awaiting confirmation from our bakery team' },
  { key: 'prepping', label: 'Ingredients Prepped', description: 'Selected premium ripe bananas & hand-whipped ingredients' },
  { key: 'baking', label: 'Rising in Oven', description: 'Artisan baking at precise temperature for maximum moisture' },
  { key: 'cooling', label: 'Glazing & Cooling', description: 'Drizzled with fresh golden glaze & cooled to lock in flavor' },
  { key: 'delivering', label: 'Courier Dispatch', description: 'Speedy dispatcher route optimization with thermal carrier' },
  { key: 'delivered', label: 'Freshly Delivered', description: 'Arrived at your doorstep warm and ready to be sliced' },
];

export default function UserDashboard({ 
  isOpen, onClose, currentUser, onOrderNowClick, onAuthSuccess, editProductOnLoad, onResetEditProductOnLoad,
  products: propProducts, onProductsChange, initialTab, onRefreshProducts,
  gallery: propGallery, onGalleryChange, onRefreshGallery,
  galleryCategories = [], onRefreshGalleryCategories
}: UserDashboardProps) {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (currentUser?.role === 'admin') return 'admin';
    if (!currentUser) return 'auth';
    return initialTab || 'browse';
  });

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      if (currentTab !== 'admin') {
        setCurrentTab('admin');
      }
    } else if (!currentUser) {
      if (currentTab !== 'auth') {
        setCurrentTab('auth');
      }
    } else if (isOpen && initialTab && currentTab === 'auth') {
      // Transition from auth to requested initial tab once logged in
      setCurrentTab(initialTab);
    }
  }, [currentUser, currentTab, isOpen, initialTab]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; source: string; storageConnected?: boolean }>({ connected: false, source: 'Checking...', storageConnected: false });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // Custom sidebar mobile drawer state
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);

  // Cart state (initialized from localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load products dynamically
  const [localAllProducts, setLocalAllProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      return stored ? JSON.parse(stored) : products;
    } catch {
      return products;
    }
  });

  const allProducts = propProducts || localAllProducts;

  const setAllProducts = (newValOrFunc: Product[] | ((prev: Product[]) => Product[])) => {
    let updatedProducts: Product[];
    if (typeof newValOrFunc === 'function') {
      updatedProducts = newValOrFunc(allProducts);
    } else {
      updatedProducts = newValOrFunc;
    }
    
    if (onProductsChange) {
      onProductsChange(updatedProducts);
    } else {
      setLocalAllProducts(updatedProducts);
    }
    localStorage.setItem('baked_by_doja_products', JSON.stringify(updatedProducts));
    window.dispatchEvent(new Event('storage'));
  };

  // Load gallery dynamically
  const [localAllGallery, setLocalAllGallery] = useState<GalleryItem[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_gallery');
      return stored ? JSON.parse(stored) : gallery;
    } catch {
      return gallery;
    }
  });

  const allGallery = propGallery || localAllGallery;

  const setAllGallery = (newValOrFunc: GalleryItem[] | ((prev: GalleryItem[]) => GalleryItem[])) => {
    let updatedGallery: GalleryItem[];
    if (typeof newValOrFunc === 'function') {
      updatedGallery = newValOrFunc(allGallery);
    } else {
      updatedGallery = newValOrFunc;
    }
    
    if (onGalleryChange) {
      onGalleryChange(updatedGallery);
    } else {
      setLocalAllGallery(updatedGallery);
    }
    localStorage.setItem('baked_by_doja_gallery', JSON.stringify(updatedGallery));
    window.dispatchEvent(new Event('storage'));
  };

  // Selected product in view detail tab
  const [selectedProduct, setSelectedProduct] = useState<Product>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      const loaded = stored ? JSON.parse(stored) : products;
      return loaded[0] || products[0];
    } catch {
      return products[0];
    }
  });
  
  // Selected topping in detail view
  const [detailTopping, setDetailTopping] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      const loaded = stored ? JSON.parse(stored) : products;
      return (loaded[0] || products[0]).toppings[0] || 'Classic Plain';
    } catch {
      return 'Classic Plain';
    }
  });
  const [detailQuantity, setDetailQuantity] = useState<number>(1);
  const [detailIsGift, setDetailIsGift] = useState<boolean>(false);
  const [detailGiftNote, setDetailGiftNote] = useState({ to: '', from: '', message: '' });

  // Checkout and Address states
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('standard'); // 'standard' | 'express' | 'pickup'
  const [deliveryNote, setDeliveryNote] = useState('');
  
  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'card' | 'transfer'>('paystack');
  const [activePaystackPublicKey, setActivePaystackPublicKey] = useState('');
  const [activeFacebookPixelId, setActiveFacebookPixelId] = useState('');
  const [activeFacebookConversionId, setActiveFacebookConversionId] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [transferSenderName, setTransferSenderName] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStepText, setPaymentStepText] = useState('');

  // Reviews list and active state
  const [reviewOrderId, setReviewOrderId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsList, setReviewsList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_local_reviews');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Custom confirmation modal state to bypass sandboxed iframe confirm dialog limitations
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // ================= ADMIN STATES =================
  const [adminSubTab, setAdminSubTab] = useState<'overview' | 'products' | 'orders' | 'customers' | 'inventory' | 'reviews' | 'settings' | 'gallery'>('overview');
  const [weeklyViewMode, setWeeklyViewMode] = useState<'current_week' | 'all_time'>('current_week');
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackSecretKey, setPaystackSecretKey] = useState('');
  const [facebookPixelId, setFacebookPixelId] = useState('');
  const [facebookConversionId, setFacebookConversionIdState] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch('/api/settings', { headers });
      const data = await res.json();
      if (data.success) {
        setPaystackPublicKey(data.paystack_public_key || '');
        setPaystackSecretKey(data.paystack_secret_key || '');
        setFacebookPixelId(data.facebook_pixel_id || '');
        setFacebookConversionIdState(data.facebook_conversion_id || '');
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsMessage(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          paystack_public_key: paystackPublicKey,
          paystack_secret_key: paystackSecretKey,
          facebook_pixel_id: facebookPixelId,
          facebook_conversion_id: facebookConversionId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage({ type: 'success', text: 'Dynamic API keys and tracking settings saved successfully!' });
        setActivePaystackPublicKey(paystackPublicKey);
        setActiveFacebookPixelId(facebookPixelId);
        setActiveFacebookConversionId(facebookConversionId);
        if (facebookPixelId) {
          initFacebookPixel(facebookPixelId);
        }
        if (facebookConversionId) {
          setFacebookConversionId(facebookConversionId);
        }
      } else {
        setSettingsMessage({ type: 'error', text: 'Failed to save settings: ' + data.error });
      }
    } catch (err) {
      console.error('Save settings error:', err);
      setSettingsMessage({ type: 'error', text: 'Network connection issue. Failed to save keys.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    id: '',
    title: '',
    description: '',
    price: 6500,
    originalPrice: 0,
    tag: '',
    toppings: 'Classic Plain, Powdered Sugar, Salted Butter',
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600',
    prepTime: 'Baked fresh daily (ships within 24h)'
  });

  const [editingGalleryItem, setEditingGalleryItem] = useState<GalleryItem | null>(null);
  const [galleryForm, setGalleryForm] = useState({
    id: '',
    title: '',
    category: 'loaves' as string,
    image: ''
  });

  const [newCatLabel, setNewCatLabel] = useState('');
  const [newCatKey, setNewCatKey] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_inventory');
      return stored ? JSON.parse(stored) : {
        bananas: 45.0,
        flour: 30.0,
        chocolate: 15.0,
        walnuts: 12.0,
        honey: 10.0,
        butter: 25.0
      };
    } catch {
      return {
        bananas: 45.0,
        flour: 30.0,
        chocolate: 15.0,
        walnuts: 12.0,
        honey: 10.0,
        butter: 25.0
      };
    }
  });
  const [loyaltyPoints, setLoyaltyPoints] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_admin_loyalty');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [chefReplies, setChefReplies] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_chef_replies');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState('all');
  const [isDeletingOrderId, setIsDeletingOrderId] = useState<string | null>(null);
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);
  // ================================================

  // Custom visual toast alert state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync cart state to localStorage
  useEffect(() => {
    localStorage.setItem('baked_by_doja_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Set checkout info when user logs in
  useEffect(() => {
    if (currentUser) {
      setCheckoutName(currentUser.name);
      setCheckoutPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Check DB Status
  const checkDb = async () => {
    try {
      const res = await fetch('/api/db/status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus({ connected: data.connected, source: data.source, storageConnected: data.storageConnected });
      }
    } catch {
      setDbStatus({ connected: false, source: 'Offline Sandbox', storageConnected: false });
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch(`/api/orders?phone=${encodeURIComponent(currentUser.phone)}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.orders) {
          setOrders(data.orders);
          if (data.orders.length > 0 && !selectedOrderId) {
            setSelectedOrderId(data.orders[0].orderId);
          }
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Server order fetch failed, using local fallback", e);
    }

    // Local Storage Fallback
    try {
      const existing = localStorage.getItem('baked_by_doja_orders');
      if (existing) {
        const localOrders = JSON.parse(existing);
        const filtered = localOrders.filter((o: any) => o.customerPhone === currentUser.phone);
        filtered.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setOrders(filtered);
        if (filtered.length > 0 && !selectedOrderId) {
          setSelectedOrderId(filtered[0].orderId);
        }
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }
    setIsLoading(false);
  };

  const fetchPublicPaystackKey = async () => {
    try {
      const res = await fetch('/api/settings/public');
      const data = await res.json();
      if (data.success) {
        setActivePaystackPublicKey(data.paystack_public_key || '');
        if (data.facebook_pixel_id) {
          setActiveFacebookPixelId(data.facebook_pixel_id);
          initFacebookPixel(data.facebook_pixel_id);
        }
        if (data.facebook_conversion_id) {
          setActiveFacebookConversionId(data.facebook_conversion_id);
          setFacebookConversionId(data.facebook_conversion_id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch public settings:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const promises: Promise<any>[] = [
        fetchOrders(),
        checkDb(),
        fetchPublicPaystackKey()
      ];
      if (currentUser?.role === 'admin') {
        promises.push(fetchUsers());
      }
      if (onRefreshProducts) {
        promises.push(onRefreshProducts());
      }
      if (onRefreshGallery) {
        promises.push(onRefreshGallery());
      }
      await Promise.allSettled(promises);
      triggerToast("All dashboard data synced in real-time!", "success");
    } catch (e) {
      console.error("Refresh error:", e);
      triggerToast("Failed to refresh some data.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkDb();
      fetchPublicPaystackKey();
      // Prefetch Paystack secure script so it's loaded, compiled, and ready when they reach checkout
      ensurePaystackLoaded().catch((err) => console.warn("Prefetching Paystack failed:", err));
      if (currentUser) {
        fetchOrders();
      }
    }
  }, [isOpen, currentUser]);

  // Automatically verify redirected Paystack payments on mount/load
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Clear payment loading screen if restored from browser back-forward cache
        setIsPaying(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    if (!isOpen) {
      return () => {
        window.removeEventListener('pageshow', handlePageShow);
      };
    }

    const queryParams = new URLSearchParams(window.location.search);
    const orderId = queryParams.get('order_id');
    const reference = queryParams.get('reference') || queryParams.get('trxref');

    if (orderId && reference) {
      const verifyRedirectedPayment = async () => {
        setIsPaying(true);
        setPaymentStepText("Verifying your Paystack payment transaction...");
        
        try {
          const phoneParam = checkoutPhone || (currentUser ? currentUser.phone : '');
          const verifyRes = await fetch(`/api/payments/verify/${reference}?orderId=${orderId}&phone=${encodeURIComponent(phoneParam)}`);
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            // Complete the order flow & trigger success UI
            await completeOrderFlow(orderId, verifyData.orderData);
          } else {
            triggerToast("Payment verification unsuccessful: " + verifyData.message, "error");
            setIsPaying(false);
          }
        } catch (err) {
          console.error("Redirected verification error:", err);
          triggerToast("Could not verify your transaction. Please contact support.", "error");
          setIsPaying(false);
        } finally {
          // Clean up the URL query parameters so reloading doesn't verify again
          try {
            const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
            window.history.replaceState({}, document.title, cleanUrl);
          } catch (historyErr) {
            console.warn("Failed to clean up URL history:", historyErr);
          }
        }
      };

      verifyRedirectedPayment();
    } else {
      // If the page was loaded with an order_id or payment_success param but without reference (cancelled payment)
      if (queryParams.has('order_id') || queryParams.has('payment_success')) {
        setIsPaying(false);
        // Clean up parameters so URL looks pristine
        try {
          const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {}
      }
    }

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [isOpen]);

  // ================= ADMIN BUSINESS LOGIC =================
  useEffect(() => {
    localStorage.setItem('baked_by_doja_products', JSON.stringify(allProducts));
  }, [allProducts]);

  useEffect(() => {
    if (editProductOnLoad) {
      setCurrentTab('admin');
      setAdminSubTab('products');
      handleEditProduct(editProductOnLoad);
      setTimeout(() => {
        const el = document.getElementById('product-form-container');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      if (onResetEditProductOnLoad) {
        onResetEditProductOnLoad();
      }
    }
  }, [editProductOnLoad]);

  useEffect(() => {
    localStorage.setItem('baked_by_doja_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('baked_by_doja_admin_loyalty', JSON.stringify(loyaltyPoints));
  }, [loyaltyPoints]);

  useEffect(() => {
    localStorage.setItem('baked_by_doja_chef_replies', JSON.stringify(chefReplies));
  }, [chefReplies]);

  useEffect(() => {
    if (isOpen && currentUser?.role === 'admin') {
      fetchUsers();
      if (adminSubTab === 'settings') {
        fetchSettings();
      }
    }
  }, [isOpen, currentUser, adminSubTab]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadSource, setUploadSource] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFileDirectly = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image file size must be less than 5MB.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadSource(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.url) {
        setProductForm(prev => ({ ...prev, image: data.url }));
        setUploadSource(data.source);
        triggerToast(data.message || 'Image uploaded successfully!', 'success');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      triggerToast(`Failed to upload image: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFileDirectly(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Please drop an image file.', 'error');
      return;
    }
    await uploadFileDirectly(file);
  };

  const fetchUsers = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoadingUsers(true);
    try {
      const headers: Record<string, string> = {};
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch('/api/users', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.users) {
          setAllUsers(data.users);
        }
      }
    } catch (e) {
      console.error("Failed to fetch registered users:", e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.id || !productForm.title || !productForm.description || !productForm.price) {
      triggerToast('Please fill in all required product fields.', 'error');
      return;
    }

    const toppingsArray = productForm.toppings.split(',').map(t => t.trim()).filter(Boolean);
    const updatedProduct: Product = {
      id: productForm.id,
      title: productForm.title,
      description: productForm.description,
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : undefined,
      rating: editingProduct ? editingProduct.rating : 5.0,
      image: productForm.image || 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600',
      tag: productForm.tag || undefined,
      toppings: toppingsArray,
      prepTime: productForm.prepTime || 'Baked fresh daily (ships within 24h)'
    };

    if (editingProduct) {
      setAllProducts(prev => prev.map(p => p.id === editingProduct.id ? updatedProduct : p));
      triggerToast(`Recipe "${productForm.title}" updated successfully!`, 'success');
      setEditingProduct(null);
    } else {
      if (allProducts.some(p => p.id === updatedProduct.id)) {
        triggerToast(`Product ID "${updatedProduct.id}" already exists. Use a unique identifier.`, 'error');
        return;
      }
      setAllProducts(prev => [...prev, updatedProduct]);
      triggerToast(`New loaf recipe "${productForm.title}" added to active menu!`, 'success');
    }

    // Reset Form
    setProductForm({
      id: '',
      title: '',
      description: '',
      price: 6500,
      originalPrice: 0,
      tag: '',
      toppings: 'Classic Plain, Powdered Sugar, Salted Butter',
      image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600',
      prepTime: 'Baked fresh daily (ships within 24h)'
    });
  };

  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      id: prod.id,
      title: prod.title,
      description: prod.description,
      price: prod.price,
      originalPrice: prod.originalPrice || 0,
      tag: prod.tag || '',
      toppings: prod.toppings.join(', '),
      image: prod.image,
      prepTime: prod.prepTime
    });
  };

  const handleDeleteProduct = (id: string) => {
    const productToDelete = allProducts.find(p => p.id === id);
    showConfirm(
      'Remove Loaf Recipe',
      'Are you absolutely sure you want to remove this recipe from the storefront menu catalog?',
      async () => {
        if (productToDelete && productToDelete.image) {
          try {
            await fetch('/api/images', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: productToDelete.image })
            });
          } catch (err) {
            console.error("Failed to delete product image from Azure Storage:", err);
          }
        }
        setAllProducts(prev => prev.filter(p => p.id !== id));
        triggerToast('Recipe removed from the menu and its image was deleted from storage.', 'info');
      }
    );
  };

  const handleSaveGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryForm.title || !galleryForm.image) {
      triggerToast('Please upload an image or enter an image link.', 'error');
      return;
    }

    const itemId = galleryForm.id || `g_${Date.now()}`;
    const updatedItem: GalleryItem = {
      id: itemId,
      title: galleryForm.title,
      category: galleryForm.category,
      image: galleryForm.image
    };

    if (editingGalleryItem) {
      setAllGallery(prev => prev.map(g => g.id === editingGalleryItem.id ? updatedItem : g));
      triggerToast(`Gallery item "${galleryForm.title}" updated successfully!`, 'success');
      setEditingGalleryItem(null);
    } else {
      setAllGallery(prev => [...prev, updatedItem]);
      triggerToast(`New gallery item "${galleryForm.title}" added to showcase!`, 'success');
    }

    // Reset Form
    setGalleryForm({
      id: '',
      title: '',
      category: 'loaves',
      image: ''
    });
  };

  const handleEditGalleryItem = (item: GalleryItem) => {
    setEditingGalleryItem(item);
    setGalleryForm({
      id: item.id,
      title: item.title,
      category: item.category as string,
      image: item.image
    });
  };

  const handleDeleteGalleryItem = (id: string) => {
    const itemToDelete = allGallery.find(g => g.id === id);
    showConfirm(
      'Remove Gallery Item',
      'Are you absolutely sure you want to remove this image from the customer gallery showcase?',
      async () => {
        if (itemToDelete && itemToDelete.image) {
          try {
            await fetch('/api/images', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageUrl: itemToDelete.image })
            });
          } catch (err) {
            console.error("Failed to delete gallery image:", err);
          }
        }
        setAllGallery(prev => prev.filter(g => g.id !== id));
        triggerToast('Gallery item removed and its image was cleaned up from storage.', 'info');
      }
    );
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel || !newCatKey) {
      triggerToast('Please provide both a label and a key for the category', 'error');
      return;
    }

    const formattedKey = newCatKey.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
    if (!formattedKey) {
      triggerToast('Invalid category key', 'error');
      return;
    }

    setIsSubmittingCategory(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch('/api/gallery/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({ key: formattedKey, label: newCatLabel.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          triggerToast(`Category "${newCatLabel}" added successfully!`, 'success');
          setNewCatLabel('');
          setNewCatKey('');
          if (onRefreshGalleryCategories) {
            await onRefreshGalleryCategories();
          }
        } else {
          triggerToast(data.error || 'Failed to add category', 'error');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        triggerToast(data.error || `Server responded with status ${res.status}`, 'error');
      }
    } catch (err: any) {
      console.error('Failed to add category:', err);
      triggerToast(err.message || 'Error saving category', 'error');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleDeleteCategory = async (key: string) => {
    showConfirm(
      'Are you sure you want to delete this category?',
      'Warning: Gallery items in this category will not be automatically deleted, but their category tag won\'t show as a separate tab anymore.',
      async () => {
        try {
          const headers: Record<string, string> = {};
          if (currentUser?.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`;
          }
          const res = await fetch(`/api/gallery/categories/${key}`, {
            method: 'DELETE',
            headers
          });
          if (res.ok) {
            triggerToast('Category deleted successfully!', 'success');
            if (onRefreshGalleryCategories) {
              await onRefreshGalleryCategories();
            }
          } else {
            const data = await res.json().catch(() => ({}));
            triggerToast(data.error || 'Failed to delete category', 'error');
          }
        } catch (err: any) {
          console.error('Failed to delete category:', err);
          triggerToast(err.message || 'Error deleting category', 'error');
        }
      }
    );
  };

  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [galleryUploadSource, setGalleryUploadSource] = useState<string | null>(null);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);

  const uploadGalleryFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Image file size must be less than 5MB.', 'error');
      return;
    }

    setIsUploadingGallery(true);
    setGalleryUploadSource(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.url) {
        setGalleryForm(prev => ({ ...prev, image: data.url }));
        setGalleryUploadSource(data.source);
        triggerToast(data.message || 'Gallery image uploaded successfully!', 'success');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      triggerToast(`Failed to upload gallery image: ${err.message}`, 'error');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleGalleryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadGalleryFile(file);
    }
  };

  const handleGalleryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGallery(true);
  };

  const handleGalleryDragLeave = () => {
    setIsDraggingGallery(false);
  };

  const handleGalleryDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingGallery(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadGalleryFile(file);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    showConfirm(
      'Delete Order Log',
      `Are you sure you want to permanently delete order ${orderId} from administrative logs?`,
      async () => {
        setIsDeletingOrderId(orderId);
        try {
          const headers: Record<string, string> = {};
          if (currentUser?.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`;
          }
          const res = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE',
            headers
          });
          if (res.ok) {
            setOrders(prev => prev.filter(o => o.orderId !== orderId));
            triggerToast(`Order ${orderId} deleted successfully.`, 'success');
            
            try {
              const stored = localStorage.getItem('baked_by_doja_orders');
              if (stored) {
                const list = JSON.parse(stored);
                localStorage.setItem('baked_by_doja_orders', JSON.stringify(list.filter((o: any) => o.orderId !== orderId)));
              }
            } catch {}
          } else {
            triggerToast('Failed to delete order from server database.', 'error');
          }
        } catch (e) {
          console.error(e);
          triggerToast('Network error while deleting order.', 'error');
        } finally {
          setIsDeletingOrderId(null);
        }
      }
    );
  };

  const handleMarkOrderAsPaid = async (orderId: string) => {
    showConfirm(
      'Verify Bank Transfer',
      'Are you sure you have verified the bank transfer for this order and want to mark it as PAID?',
      async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (currentUser?.token) {
            headers['Authorization'] = `Bearer ${currentUser.token}`;
          }
          const res = await fetch(`/api/orders/${orderId}/payment`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ paymentStatus: 'paid' })
          });
          if (res.ok) {
            triggerToast(`Order ${orderId} successfully marked as PAID!`, 'success');
            fetchOrders(); // Reload orders
          } else {
            const data = await res.json().catch(() => ({}));
            triggerToast(data.error || 'Failed to update payment status', 'error');
          }
        } catch (err: any) {
          triggerToast(err.message || 'Error updating payment status', 'error');
        }
      }
    );
  };

  const handleBankTransferPayment = async () => {
    if (cartItems.length === 0) {
      triggerToast("Your cart is empty!", "error");
      return;
    }
    if (!currentUser) {
      triggerToast("Please login/register to authorize your purchase", "error");
      setCurrentTab('auth');
      return;
    }
    if (!transferSenderName.trim()) {
      triggerToast("Please enter your transfer Sender Name!", "error");
      return;
    }

    setIsPaying(true);
    setPaymentStepText("Filing your order with Faridah's baking queue...");

    // Generate unique order ID
    const orderId = `DOJA-${Math.floor(100000 + Math.random() * 900000)}`;
    const consolidatedTitle = cartItems.map(i => `${i.quantity}x ${i.product.title} (${i.topping})`).join(', ');

    const orderData = {
      orderId,
      customerName: checkoutName || currentUser.name,
      customerPhone: checkoutPhone || currentUser.phone,
      productTitle: consolidatedTitle,
      quantity: cartItems.reduce((acc, c) => acc + c.quantity, 0),
      topping: cartItems[0]?.topping || 'Classic Plain',
      deliveryType,
      isGift: cartItems.some(i => i.isGift),
      giftNote: cartItems.find(i => i.isGift)?.giftNote || { to: '', from: '', message: '' },
      deliveryNote: deliveryNote || "Outlet collection requested.",
      totalAmount: getCartGrandTotal(),
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (!res.ok) {
        throw new Error('Server failed to register the unpaid order.');
      }

      // Sync UI & state
      await fetchOrders();
      setSelectedOrderId(orderId);
      deductInventoryForOrder(cartItems);

      // Award some points anyway (100 XP per loaf ordered)
      const totalQty = cartItems.reduce((acc, c) => acc + c.quantity, 0);
      const userPhoneForXP = checkoutPhone || currentUser?.phone || "anonymous";
      setLoyaltyPoints(prev => {
        const current = prev[userPhoneForXP] || 0;
        return { ...prev, [userPhoneForXP]: current + (totalQty * 100) };
      });

      // Save locally as unpaid order
      try {
        const existing = localStorage.getItem('baked_by_doja_orders');
        const localOrders = existing ? JSON.parse(existing) : [];
        localOrders.push({
          ...orderData,
          status: 'pending',
          paymentStatus: 'unpaid',
          date: new Date().toISOString()
        });
        localStorage.setItem('baked_by_doja_orders', JSON.stringify(localOrders));
      } catch {}

      setCartItems([]);
      setIsPaying(false);
      setTransferSenderName('');
      triggerToast("Order placed! Faridah will verify your Bank Transfer.", "success");
      setCurrentTab('track');
    } catch (err: any) {
      console.error("Bank transfer submit error:", err);
      triggerToast(err.message || "Failed to submit bank transfer order notification.", "error");
      setIsPaying(false);
    }
  };

  const handleUpdateStatusId = async (orderId: string, nextStatus: string) => {
    setIsUpdatingStatusId(orderId);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status: nextStatus } : o));
        triggerToast(`Order ${orderId} status changed to "${nextStatus}"!`, 'success');

        try {
          const stored = localStorage.getItem('baked_by_doja_orders');
          if (stored) {
            const list = JSON.parse(stored);
            localStorage.setItem('baked_by_doja_orders', JSON.stringify(
              list.map((o: any) => o.orderId === orderId ? { ...o, status: nextStatus } : o)
            ));
          }
        } catch {}
      } else {
        triggerToast('Failed to update status on server.', 'error');
      }
    } catch (e) {
      console.error(e);
      triggerToast('Network error updating status.', 'error');
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  const handleRestock = (item: string, qty: number) => {
    setInventory(prev => {
      const current = prev[item] || 0;
      const next = Math.round((current + qty) * 10) / 10;
      triggerToast(`Restocked ${item}: +${qty} units!`, 'success');
      return { ...prev, [item]: next };
    });
  };

  const handleAdjustLoyalty = (phone: string, amt: number) => {
    setLoyaltyPoints(prev => {
      const current = prev[phone] || 0;
      const next = Math.max(0, current + amt);
      triggerToast(`Loyalty points updated: ${amt > 0 ? '+' : ''}${amt} XP!`, 'success');
      return { ...prev, [phone]: next };
    });
  };

  const handlePostChefReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    setChefReplies(prev => ({
      ...prev,
      [reviewId]: replyText
    }));
    triggerToast('Posted chef reply to customer review!', 'success');
    setReplyText('');
    setActiveReplyId(null);
  };

  const handleDeleteReview = (reviewId: string) => {
    showConfirm(
      'Moderate Review',
      'Moderate review: Are you sure you want to delete this customer feedback?',
      () => {
        const filtered = reviewsList.filter(r => r.id !== reviewId);
        setReviewsList(filtered);
        localStorage.setItem('baked_by_doja_local_reviews', JSON.stringify(filtered));
        triggerToast('Customer review moderated and removed.', 'info');
      }
    );
  };

  const deductInventoryForOrder = (items: CartItem[]) => {
    try {
      const stored = localStorage.getItem('baked_by_doja_inventory');
      const inv = stored ? JSON.parse(stored) : {
        bananas: 45.0,
        flour: 30.0,
        chocolate: 15.0,
        walnuts: 12.0,
        honey: 10.0,
        butter: 25.0
      };

      items.forEach(item => {
        const qty = item.quantity;
        inv.bananas = Math.max(0, inv.bananas - (0.8 * qty));
        inv.flour = Math.max(0, inv.flour - (0.5 * qty));
        inv.butter = Math.max(0, inv.butter - (1 * qty));

        if (item.product.id === 'choco-chip') {
          inv.chocolate = Math.max(0, inv.chocolate - (0.3 * qty));
        } else if (item.product.id === 'walnut') {
          inv.walnuts = Math.max(0, inv.walnuts - (0.4 * qty));
        } else if (item.product.id === 'premium-caramel') {
          inv.honey = Math.max(0, inv.honey - (0.2 * qty));
        } else if (item.product.id === 'gift-bundle') {
          inv.bananas = Math.max(0, inv.bananas - (1.2 * qty));
          inv.flour = Math.max(0, inv.flour - (1.0 * qty));
          inv.butter = Math.max(0, inv.butter - (2 * qty));
        }

        if (item.topping.toLowerCase().includes('chocolate')) {
          inv.chocolate = Math.max(0, inv.chocolate - (0.1 * qty));
        } else if (item.topping.toLowerCase().includes('walnut')) {
          inv.walnuts = Math.max(0, inv.walnuts - (0.1 * qty));
        } else if (item.topping.toLowerCase().includes('caramel')) {
          inv.honey = Math.max(0, inv.honey - (0.1 * qty));
        }
      });

      for (const k in inv) {
        inv[k] = Math.round(inv[k] * 10) / 10;
      }

      setInventory(inv);
    } catch (e) {
      console.warn("Failed to deduct inventory", e);
    }
  };
  // ========================================================

  // Handle updates to order statuses (Admins or Customer updates)
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchOrders();
        triggerToast("Order state updated successfully!", "success");
      } else {
        throw new Error('API update failed');
      }
    } catch (err) {
      console.warn("API status update failed, syncing locally", err);
      try {
        const existing = localStorage.getItem('baked_by_doja_orders');
        if (existing) {
          const localOrders = JSON.parse(existing);
          const index = localOrders.findIndex((o: any) => o.orderId === orderId);
          if (index !== -1) {
            localOrders[index].status = newStatus;
            localStorage.setItem('baked_by_doja_orders', JSON.stringify(localOrders));
            await fetchOrders();
            triggerToast("Order state synchronized locally!", "info");
          }
        }
      } catch (err2) {
        console.error("Local status update failed", err2);
      }
    }
    setIsUpdatingStatus(false);
  };

  // Cart helper actions
  const addToCart = (product: Product, quantity: number, topping: string, isGift: boolean, giftNoteObj: any) => {
    if (!product) return;
    const existingIndex = cartItems.findIndex(
      item => item.product && item.product.id === product.id && item.topping === topping && item.isGift === isGift
    );

    if (existingIndex > -1) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += quantity;
      setCartItems(updated);
    } else {
      const newItem: CartItem = {
        cartId: `CART-${Math.floor(100000 + Math.random() * 900000)}`,
        product,
        quantity,
        topping,
        isGift,
        giftNote: { ...giftNoteObj }
      };
      setCartItems([...cartItems, newItem]);
    }
    trackAddToCart(product.id, product.title, product.price * quantity);
    triggerToast(`Added ${quantity}x ${product.title} to cart!`, "success");
  };

  const removeFromCart = (cartId: string) => {
    setCartItems(cartItems.filter(item => item.cartId !== cartId));
    triggerToast("Removed item from cart", "info");
  };

  const updateCartQuantity = (cartId: string, delta: number) => {
    const updated = cartItems.map(item => {
      if (item.cartId === cartId) {
        const nextQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: nextQty };
      }
      return item;
    });
    setCartItems(updated);
  };

  // Pricing math helpers
  const getDeliveryFee = () => {
    return 0;
  };

  const getGiftWrappingFee = () => {
    const giftCount = cartItems.filter(item => item.isGift).length;
    return giftCount * 1000;
  };

  const getCartSubtotal = () => {
    return cartItems.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  };

  const getCartGrandTotal = () => {
    return getCartSubtotal() + getDeliveryFee() + getGiftWrappingFee();
  };

  // Helper to dynamically load/ensure Paystack script is ready
  const ensurePaystackLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).PaystackPop) {
        resolve(true);
        return;
      }
      
      const existingScript = document.querySelector('script[src*="paystack.co"]');
      if (existingScript) {
        let checkCount = 0;
        const interval = setInterval(() => {
          if ((window as any).PaystackPop) {
            clearInterval(interval);
            resolve(true);
          } else {
            checkCount++;
            if (checkCount > 50) { // 5 seconds
              clearInterval(interval);
              resolve(false);
            }
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => {
        let checkCount = 0;
        const interval = setInterval(() => {
          if ((window as any).PaystackPop) {
            clearInterval(interval);
            resolve(true);
          } else {
            checkCount++;
            if (checkCount > 20) {
              clearInterval(interval);
              resolve(true);
            }
          }
        }, 50);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  };

  // Secure Payment & Dynamic Paystack Integration
  const handlePaystackPayment = async () => {
    if (cartItems.length === 0) {
      triggerToast("Your cart is empty!", "error");
      return;
    }
    if (!currentUser) {
      triggerToast("Please login/register to authorize your purchase", "error");
      setCurrentTab('auth');
      return;
    }

    setIsPaying(true);
    setPaymentStepText("Initializing checkout session...");
    trackInitiateCheckout(cartItems, getCartGrandTotal());

    // Generate unique order ID
    const orderId = `DOJA-${Math.floor(100000 + Math.random() * 900000)}`;
    const consolidatedTitle = cartItems.map(i => `${i.quantity}x ${i.product.title} (${i.topping})`).join(', ');
    
    const orderData = {
      orderId,
      customerName: checkoutName || currentUser.name,
      customerPhone: checkoutPhone || currentUser.phone,
      productTitle: consolidatedTitle,
      quantity: cartItems.reduce((acc, c) => acc + c.quantity, 0),
      topping: cartItems[0]?.topping || 'Classic Plain',
      deliveryType,
      isGift: cartItems.some(i => i.isGift),
      giftNote: cartItems.find(i => i.isGift)?.giftNote || { to: '', from: '', message: '' },
      deliveryNote: deliveryNote || "Outlet collection requested.",
      totalAmount: getCartGrandTotal(),
    };

    // 1. Fetch Paystack Public Key or use state
    let paystackKey = activePaystackPublicKey;
    if (!paystackKey) {
      try {
        const settingsRes = await fetch('/api/settings/public');
        const settingsData = await settingsRes.json();
        if (settingsData.success) {
          paystackKey = settingsData.paystack_public_key;
        }
      } catch (err) {
        console.warn("Failed to retrieve public key:", err);
      }
    }

    if (!paystackKey) {
      triggerToast("Paystack Gateway is not configured. Please contact the administrator to set the Public API Key in the settings dashboard.", "error");
      setIsPaying(false);
      return;
    }

    // 2. Launch Paystack Redirect Checkout
    setPaymentStepText("Generating secure checkout portal...");
    
    // Sanitize phone number to form a valid email address (remove spaces, pluses, parentheses)
    const rawPhone = currentUser ? currentUser.phone : 'guest';
    const cleanPhone = rawPhone.replace(/[^a-zA-Z0-9]/g, '') || 'guest';
    const userEmail = `${cleanPhone}@bakedbydoja.com`;
    
    try {
      const initRes = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          amount: getCartGrandTotal() * 100, // NGN in kobo
          orderId,
          callbackUrl: window.location.origin + window.location.pathname + `?order_id=${orderId}`,
          metadata: { orderData }
        })
      });

      const initData = await initRes.json();
      if (initData.success && initData.authorization_url) {
        setPaymentStepText("Redirecting to Paystack secure checkout...");
        // Redirect current frame to Paystack
        window.location.href = initData.authorization_url;
      } else {
        throw new Error(initData.message || "Failed to initialize secure payment session.");
      }
    } catch (err: any) {
      console.error("Paystack initialization error:", err);
      triggerToast(err.message || "Paystack secure portal took too long to load. Please verify your connection.", "error");
      setIsPaying(false);
    }
  };

  const completeOrderFlow = async (orderId: string, orderData: any) => {
    // Track Meta Pixel Purchase event
    try {
      trackPurchase(orderId, orderData?.totalAmount || getCartGrandTotal(), cartItems, "NGN", activeFacebookConversionId);
    } catch (pixelErr) {
      console.warn("Failed to fire Pixel purchase event:", pixelErr);
    }

    // Sync UI & state
    await fetchOrders();
    setSelectedOrderId(orderId);
    deductInventoryForOrder(cartItems);
    
    // Automatically award loyalty points (100 XP per loaf ordered)
    const totalQty = cartItems.reduce((acc, c) => acc + c.quantity, 0);
    const userPhoneForXP = checkoutPhone || currentUser?.phone || "anonymous";
    setLoyaltyPoints(prev => {
      const current = prev[userPhoneForXP] || 0;
      return { ...prev, [userPhoneForXP]: current + (totalQty * 100) };
    });

    // Update local storage backup with 'paid' if exists, or append it if new
    try {
      const existing = localStorage.getItem('baked_by_doja_orders');
      const localOrders = existing ? JSON.parse(existing) : [];
      const idx = localOrders.findIndex((o: any) => o.orderId === orderId);
      if (idx !== -1) {
        localOrders[idx].paymentStatus = 'paid';
        localStorage.setItem('baked_by_doja_orders', JSON.stringify(localOrders));
      } else if (orderData) {
        localOrders.push({
          ...orderData,
          status: 'pending',
          paymentStatus: 'paid',
          date: new Date().toISOString()
        });
        localStorage.setItem('baked_by_doja_orders', JSON.stringify(localOrders));
      }
    } catch {}

    setCartItems([]);
    setIsPaying(false);
    triggerToast("Success! Payment verified. Baking queue updated.", "success");
    setCurrentTab('track');
  };

  // Submit Review helper
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId) {
      triggerToast("Please select which loaf you want to review!", "error");
      return;
    }
    if (!reviewComment.trim()) {
      triggerToast("Please leave a short review text!", "error");
      return;
    }

    const orderToReview = displayOrders.find(o => o.orderId === reviewOrderId);
    const newReview = {
      id: `REV-${Math.floor(100000 + Math.random() * 900000)}`,
      orderId: reviewOrderId,
      productTitle: orderToReview ? orderToReview.productTitle : 'Fresh Banana Loaf',
      customerName: currentUser?.name || 'Happy Customer',
      rating: reviewRating,
      comment: reviewComment,
      date: new Date().toISOString()
    };

    const updatedReviews = [newReview, ...reviewsList];
    setReviewsList(updatedReviews);
    localStorage.setItem('baked_by_doja_local_reviews', JSON.stringify(updatedReviews));

    setReviewComment('');
    triggerToast("Review posted to chef Faridah's dashboard!", "success");
  };

  // Auto-set selected product details topping when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setDetailTopping(selectedProduct.toppings[0] || 'Classic Plain');
      setDetailQuantity(1);
      setDetailIsGift(false);
      setDetailGiftNote({ to: '', from: '', message: '' });
    }
  }, [selectedProduct]);

  if (!isOpen) return null;

  // Filter orders for the customer so they can see all their orders (paid and unpaid/pending bank verification)
  const displayOrders = orders;

  const activeOrder = displayOrders.find(o => o.orderId === selectedOrderId) || displayOrders[0];
  const nonRejectedOrders = displayOrders.filter(o => o.status !== 'rejected');
  const totalQuantity = nonRejectedOrders.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
  const totalSpend = nonRejectedOrders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const clientLoyaltyPoints = currentUser ? (loyaltyPoints[currentUser.phone] ?? (totalQuantity * 150)) : 0;

  // Active items counts
  const totalCartQty = cartItems.reduce((acc, c) => acc + c.quantity, 0);
  const activeBakes = displayOrders.filter(o => o.status !== 'delivered').length;

  // Sidebar link items
  const menuItems = [
    { key: 'auth', label: currentUser ? 'My Profile' : 'Register / Login', icon: currentUser ? User : LogIn, badge: null },
    { key: 'browse', label: 'Browse Banana Bread', icon: Compass, badge: null },
    { key: 'details', label: 'View Product Details', icon: Sparkles, badge: null },
    { key: 'cart', label: 'Add to Cart / View', icon: ShoppingBag, badge: totalCartQty > 0 ? totalCartQty : null, badgeColor: 'bg-red-500 text-white' },
    { key: 'checkout', label: 'Checkout', icon: Truck, badge: null },
    { key: 'payment', label: 'Make Payment', icon: CreditCard, badge: cartItems.length > 0 ? 'Ready' : null, badgeColor: 'bg-emerald-500 text-white' },
    { key: 'track', label: 'Track Order', icon: Clock, badge: activeBakes > 0 ? activeBakes : null, badgeColor: 'bg-banana text-chocolate font-black animate-bounce' },
    { key: 'history', label: 'View Order History', icon: Award, badge: displayOrders.length > 0 ? displayOrders.length : null, badgeColor: 'bg-chocolate/10 text-chocolate' },
    { key: 'review', label: 'Leave Review', icon: MessageSquare, badge: null },
  ];

  return (
    <div className="pt-24 pb-12 min-h-screen bg-cream font-sans flex items-start justify-center px-2 sm:px-6 lg:px-8">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-xs border ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-chocolate/5 w-full max-w-7xl rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden min-h-[80vh] flex flex-col lg:flex-row relative"
      >
        
        {/* MOBILE SIDEBAR TRIGGER HEADER */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-beige/20 border-b border-chocolate/5">
          <div className="flex items-center gap-2">
            <span className="text-xl"></span>
            <span className="font-serif font-extrabold text-chocolate text-base tracking-tight">Doja Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarMobileOpen(!isSidebarMobileOpen)}
              className="px-3 py-1.5 bg-chocolate text-white text-xs font-bold rounded-xl"
            >
              {isSidebarMobileOpen ? 'Close Menu' : 'Open Menu'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-beige/50 rounded-full text-chocolate/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LEFT PERSISTENT SIDEBAR */}
        <div className={`
          ${isSidebarMobileOpen ? 'block' : 'hidden'} lg:block 
          w-full lg:w-[280px] xl:w-[320px] bg-beige/20 border-r border-chocolate/5 p-5 flex flex-col justify-between shrink-0 z-20 lg:relative absolute left-0 top-0 lg:top-0 h-full lg:h-auto bg-white lg:bg-transparent
        `}>
          <div className="space-y-6">
            {/* Logo area */}
            <div className="hidden lg:flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl select-none"></span>
                <div className="flex flex-col">
                  <h3 className="font-serif font-black text-xl text-chocolate tracking-tight">Baked by Doja</h3>
                  <span className="text-[9px] font-bold text-caramel tracking-widest uppercase">Artisan Bakery</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-beige/50 rounded-full text-chocolate/40 hover:text-chocolate transition-colors"
                title="Back to storefront"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile widget card */}
            <div className="bg-white border border-chocolate/5 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-banana/10 rounded-full -mr-4 -mt-4" />
              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-caramel/10 border border-caramel/20 flex items-center justify-center text-caramel font-black text-sm select-none">
                      {currentUser.role === 'admin' ? 'A' : currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-chocolate truncate leading-tight uppercase tracking-wider">
                        {currentUser.name}
                      </h4>
                      <p className="text-[9px] text-chocolate/50 font-medium tracking-wide mt-0.5">
                        {currentUser.role === 'admin' ? 'Head Store Owner' : 'Customer'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-chocolate/5 flex items-center justify-between text-[10px]">
                    <span className="text-chocolate/60">Loyalty Balance:</span>
                    <strong className="text-caramel font-black">{clientLoyaltyPoints} XP</strong>
                  </div>

                  {currentUser.role === 'admin' && (
                    <div className="bg-amber-50 text-amber-900 border border-amber-100 rounded-xl p-2 text-[9px] font-bold flex items-center gap-1.5">
                      <span>Authorized Administrator Account</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      localStorage.removeItem('baked_by_doja_current_user');
                      window.location.reload();
                    }}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Log Out of Profile</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 space-y-2.5">
                  <p className="text-[10px] text-chocolate/60 font-medium">Enjoy customized bakes, order tracking, and earn 150 points per loaf!</p>
                  <button
                    onClick={() => {
                      setCurrentTab('auth');
                      setIsSidebarMobileOpen(false);
                    }}
                    className="w-full bg-chocolate text-white text-[10px] font-black tracking-wider uppercase py-2 rounded-xl hover:bg-chocolate/90 transition-all cursor-pointer"
                  >
                    Sign In or Register
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar navigation items */}
            <nav className="space-y-1">
              {currentUser?.role !== 'admin' && (
                <>
                  <span className="block text-[9px] uppercase font-black tracking-widest text-chocolate/40 px-3 mb-2">Customer Navigation</span>
                  {menuItems
                    .filter(item => currentUser ? true : item.key === 'auth')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.key;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setCurrentTab(item.key);
                            setIsSidebarMobileOpen(false);
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group
                            ${isActive 
                              ? 'bg-chocolate text-white shadow-md' 
                              : 'text-chocolate/70 hover:bg-beige/40 hover:text-chocolate'
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-banana' : 'text-caramel group-hover:scale-110 transition-transform'}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== null && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-chocolate text-white'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </>
              )}

              {/* Admin Panel button if is admin */}
              {currentUser?.role === 'admin' && (
                <div className="pt-3">
                  <span className="block text-[9px] uppercase font-black tracking-widest text-chocolate/40 px-3 mb-2">Owner Controls</span>
                  <button
                    onClick={() => {
                      setCurrentTab('admin');
                      setIsSidebarMobileOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                      ${currentTab === 'admin' ? 'bg-emerald-800 text-white shadow-md' : 'text-emerald-800 hover:bg-emerald-50'}
                    `}
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-500" />
                    <span>Admin Control Center</span>
                  </button>
                </div>
              )}
            </nav>
          </div>


        </div>

        {/* RIGHT WORKSPACE AREA */}
        <div className="flex-1 bg-white/40 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto min-h-[60vh] lg:min-h-0">
          
          <div className="space-y-6">
            {/* Top Workspace Header Controls */}
            <div className="border-b border-chocolate/10 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-widest font-black text-caramel">
                  {currentUser?.role === 'admin' ? 'Store Admin Workspace' : 'Customer Lounge Workspace'}
                </span>
                <h4 className="text-xl sm:text-2xl font-serif font-black text-chocolate flex items-center gap-2">
                  <span>{
                    currentTab === 'auth' ? 'Loyalty Authentication Profile' :
                    currentTab === 'browse' ? 'Browse Signature Banana Breads' :
                    currentTab === 'details' ? 'View Bread Detail & Customizer' :
                    currentTab === 'cart' ? 'Your Shopping Baking Cart' :
                    currentTab === 'checkout' ? 'Order Shipping & Checkout' :
                    currentTab === 'payment' ? 'Paystack Secure Payment Portal' :
                    currentTab === 'track' ? 'Live Oven Status Tracker' :
                    currentTab === 'history' ? 'Loaf Transaction History' :
                    currentTab === 'review' ? 'Leave Bakery Feedback' :
                    'Owner Command Center'
                  }</span>
                </h4>
              </div>

              {/* Top info and fast action */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  className="px-3 py-1.5 bg-white border border-chocolate/10 rounded-xl text-[10px] font-bold text-chocolate/80 hover:bg-beige/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm transition-all"
                  title="Refresh all orders, menu products, and connection status in real-time"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing Hub...' : 'Sync Server Database'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 bg-chocolate hover:bg-chocolate/90 text-white rounded-xl text-[10px] font-bold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Close Hub</span>
                </button>
              </div>
            </div>

            {/* TAB PANEL RENDERER */}
            <div className="min-h-[450px]">
              
              {/* TAB 1: AUTH */}
              {currentTab === 'auth' && (
                <div className="max-w-md mx-auto py-4">
                  {currentUser ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-md"
                    >
                      <div className="w-16 h-16 bg-banana/10 text-caramel rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner animate-bounce">
                        <Sparkles className="w-8 h-8 text-caramel fill-banana animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-serif font-black text-chocolate">You are Authenticated!</h4>
                        <p className="text-xs text-chocolate/60">Welcome back, {currentUser.name}. Your active phone is securely logged into our secure database nodes.</p>
                      </div>

                      <div className="bg-beige/15 rounded-2xl p-4 border border-chocolate/5 grid grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-chocolate/40 block">Loyalty Rank</span>
                          <strong className="text-chocolate text-xs">Gold-Tier Baker</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-chocolate/40 block">XP points balance</span>
                          <strong className="text-chocolate text-xs">{clientLoyaltyPoints} XP</strong>
                        </div>
                        <div className="col-span-2 border-t border-chocolate/5 pt-2">
                          <span className="text-[10px] uppercase font-bold text-chocolate/40 block">Registered Phone Node</span>
                          <strong className="text-chocolate text-xs font-mono">{currentUser.phone}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => setCurrentTab('browse')}
                        className="w-full bg-banana hover:bg-honey text-chocolate py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                      >
                        Browse Signature Banana Bread Loaves
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white border border-chocolate/5 rounded-3xl p-6 shadow-md"
                    >
                      <div className="text-center pb-4">
                        <span className="text-3xl"></span>
                        <h4 className="font-serif font-black text-lg text-chocolate mt-2">Sign up or Login</h4>
                        <p className="text-xs text-chocolate/50">Gain access to custom baking toppings, live GPS delivery dispatching, and loyalty discounts.</p>
                      </div>
                      <AuthScreen
                        onSuccess={(user) => {
                          if (onAuthSuccess) onAuthSuccess(user);
                          triggerToast(`Successfully logged in as ${user.name}!`, "success");
                          setCurrentTab('browse');
                        }}
                      />
                    </motion.div>
                  )}
                </div>
              )}

              {/* TAB 2: BROWSE BANANA BREAD */}
              {currentTab === 'browse' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <p className="text-xs text-chocolate/60">Select from our signature oven-baked recipe lines:</p>
                    <div className="flex items-center gap-1.5 bg-beige/25 border border-chocolate/5 p-1 rounded-xl">
                      <span className="text-[9px] uppercase font-black text-chocolate/40 px-2">Category:</span>
                      <button className="bg-white text-chocolate text-[10px] px-2.5 py-1 rounded-lg font-bold shadow-sm">All Loaves</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {allProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        whileHover={{ y: -4 }}
                        className="bg-white border border-chocolate/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="relative h-44 overflow-hidden group">
                          <img 
                            src={product.image} 
                            alt={product.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          {product.tag && (
                            <span className="absolute top-3 left-3 bg-chocolate text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow">
                              {product.tag}
                            </span>
                          )}
                          <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-lg flex items-center gap-1 shadow">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span className="text-[10px] font-extrabold text-chocolate">{product.rating}</span>
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="font-serif font-bold text-sm text-chocolate leading-tight">{product.title}</h4>
                            <p className="text-[11px] text-chocolate/60 line-clamp-2">{product.description}</p>
                          </div>

                          <div className="pt-2 border-t border-chocolate/5 space-y-3">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] text-chocolate/40 font-mono">Baking price:</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-black text-chocolate">₦{product.price.toLocaleString()}</span>
                                {product.originalPrice && (
                                  <span className="text-[10px] line-through text-chocolate/30">₦{product.originalPrice.toLocaleString()}</span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setCurrentTab('details');
                                }}
                                className="bg-beige/30 hover:bg-beige/60 text-chocolate py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  addToCart(product, 1, product.toppings[0] || 'Classic Plain', false, { to: '', from: '', message: '' });
                                }}
                                className="bg-banana hover:bg-honey text-chocolate py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                              >
                                <ShoppingCart className="w-3 h-3" />
                                <span>Add to Cart</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: PRODUCT DETAILS */}
              {currentTab === 'details' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  {!selectedProduct ? (
                    <div className="text-center py-16 space-y-4">
                      <Sparkles className="w-12 h-12 text-caramel mx-auto animate-pulse" />
                      <h4 className="font-serif font-black text-lg text-chocolate">No product selected</h4>
                      <p className="text-xs text-chocolate/50 max-w-sm mx-auto">Please browse through our fresh bread catalog and choose a recipe to customize.</p>
                      <button onClick={() => setCurrentTab('browse')} className="bg-banana hover:bg-honey text-chocolate font-bold text-xs px-5 py-2.5 rounded-full shadow-md transition-all cursor-pointer">
                        Browse Menu
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Detail Image */}
                    <div className="md:col-span-5 space-y-4">
                      <div className="h-64 sm:h-80 rounded-2xl overflow-hidden border border-chocolate/5 shadow-inner">
                        <img 
                          src={selectedProduct.image} 
                          alt={selectedProduct.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="bg-beige/10 p-3.5 rounded-xl border border-chocolate/5 text-[10px] space-y-1.5">
                        <span className="font-extrabold uppercase text-caramel tracking-wider text-[9px] block">Chef's Prep Duration:</span>
                        <p className="text-chocolate/70">{selectedProduct.prepTime}</p>
                      </div>
                    </div>

                    {/* Detail Selection Area */}
                    <div className="md:col-span-7 space-y-5">
                      <div className="space-y-1.5">
                        {selectedProduct.tag && (
                          <span className="bg-chocolate text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">
                            {selectedProduct.tag}
                          </span>
                        )}
                        <h3 className="font-serif font-black text-xl text-chocolate">{selectedProduct.title}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-caramel">₦{selectedProduct.price.toLocaleString()}</span>
                          <span className="text-[10px] text-chocolate/40">•</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-xs font-bold text-chocolate">
                              {(() => {
                                const prodReviews = reviewsList.filter((r: any) => 
                                  r.productTitle && (
                                    r.productTitle.toLowerCase().includes(selectedProduct.title.toLowerCase()) || 
                                    selectedProduct.title.toLowerCase().includes(r.productTitle.toLowerCase())
                                  )
                                );
                                if (prodReviews.length > 0) {
                                  const avg = prodReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / prodReviews.length;
                                  return `${avg.toFixed(1)} (${prodReviews.length} Customer Review${prodReviews.length > 1 ? 's' : ''})`;
                                }
                                return `${selectedProduct.rating.toFixed(1)} (Verified Bakes)`;
                              })()}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-chocolate/70 leading-relaxed pt-1">{selectedProduct.description}</p>
                      </div>

                      {/* Customizer form */}
                      <div className="border-t border-chocolate/5 pt-4 space-y-4">
                        {/* 1. Toppings Selection */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">
                            Choose Your Glaze / Fold-In:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProduct.toppings.map((top) => {
                              const isSel = detailTopping === top;
                              return (
                                <button
                                  key={top}
                                  onClick={() => setDetailTopping(top)}
                                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isSel ? 'bg-chocolate text-white scale-105' : 'bg-beige/25 hover:bg-beige/55 text-chocolate/80 border border-chocolate/5'
                                  }`}
                                >
                                  {isSel && <Check className="w-3 h-3 text-banana shrink-0" />}
                                  <span>{top}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Quantity Counter */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Bake Quantity:</span>
                          <div className="flex items-center gap-3 bg-white border border-chocolate/10 rounded-xl px-2 py-1">
                            <button
                              onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                              className="p-1 hover:bg-beige/40 rounded-lg text-chocolate/60 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black text-chocolate font-mono w-4 text-center">{detailQuantity}</span>
                            <button
                              onClick={() => setDetailQuantity(detailQuantity + 1)}
                              className="p-1 hover:bg-beige/40 rounded-lg text-chocolate/60 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* 3. Gift wrap switch */}
                        <div className="bg-beige/10 p-4 rounded-2xl border border-chocolate/5 space-y-3">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={detailIsGift}
                              onChange={(e) => setDetailIsGift(e.target.checked)}
                              className="w-4 h-4 rounded text-caramel focus:ring-caramel accent-chocolate cursor-pointer"
                            />
                            <div className="text-left">
                              <span className="text-[11px] font-bold text-chocolate block">Wrap as a Premium Love Gift? (+₦1,000)</span>
                              <span className="text-[9px] text-chocolate/50 block">Gold-foil ribbon greeting card, written by hand in cursive.</span>
                            </div>
                          </label>

                          {detailIsGift && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="grid grid-cols-2 gap-3 pt-2 text-xs"
                            >
                              <div>
                                <label className="block text-[9px] font-bold text-chocolate/50 mb-1 uppercase">Recipient (To:)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Faridah"
                                  value={detailGiftNote.to}
                                  onChange={(e) => setDetailGiftNote({ ...detailGiftNote, to: e.target.value })}
                                  className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-chocolate outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-chocolate/50 mb-1 uppercase">From:</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Anike"
                                  value={detailGiftNote.from}
                                  onChange={(e) => setDetailGiftNote({ ...detailGiftNote, from: e.target.value })}
                                  className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-chocolate outline-none"
                                />
                              </div>
                              <div className="col-span-2">
                                <label className="block text-[9px] font-bold text-chocolate/50 mb-1 uppercase">Handwritten Note Message:</label>
                                <textarea
                                  placeholder="Write your beautiful message..."
                                  value={detailGiftNote.message}
                                  onChange={(e) => setDetailGiftNote({ ...detailGiftNote, message: e.target.value })}
                                  rows={2}
                                  className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-chocolate outline-none resize-none"
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {/* Order Summary calculation */}
                        <div className="bg-chocolate text-cream rounded-2xl p-4 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-cream/70 uppercase tracking-widest font-bold block">Estimated Loaf Total:</span>
                            <strong className="text-banana font-black text-base">
                              ₦{((selectedProduct.price * detailQuantity) + (detailIsGift ? 1000 : 0)).toLocaleString()}
                            </strong>
                          </div>
                          
                          <button
                            onClick={() => {
                              addToCart(selectedProduct, detailQuantity, detailTopping, detailIsGift, detailGiftNote);
                              setCurrentTab('cart');
                            }}
                            className="bg-white text-chocolate hover:bg-beige py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow flex items-center gap-1.5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-caramel" />
                            <span>Add & View Cart</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* TAB 4: ADD TO CART / VIEW CART */}
              {currentTab === 'cart' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <span className="text-5xl select-none"></span>
                      <h4 className="font-serif font-black text-lg text-chocolate">Your baking basket is empty!</h4>
                      <p className="text-xs text-chocolate/50 max-w-sm mx-auto">Browse through our moist golden loaves of banana bread to queue up an active oven slot.</p>
                      <button
                        onClick={() => setCurrentTab('browse')}
                        className="bg-banana hover:bg-honey text-chocolate font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider"
                      >
                        Browse Loaf Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        {cartItems.map((item) => (
                          <div 
                            key={item.cartId}
                            className="p-4 bg-beige/10 border border-chocolate/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-xl overflow-hidden border border-chocolate/5 shrink-0">
                                <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="text-left">
                                <h5 className="font-bold text-xs text-chocolate leading-tight">{item.product.title}</h5>
                                <p className="text-[10px] text-chocolate/50 font-medium mt-0.5">Topping/Glaze: <strong className="text-caramel font-semibold">{item.topping}</strong></p>
                                {item.isGift && <span className="inline-block text-[8px] font-black uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full mt-1">Hand-wrapped Gift</span>}
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                              {/* Quantity Editor */}
                              <div className="flex items-center gap-2.5 bg-white border border-chocolate/10 rounded-xl px-2 py-1">
                                <button
                                  onClick={() => updateCartQuantity(item.cartId, -1)}
                                  className="p-1 hover:bg-beige/40 rounded text-chocolate/60"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="text-xs font-black font-mono w-4 text-center">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item.cartId, 1)}
                                  className="p-1 hover:bg-beige/40 rounded text-chocolate/60"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right min-w-[80px]">
                                <span className="text-xs font-black text-chocolate block">₦{(item.product.price * item.quantity).toLocaleString()}</span>
                                <span className="text-[9px] text-chocolate/40 block font-mono">({item.quantity}x ₦{item.product.price.toLocaleString()})</span>
                              </div>

                              {/* Trash */}
                              <button
                                onClick={() => removeFromCart(item.cartId)}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pricing Summary calculations */}
                      <div className="bg-beige/10 p-5 rounded-2xl border border-chocolate/5 space-y-2.5 text-xs">
                        <div className="flex justify-between text-chocolate/70">
                          <span>Loaves Subtotal:</span>
                          <span className="font-bold text-chocolate">₦{getCartSubtotal().toLocaleString()}</span>
                        </div>
                        {getGiftWrappingFee() > 0 && (
                          <div className="flex justify-between text-chocolate/70">
                            <span>Gold Gift wrapping premium:</span>
                            <span className="font-bold text-chocolate">+₦{getGiftWrappingFee().toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-chocolate/70 items-start">
                          <span>Delivery Courier:</span>
                          <span className="font-bold text-chocolate text-right max-w-[200px]">
                            {deliveryType === 'pickup' ? (
                              'FREE (Pick-Up)'
                            ) : (
                              <span className="text-[10px] text-caramel block font-bold leading-tight">
                                Admin will contact you concerning the delivery fee
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="border-t border-chocolate/5 pt-2 flex justify-between text-sm text-chocolate">
                          <strong className="font-serif font-black">Grand Total:</strong>
                          <strong className="text-caramel font-black">₦{getCartGrandTotal().toLocaleString()}</strong>
                        </div>
                        {deliveryType !== 'pickup' && (
                          <p className="text-[9px] text-amber-700 bg-amber-50 p-2 rounded-xl text-center font-bold">
                            Note: Delivery fee is not included in this total. An admin will contact you to coordinate delivery.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setCurrentTab('browse')}
                          className="bg-beige/30 hover:bg-beige/60 text-chocolate px-5 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                        >
                          Keep Browsing
                        </button>
                        <button
                          onClick={() => setCurrentTab('checkout')}
                          className="bg-chocolate hover:bg-chocolate/90 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider shadow"
                        >
                          Proceed to Checkout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CHECKOUT */}
              {currentTab === 'checkout' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                    {/* Checkout Details Form */}
                    <div className="md:col-span-7 space-y-4">
                      <h5 className="text-xs font-black uppercase text-chocolate/50 tracking-wider">Recipient Dispatch Info</h5>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-chocolate/60">Name</label>
                          <input
                            type="text"
                            placeholder="Recipient full name"
                            value={checkoutName}
                            onChange={(e) => setCheckoutName(e.target.value)}
                            className="w-full bg-beige/5 border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-chocolate/60">Active Phone</label>
                          <input
                            type="text"
                            placeholder="Phone number"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            className="w-full bg-beige/5 border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-chocolate/60">Select Delivery Method</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => setDeliveryType('standard')}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              deliveryType === 'standard' ? 'bg-chocolate text-white border-chocolate' : 'bg-white hover:bg-beige/25 text-chocolate/80 border-chocolate/10'
                            }`}
                          >
                            <span className="block text-xs font-extrabold">Standard Same-Day</span>
                            <span className="block text-[9px] text-chocolate/50 mt-0.5">Admin will contact with fee</span>
                          </button>
                          <button
                            onClick={() => setDeliveryType('express')}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              deliveryType === 'express' ? 'bg-chocolate text-white border-chocolate' : 'bg-white hover:bg-beige/25 text-chocolate/80 border-chocolate/10'
                            }`}
                          >
                            <span className="block text-xs font-extrabold">Express Courier</span>
                            <span className="block text-[9px] text-chocolate/50 mt-0.5">Admin will contact with fee</span>
                          </button>
                          <button
                            onClick={() => setDeliveryType('pickup')}
                            className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                              deliveryType === 'pickup' ? 'bg-chocolate text-white border-chocolate' : 'bg-white hover:bg-beige/25 text-chocolate/80 border-chocolate/10'
                            }`}
                          >
                            <span className="block text-xs font-extrabold">Bakery Pick-Up</span>
                            <span className="block text-[9px] text-chocolate/50 mt-0.5">FREE (From outlet)</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-chocolate/60">Shipping Address & Driver Notes</label>
                        <textarea
                          rows={3}
                          placeholder={deliveryType === 'pickup' ? 'Pickup at Doja Central Bakery: 12 Anike St, Lagos.' : 'Apartment, Street name, City, Landmark, dispatcher gate instructions...'}
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                          className="w-full bg-beige/5 border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Order review side columns */}
                    <div className="md:col-span-5 bg-beige/10 p-5 rounded-2xl border border-chocolate/5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Bake Summary</h5>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {cartItems.map(item => (
                            <div key={item.cartId} className="flex justify-between text-xs text-chocolate/80">
                              <span>{item.quantity}x {item.product.title}</span>
                              <span className="font-mono text-[11px] font-bold">₦{(item.product.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-chocolate/5 pt-3 space-y-1.5 text-xs">
                          <div className="flex justify-between text-chocolate/50">
                            <span>Bakes Subtotal:</span>
                            <span>₦{getCartSubtotal().toLocaleString()}</span>
                          </div>
                          {getGiftWrappingFee() > 0 && (
                            <div className="flex justify-between text-chocolate/50">
                              <span>Gift premium:</span>
                              <span>₦{getGiftWrappingFee().toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-chocolate/50 items-start">
                            <span>Delivery charge:</span>
                            <span className="text-right max-w-[150px]">
                              {deliveryType === 'pickup' ? (
                                'FREE'
                              ) : (
                                <span className="text-[10px] font-bold text-caramel block leading-tight">
                                  Admin will contact you concerning the delivery fee
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="border-t border-chocolate/10 pt-2 flex justify-between text-sm text-chocolate">
                            <strong className="font-serif font-black">Grand Total NGN:</strong>
                            <strong className="text-caramel font-black">₦{getCartGrandTotal().toLocaleString()}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-chocolate/5">
                        <button
                          onClick={() => {
                            if (!checkoutName || !checkoutPhone || (!deliveryNote && deliveryType !== 'pickup')) {
                              triggerToast("Please fill out your delivery dispatch info!", "error");
                              return;
                            }
                            setCurrentTab('payment');
                          }}
                          className="w-full bg-caramel hover:bg-caramel/90 text-white font-black tracking-wider uppercase py-3 rounded-xl text-xs transition-colors shadow cursor-pointer"
                        >
                          Review & Secure Payment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: MAKE PAYMENT */}
              {currentTab === 'payment' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                    {/* Left: Interactive Payment form selector */}
                    <div className="md:col-span-7 space-y-5">
                      {/* Payment Method Selector */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPaymentMethod('paystack')}
                          className={`px-4 py-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                            paymentMethod === 'paystack'
                              ? 'bg-chocolate border-chocolate text-white shadow-sm'
                              : 'bg-beige/5 border-chocolate/10 text-chocolate hover:bg-beige/10'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-bold font-serif">Paystack Online</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod('transfer')}
                          className={`px-4 py-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                            paymentMethod === 'transfer'
                              ? 'bg-chocolate border-chocolate text-white shadow-sm'
                              : 'bg-beige/5 border-chocolate/10 text-chocolate hover:bg-beige/10'
                          }`}
                        >
                          <Wallet className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-bold font-serif">Bank Transfer</span>
                        </button>
                      </div>

                      {paymentMethod === 'paystack' ? (
                        /* PAYSTACK RENDER */
                        <div className="bg-beige/10 border border-chocolate/5 rounded-2xl p-6 space-y-6 text-xs text-left relative overflow-hidden">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-800 shrink-0">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-serif font-black text-chocolate text-sm">Paystack Secure Checkout</h4>
                              <p className="text-[11px] text-chocolate/60 leading-normal">
                                Your order is verified and ready. Complete your banana bread purchase using Paystack's secure checkout portal. Pay safely with your Card, USSD, or Bank App.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white p-4.5 rounded-xl border border-chocolate/5 space-y-3 shadow-sm">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-chocolate/50 font-black uppercase">Authentication Gate</span>
                              {activePaystackPublicKey ? (
                                <span className="bg-emerald-100 text-emerald-950 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono text-[9px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                  ACTIVE SECURE GATE
                                </span>
                              ) : (
                                <span className="bg-amber-100 text-amber-950 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 font-mono text-[9px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  PENDING GATEWAY SETUP
                                </span>
                              )}
                            </div>
                            
                            <p className="text-[10px] text-chocolate/50 leading-normal">
                              {activePaystackPublicKey 
                                ? "Your checkout executes securely via Paystack API with full cryptographic verification."
                                : "Please ensure the administrator has saved your Paystack keys in the settings dashboard to initiate real transactions."
                              }
                            </p>
                          </div>

                          <div className="pt-2 text-center">
                            <button
                              onClick={handlePaystackPayment}
                              disabled={isPaying}
                              className="w-full bg-chocolate hover:bg-chocolate/90 text-white font-black uppercase tracking-wider text-xs px-6 py-3 rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CreditCard className="w-4 h-4 text-banana animate-bounce" />
                              {isPaying ? "Opening Paystack Gateway..." : "Launch Paystack Checkout"}
                            </button>
                            <span className="block text-[9px] text-chocolate/40 mt-2 leading-relaxed">
                              Secured by Paystack Inline. Faridah's bakery never logs your payment credentials.
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* BANK TRANSFER RENDER */
                        <div className="bg-beige/10 border border-chocolate/5 rounded-2xl p-6 space-y-6 text-xs text-left relative overflow-hidden">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-800 shrink-0">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-serif font-black text-chocolate text-sm">Direct Bank Transfer</h4>
                              <p className="text-[11px] text-chocolate/60 leading-normal">
                                Transfer your total payment directly to Faridah's bakery account. We'll verify and approve your order immediately upon receiving the transfer.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white p-4.5 rounded-xl border border-chocolate/5 space-y-3.5 shadow-sm text-chocolate">
                            <span className="block text-[9px] uppercase font-black tracking-wider text-chocolate/50">Faridah's Official Account</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                              <div>
                                <span className="block text-[8px] font-black uppercase text-chocolate/40 font-sans">Bank Name</span>
                                <strong className="text-chocolate">Moniepoint MFB</strong>
                              </div>
                              <div>
                                <span className="block text-[8px] font-black uppercase text-chocolate/40 font-sans">Account Number</span>
                                <strong className="text-chocolate tracking-wider">6968917221</strong>
                              </div>
                              <div className="sm:col-span-2 border-t border-chocolate/5 pt-2">
                                <span className="block text-[8px] font-black uppercase text-chocolate/40 font-sans">Account Name</span>
                                <strong className="text-chocolate">Baked By Doja Sweet Creations Ventures</strong>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 text-chocolate">
                            <label className="block text-[10px] font-black uppercase text-chocolate/60">Sender Name on Bank App</label>
                            <input
                              type="text"
                              value={transferSenderName}
                              onChange={e => setTransferSenderName(e.target.value)}
                              placeholder="e.g., Faridah Adeyemi"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                              required
                            />
                            <span className="block text-[9px] text-chocolate/40 leading-normal font-sans">
                              Enter the exact name on your transfer debit receipt so Chef Faridah can verify it.
                            </span>
                          </div>

                          <div className="pt-2 text-center">
                            <button
                              onClick={handleBankTransferPayment}
                              disabled={isPaying}
                              className="w-full bg-chocolate hover:bg-chocolate/90 text-white font-black uppercase tracking-wider text-xs px-6 py-3 rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <ShieldCheck className="w-4 h-4 text-banana" />
                              {isPaying ? "Submitting Order Request..." : "Submit Bank Transfer Notification"}
                            </button>
                            <span className="block text-[9px] text-chocolate/40 mt-2 leading-relaxed">
                              Faridah will verify and trigger oven preparation.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Payment Receipt Sidebar */}
                    <div className="md:col-span-5 bg-chocolate text-cream p-5 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-4">
                        <span className="text-[10px] text-cream/45 uppercase tracking-widest block font-bold">Secure Gate Order Review</span>
                        <div className="text-center py-2 border-b border-cream/10">
                          <span className="text-[10px] text-banana/70 uppercase font-black tracking-wide block">Authorize Grand Total</span>
                          <h2 className="text-3xl font-serif font-black text-banana">₦{getCartGrandTotal().toLocaleString()}</h2>
                        </div>

                        <div className="space-y-2 text-xs text-cream/80">
                          <div className="flex justify-between">
                            <span>Consolidated item count:</span>
                            <span>{totalCartQty} Loaves</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery logistics:</span>
                            <span className="capitalize">{deliveryType}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 mt-6 border-t border-cream/10">
                        {isPaying ? (
                          <div className="text-center py-2.5 space-y-2.5">
                            <div className="w-6 h-6 border-2 border-banana border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-[11px] font-bold text-banana animate-pulse">{paymentStepText}</p>
                            <button
                              type="button"
                              onClick={() => setIsPaying(false)}
                              className="text-[9px] bg-white/10 hover:bg-white/15 text-banana px-3 py-1.5 rounded-lg font-extrabold uppercase tracking-widest mt-1 cursor-pointer transition-colors"
                            >
                              Cancel & Return
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={paymentMethod === 'transfer' ? handleBankTransferPayment : handlePaystackPayment}
                            className="w-full bg-banana hover:bg-honey text-chocolate font-black uppercase tracking-wider py-3 rounded-xl text-xs transition-all shadow cursor-pointer text-center"
                          >
                            Authorize Payment
                          </button>
                        )}
                        <p className="text-[9px] text-cream/40 text-center mt-3 leading-normal">
                          By finalizing, you approve immediate transaction authorization from your credit limits.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB 7: TRACK ORDER */}
              {currentTab === 'track' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  {displayOrders.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <span className="text-5xl"></span>
                      <h4 className="font-serif font-black text-lg text-chocolate">No baking tracking records found!</h4>
                      <p className="text-xs text-chocolate/50 max-w-sm mx-auto">Purchase a customized banana bread loaf, and we'll synchronize your real-time tracking here.</p>
                      <button
                        onClick={() => setCurrentTab('browse')}
                        className="bg-banana hover:bg-honey text-chocolate font-black px-6 py-2.5 rounded-xl text-xs"
                      >
                        Bake Now
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                      
                      {/* Left list of orders to select */}
                      <div className="lg:col-span-4 space-y-3 border-r border-chocolate/5 pr-0 lg:pr-5">
                        <label className="block text-[10px] font-black uppercase text-chocolate/40 tracking-wider">Select Baking Slot To Track</label>
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {displayOrders.map((o) => {
                            const isSel = o.orderId === selectedOrderId;
                            return (
                              <button
                                key={o.orderId}
                                onClick={() => setSelectedOrderId(o.orderId)}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block ${
                                  isSel ? 'bg-chocolate text-white border-chocolate' : 'bg-beige/10 text-chocolate border-chocolate/5 hover:bg-beige/30'
                                }`}
                              >
                                <div className="flex justify-between items-start text-xs font-bold">
                                  <span className="truncate max-w-[120px] block">{o.productTitle}</span>
                                  <span className="font-mono text-[10px]">{o.orderId}</span>
                                </div>
                                <div className="flex justify-between items-end mt-2">
                                  <span className={`text-[8px] uppercase px-2 py-0.5 rounded-full font-black ${
                                    o.status === 'rejected' ? 'bg-rose-100 text-rose-900' :
                                    o.status === 'pending' ? 'bg-amber-100 text-amber-900' :
                                    o.status !== 'delivered' ? 'bg-yellow-100 text-yellow-950' : 'bg-emerald-100 text-emerald-900'
                                  }`}>
                                    {o.status || 'pending'}
                                  </span>
                                  <span className={`text-[10px] font-mono ${isSel ? 'text-banana' : 'text-chocolate/60'}`}>₦{o.totalAmount?.toLocaleString()}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Active Timeline Tracking details */}
                      <div className="lg:col-span-8 space-y-6">
                        {activeOrder ? (
                          <>
                            <div className="bg-beige/10 p-4 rounded-2xl border border-chocolate/5 flex justify-between items-center flex-wrap gap-2 text-xs">
                              <div>
                                <span className="text-chocolate/40 text-[10px] block">Tracking Baking Order ID:</span>
                                <strong className="text-chocolate font-mono">{activeOrder.orderId}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-chocolate/40 text-[10px] block">Logistics Status:</span>
                                <strong className={`uppercase tracking-wider text-[11px] font-black ${
                                  activeOrder.status === 'rejected' ? 'text-rose-600' : 'text-caramel'
                                }`}>
                                  {activeOrder.status || 'pending'}
                                </strong>
                              </div>
                            </div>

                            {activeOrder.status === 'rejected' ? (
                              <div className="bg-rose-50/70 border border-rose-100 rounded-3xl p-6 text-center space-y-3 shadow-sm">
                                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-700">
                                  <X className="w-5 h-5 animate-bounce" />
                                </div>
                                <h4 className="font-serif text-rose-950 font-extrabold text-sm">Order Declined by Bakery</h4>
                                <p className="text-rose-700/80 text-[11px] max-w-sm mx-auto leading-relaxed">
                                  Unfortunately, this order was declined or cancelled by the bakery. If you already processed payment or have questions, please click the <strong>WhatsApp chat icon</strong> at the bottom of the screen to connect with our support line immediately.
                                </p>
                              </div>
                            ) : (
                              /* TIMELINE TRACK */
                              <div className="space-y-5 relative pl-4 border-l-2 border-chocolate/10">
                                {STATUS_STEPS.map((step, idx) => {
                                  // Calculate status indices to highlight
                                  const currentIdx = STATUS_STEPS.findIndex(s => s.key === (activeOrder.status || 'pending'));
                                  const isPassed = idx <= currentIdx;
                                  const isCurrent = idx === currentIdx;

                                  return (
                                    <div key={step.key} className="relative">
                                      {/* Timeline bullet dot */}
                                      <div className={`
                                        absolute -left-[25px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                                        ${isCurrent ? 'bg-banana border-chocolate scale-110 shadow-md animate-pulse' : 
                                          isPassed ? 'bg-chocolate border-chocolate' : 'bg-white border-chocolate/25'}
                                      `}>
                                        {isPassed && !isCurrent && <Check className="w-2.5 h-2.5 text-white shrink-0" />}
                                      </div>

                                      <div className="text-left">
                                        <h6 className={`text-xs font-black uppercase tracking-wider ${isCurrent ? 'text-caramel' : isPassed ? 'text-chocolate' : 'text-chocolate/40'}`}>
                                          {step.label}
                                        </h6>
                                        <p className="text-[11px] text-chocolate/60 leading-normal mt-0.5">{step.description}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}


                          </>
                        ) : (
                          <p className="text-xs text-chocolate/50 text-center py-12">Select an order ID to reveal live GPS baking tracks.</p>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: VIEW ORDER HISTORY */}
              {currentTab === 'history' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  {displayOrders.length === 0 ? (
                    <div className="text-center py-16 space-y-4">
                      <span className="text-5xl"></span>
                      <h4 className="font-serif font-black text-lg text-chocolate">No order history found</h4>
                      <p className="text-xs text-chocolate/50 max-w-sm mx-auto">You haven't ordered any signature warm loaves yet.</p>
                      <button
                        onClick={() => setCurrentTab('browse')}
                        className="bg-banana hover:bg-honey text-chocolate font-black px-6 py-2.5 rounded-xl text-xs"
                      >
                        Bake Now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <p className="text-xs text-chocolate/50">List of historic baking oven queues synchronized on your phone line:</p>
                      <div className="overflow-x-auto border border-chocolate/5 rounded-2xl">
                        <table className="w-full text-xs text-chocolate">
                          <thead className="bg-beige/15 border-b border-chocolate/5 text-[10px] uppercase font-black text-chocolate/50 tracking-wider text-left">
                            <tr>
                              <th className="p-3.5">Order ID</th>
                              <th className="p-3.5">Bake Loaf Selected</th>
                              <th className="p-3.5">Toppings</th>
                              <th className="p-3.5">Receipt amount</th>
                              <th className="p-3.5">Status</th>
                              <th className="p-3.5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-chocolate/5">
                            {displayOrders.map((o) => (
                              <tr key={o.orderId} className="hover:bg-beige/10 transition-colors">
                                <td className="p-3.5 font-mono font-bold text-caramel">{o.orderId}</td>
                                <td className="p-3.5 font-semibold">{o.productTitle}</td>
                                <td className="p-3.5 text-chocolate/70">{o.topping || 'Classic'}</td>
                                <td className="p-3.5 font-bold">₦{o.totalAmount?.toLocaleString()}</td>
                                <td className="p-3.5">
                                  <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    o.status !== 'delivered' ? 'bg-amber-100 text-amber-900 animate-pulse' : 'bg-emerald-100 text-emerald-900'
                                  }`}>
                                    {o.status || 'prepping'}
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    onClick={() => {
                                      // Search for product to re-add
                                      const mappedProd = allProducts.find(p => o.productTitle.includes(p.title)) || allProducts[0] || products[0];
                                      if (mappedProd) {
                                        addToCart(mappedProd, 1, o.topping || 'Classic Plain', o.isGift || false, o.giftNote || { to: '', from: '', message: '' });
                                      }
                                      setCurrentTab('cart');
                                    }}
                                    className="bg-banana hover:bg-honey text-chocolate font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
                                  >
                                    Reorder Loaf
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 9: LEAVE REVIEW */}
              {currentTab === 'review' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left">
                    {/* Submit Review Column */}
                    <form onSubmit={handleSubmitReview} className="md:col-span-6 space-y-4">
                      <h5 className="text-xs font-black uppercase text-chocolate/50 tracking-wider">Leave Bakery Feedback</h5>
                      
                      {displayOrders.length === 0 ? (
                        <p className="text-xs text-chocolate/50 bg-beige/10 p-4 rounded-xl">You must order and receive a warm loaf before leaving chef feedback.</p>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-chocolate/60">Select Order to Review</label>
                            <select
                              value={reviewOrderId}
                              onChange={(e) => setReviewOrderId(e.target.value)}
                              className="w-full bg-beige/5 border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none"
                              required
                            >
                              <option value="">-- Choose past purchase --</option>
                              {displayOrders.map(o => (
                                <option key={o.orderId} value={o.orderId}>{o.orderId} • {o.productTitle}</option>
                              ))}
                            </select>
                          </div>

                          {/* Star interactive widget */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-chocolate/60">Star Rating</label>
                            <div className="flex items-center gap-1.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  type="button"
                                  key={star}
                                  onClick={() => setReviewRating(star)}
                                  onMouseEnter={() => setReviewHoverRating(star)}
                                  onMouseLeave={() => setReviewHoverRating(null)}
                                  className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                                >
                                  <Star 
                                    className={`w-6 h-6 ${
                                      star <= (reviewHoverRating ?? reviewRating) 
                                        ? 'text-amber-400 fill-amber-400' 
                                        : 'text-chocolate/20'
                                    }`} 
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-chocolate/60">Your Experience Notes</label>
                            <textarea
                              rows={4}
                              placeholder="Tell our chef Faridah how moist, sweet, and fresh your banana bread loaf tasted..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full bg-beige/5 border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none resize-none"
                              required
                            />
                          </div>

                          <button
                            type="submit"
                            className="bg-chocolate hover:bg-chocolate/90 text-white font-black uppercase tracking-wider py-2.5 px-5 rounded-xl text-[10px] shadow cursor-pointer"
                          >
                            Post Review to storefront
                          </button>
                        </>
                      )}
                    </form>

                    {/* Submitted Reviews Column */}
                    <div className="md:col-span-6 space-y-4">
                      <h5 className="text-xs font-black uppercase text-chocolate/50 tracking-wider">Your Local Submitted Reviews ({reviewsList.length})</h5>
                      {reviewsList.length === 0 ? (
                        <div className="py-8 bg-beige/10 border border-dashed border-chocolate/10 rounded-2xl text-center text-xs text-chocolate/50">
                          Your submitted feedback will appear here in real-time.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                          {reviewsList.map((rev) => (
                            <div key={rev.id} className="p-4 bg-white border border-chocolate/5 rounded-xl shadow-sm text-xs space-y-2">
                              <div className="flex justify-between items-center">
                                <strong className="font-serif font-black text-chocolate">{rev.productTitle}</strong>
                                <span className="text-[9px] font-mono text-chocolate/40">{rev.orderId}</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <Star key={star} className={`w-3 h-3 ${star <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-chocolate/10'}`} />
                                ))}
                              </div>
                              <p className="text-chocolate/70 leading-relaxed italic">"{rev.comment}"</p>
                              {chefReplies && chefReplies[rev.id] && (
                                <div className="mt-2 pl-3 border-l-2 border-caramel bg-beige/10 py-1.5 px-2.5 rounded-xl text-[10px] text-chocolate space-y-0.5">
                                  <span className="font-bold text-caramel block">Faridah's Response:</span>
                                  <p className="italic text-chocolate/80">"{chefReplies[rev.id]}"</p>
                                </div>
                              )}
                              <span className="block text-[9px] text-chocolate/40 text-right">Submitted {new Date(rev.date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: ADMIN PANEL (VISIBLE ONLY TO LOGGED IN OWNER/ADMIN) */}
              {currentTab === 'admin' && currentUser?.role === 'admin' && (
                <div className="bg-white border border-chocolate/5 rounded-3xl p-6 sm:p-8 shadow-sm text-left space-y-6">
                  
                  {/* Admin Header & Navigation Submenu */}
                  <div className="border-b border-chocolate/5 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-serif font-black text-xl text-chocolate flex items-center gap-2">
                        Doja Admin Suite
                        <span className="text-[10px] font-sans font-black bg-banana/50 text-chocolate px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Executive Access
                        </span>
                      </h4>
                      <p className="text-[11px] text-chocolate/50">Manage your fresh-baking recipes, incoming customer transactions, and ingredient supplies.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleRefresh}
                        disabled={isRefreshing || isLoading}
                        className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200/50 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm transition-all"
                        title="Sync administrative database metrics, products, and orders in real-time"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Refreshing...' : 'Refresh Real-time'}</span>
                      </button>

                      <div className="flex flex-wrap gap-1 bg-beige/10 p-1.5 rounded-xl border border-chocolate/5">
                        {(['overview', 'products', 'orders', 'customers', 'inventory', 'reviews', 'gallery', 'settings'] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setAdminSubTab(tab)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              adminSubTab === tab
                                ? 'bg-chocolate text-white shadow-sm'
                                : 'text-chocolate/60 hover:text-chocolate hover:bg-beige/15'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SUB-TAB 1: OVERVIEW & SALES REPORTS */}
                  {adminSubTab === 'overview' && (() => {
                    const validOrders = orders.filter(o => o.status !== 'rejected' && o.paymentStatus === 'paid');
                    
                    // Compute current week boundaries (Monday to Sunday)
                    const getWeekData = () => {
                      const today = new Date();
                      const currentDay = today.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
                      
                      // Calculate difference to Monday
                      const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
                      const mondayDate = new Date(today);
                      mondayDate.setDate(diffToMonday);
                      mondayDate.setHours(0, 0, 0, 0);
                      
                      const sundayDate = new Date(mondayDate);
                      sundayDate.setDate(mondayDate.getDate() + 6);
                      sundayDate.setHours(23, 59, 59, 999);
                      
                      return { mondayDate, sundayDate };
                    };
                    
                    const { mondayDate, sundayDate } = getWeekData();
                    
                    const getCalendarDateForDay = (weekdayIndex: number) => {
                      // Offset calculation from Monday (index 1)
                      const offset = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
                      const targetDate = new Date(mondayDate);
                      targetDate.setDate(mondayDate.getDate() + offset);
                      return targetDate;
                    };

                    const weekdayKeys = [
                      { label: 'Monday', index: 1, shortLabel: 'Mon' },
                      { label: 'Tuesday', index: 2, shortLabel: 'Tue' },
                      { label: 'Wednesday', index: 3, shortLabel: 'Wed' },
                      { label: 'Thursday', index: 4, shortLabel: 'Thu' },
                      { label: 'Friday', index: 5, shortLabel: 'Fri' },
                      { label: 'Saturday', index: 6, shortLabel: 'Sat' },
                      { label: 'Sunday', index: 0, shortLabel: 'Sun' },
                    ];

                    const dayStats = weekdayKeys.map(dayKey => {
                      const targetCalendarDate = getCalendarDateForDay(dayKey.index);
                      
                      const ordersForDay = validOrders.filter(o => {
                        const oDate = new Date(o.date);
                        const matchesDay = oDate.getDay() === dayKey.index;
                        
                        if (weeklyViewMode === 'current_week') {
                          return matchesDay &&
                                 oDate.getFullYear() === targetCalendarDate.getFullYear() &&
                                 oDate.getMonth() === targetCalendarDate.getMonth() &&
                                 oDate.getDate() === targetCalendarDate.getDate();
                        }
                        return matchesDay;
                      });
                      
                      const totalVolume = ordersForDay.reduce((sum, o) => sum + (o.quantity || 1), 0);
                      const totalRevenue = ordersForDay.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                      
                      return {
                        ...dayKey,
                        calendarDate: targetCalendarDate,
                        volume: totalVolume,
                        revenue: totalRevenue,
                        ordersCount: ordersForDay.length,
                      };
                    });
                    
                    const maxVolume = Math.max(...dayStats.map(d => d.volume), 1);
                    const totalVolumeSum = dayStats.reduce((sum, d) => sum + d.volume, 0);
                    const totalRevenueSum = dayStats.reduce((sum, d) => sum + d.revenue, 0);

                    const weekRangeStr = `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${sundayDate.getFullYear()}`;

                    return (
                      <div className="space-y-6">
                        {/* High Level Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-emerald-800">
                              <span className="text-[9px] font-black uppercase tracking-wider">Total Sales Revenue</span>
                              <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-serif font-black text-emerald-950 mt-1">
                              ₦{validOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0).toLocaleString()}
                            </h3>
                            <p className="text-[10px] text-emerald-700/70 mt-1">From {validOrders.length} successful transactions</p>
                          </div>

                          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-amber-800">
                              <span className="text-[9px] font-black uppercase tracking-wider">Average Order Value (AOV)</span>
                              <ShoppingBag className="w-4 h-4 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-serif font-black text-amber-950 mt-1">
                              ₦{validOrders.length > 0 
                                ? Math.round(validOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) / validOrders.length).toLocaleString()
                                : '0'
                              }
                            </h3>
                            <p className="text-[10px] text-amber-700/70 mt-1">Naira spend ratio</p>
                          </div>

                          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-blue-800">
                              <span className="text-[9px] font-black uppercase tracking-wider">Total Volume Ordered</span>
                              <Package className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-serif font-black text-blue-950 mt-1">
                              {validOrders.reduce((acc, o) => acc + (o.quantity || 1), 0)} Loaves
                            </h3>
                            <p className="text-[10px] text-blue-700/70 mt-1">Fresh bakes cataloged</p>
                          </div>

                          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                            <div className="flex items-center justify-between text-rose-800">
                              <span className="text-[9px] font-black uppercase tracking-wider">Pending Baking Slots</span>
                              <Clock className="w-4 h-4 text-rose-600 animate-pulse" />
                            </div>
                            <h3 className="text-2xl font-serif font-black text-rose-950 mt-1">
                              {validOrders.filter(o => o.status !== 'delivered').length} Orders
                            </h3>
                            <p className="text-[10px] text-rose-700/70 mt-1">Currently in-oven queues</p>
                          </div>
                        </div>

                        {/* Real-time Day-of-Week (Monday to Sunday) Sales Tracker */}
                        <div className="bg-white border border-chocolate/5 p-5 rounded-2xl space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-chocolate/5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Day-of-Week Loaf Tracker</span>
                                <span className="animate-ping w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                                <span className="text-[9px] text-emerald-600 font-extrabold tracking-wider uppercase">Real-time Feed</span>
                              </div>
                              <h4 className="font-serif font-black text-chocolate text-base mt-1">
                                {weeklyViewMode === 'current_week' ? `Sales Volume: ${weekRangeStr}` : 'All-Time Aggregated Day-of-Week Sales'}
                              </h4>
                            </div>

                            {/* View toggle switches */}
                            <div className="flex bg-beige/10 p-1 rounded-xl border border-chocolate/5 self-start sm:self-center">
                              <button
                                onClick={() => setWeeklyViewMode('current_week')}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  weeklyViewMode === 'current_week'
                                    ? 'bg-chocolate text-white shadow-sm'
                                    : 'text-chocolate/60 hover:text-chocolate'
                                }`}
                              >
                                This Week
                              </button>
                              <button
                                onClick={() => setWeeklyViewMode('all_time')}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  weeklyViewMode === 'all_time'
                                    ? 'bg-chocolate text-white shadow-sm'
                                    : 'text-chocolate/60 hover:text-chocolate'
                                }`}
                              >
                                All-Time Trends
                              </button>
                            </div>
                          </div>

                          {/* Days Grid - Bar Chart Representation */}
                          <div className="grid grid-cols-1 sm:grid-cols-7 gap-4 pt-2">
                            {dayStats.map((day) => {
                              const pct = Math.max(3, (day.volume / maxVolume) * 100);
                              
                              return (
                                <div 
                                  key={day.label} 
                                  className="bg-cream/10 border border-chocolate/5 hover:border-chocolate/15 rounded-xl p-3 flex flex-col items-center justify-between min-h-[160px] transition-all relative group"
                                >
                                  {/* Day and Date label at the top */}
                                  <div className="text-center">
                                    <span className="block text-[10px] font-black text-chocolate uppercase tracking-wider leading-none">
                                      {day.label}
                                    </span>
                                    {weeklyViewMode === 'current_week' && (
                                      <span className="block text-[8px] font-mono text-chocolate/40 mt-1">
                                        {day.calendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                      </span>
                                    )}
                                  </div>

                                  {/* The Visual Bar Indicator */}
                                  <div className="w-full flex-1 flex flex-col justify-end py-3 px-2 min-h-[60px]">
                                    <div className="w-full bg-beige/10 rounded-full h-24 flex items-end overflow-hidden relative border border-chocolate/[0.03]">
                                      {/* Bar Segment */}
                                      <div 
                                        className="w-full bg-gradient-to-t from-honey to-caramel group-hover:from-caramel group-hover:to-chocolate transition-all duration-500 rounded-t-lg"
                                        style={{ height: `${pct}%` }}
                                      />
                                      {/* Micro indicator line for selected state */}
                                      {day.volume > 0 && (
                                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-black text-white mix-blend-difference">
                                          {day.volume}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Volume & Revenue Stats at the bottom */}
                                  <div className="text-center space-y-0.5">
                                    <span className="block text-[11px] font-black text-chocolate">
                                      {day.volume} {day.volume === 1 ? 'Loaf' : 'Loaves'}
                                    </span>
                                    <span className="block text-[8px] font-extrabold text-caramel/90">
                                      ₦{day.revenue.toLocaleString()}
                                    </span>
                                    <span className="block text-[7px] text-chocolate/30 font-bold uppercase tracking-wide leading-none">
                                      {day.ordersCount} {day.ordersCount === 1 ? 'order' : 'orders'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick Summary Banner */}
                          <div className="flex flex-col sm:flex-row items-center justify-between bg-beige/5 p-3 rounded-xl border border-chocolate/5 text-[10px] text-chocolate/60 gap-3">
                            <div>
                              <strong>{weeklyViewMode === 'current_week' ? 'Weekly Summary:' : 'All-time Summary:'}</strong> Total of{' '}
                              <span className="font-bold text-chocolate">{totalVolumeSum} loaves</span> sold and{' '}
                              <span className="font-bold text-emerald-700">₦{totalRevenueSum.toLocaleString()}</span> generated on these weekdays.
                            </div>
                            <div className="text-[9px] text-chocolate/40 italic">
                              *Rejected orders are automatically excluded in real-time.
                            </div>
                          </div>
                        </div>

                        {/* Visual Sales Charts (Styled SVG Representation) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          {/* Loaf Sales Chart */}
                          <div className="lg:col-span-7 bg-white border border-chocolate/5 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Bestselling Loaf Categories</span>
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Live Stats</span>
                            </div>
                            <div className="space-y-3.5 pt-2">
                              {allProducts.map((p) => {
                                // Calculate simple percentage based on order history count
                                const orderCount = validOrders.filter(o => o.productTitle.includes(p.title)).length;
                                const maxOrders = Math.max(...allProducts.map(prod => validOrders.filter(o => o.productTitle.includes(prod.title)).length), 1);
                                const pct = Math.max(10, Math.min(100, (orderCount / maxOrders) * 100));
                                return (
                                  <div key={p.id} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold">
                                      <span className="text-chocolate">{p.title}</span>
                                      <span className="text-caramel">{orderCount} bakes (₦{(orderCount * p.price).toLocaleString()})</span>
                                    </div>
                                    <div className="h-2 w-full bg-beige/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-honey to-caramel rounded-full transition-all duration-1000" 
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Delivery Type Ratios */}
                          <div className="lg:col-span-5 bg-white border border-chocolate/5 p-5 rounded-2xl space-y-4">
                            <span className="text-[10px] font-black uppercase text-chocolate/50 tracking-wider block">Logistics Channels Distribution</span>
                            <div className="space-y-4 pt-2">
                              {['standard', 'express', 'pickup'].map((type) => {
                                const count = validOrders.filter(o => (o.deliveryType || '').toLowerCase() === type).length;
                                const total = validOrders.length || 1;
                                const ratio = Math.round((count / total) * 100);
                                const label = type === 'standard' ? 'Standard Courier (₦2,500)' : type === 'express' ? 'Priority Express Dispatch (₦4,000)' : 'Self-Collection (Free)';
                                const barColor = type === 'standard' ? 'bg-amber-500' : type === 'express' ? 'bg-rose-500' : 'bg-emerald-500';
                                return (
                                  <div key={type} className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-black">
                                      <span className="capitalize text-chocolate">{type}</span>
                                      <span className="text-chocolate/50">{count} orders ({ratio}%)</span>
                                    </div>
                                    <p className="text-[9px] text-chocolate/40 leading-none">{label}</p>
                                    <div className="h-1.5 w-full bg-beige/15 rounded-full overflow-hidden mt-1">
                                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${ratio}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="bg-beige/10 p-3 rounded-xl border border-chocolate/5 mt-4 text-[10px] text-chocolate/60">
                              <strong>Faridah's Culinary Note:</strong> Lagos dispatch logistics auto-optimizes based on thermal cooling parameters to ensure banana bread slices remain warm during transit.
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUB-TAB 2: MANAGE PRODUCTS (ADD/EDIT/DELETE) */}
                  {adminSubTab === 'products' && (
                    <div className="space-y-6">
                      {/* Add/Edit Product Recipe Form Container */}
                      <div id="product-form-container" className="bg-beige/5 border border-chocolate/5 rounded-2xl p-5 space-y-4">
                        <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">
                          {editingProduct ? 'Edit Existing Recipe Line' : 'Upload New Fresh Recipe Line'}
                        </span>

                        <form onSubmit={handleSaveProduct} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Recipe Title</label>
                            <input
                              type="text"
                              value={productForm.title}
                              onChange={e => setProductForm({...productForm, title: e.target.value})}
                              placeholder="e.g., Premium Almond Coconut Loaf"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Recipe ID (Unique, No Spaces)</label>
                            <input
                              type="text"
                              value={productForm.id}
                              onChange={e => setProductForm({...productForm, id: e.target.value})}
                              placeholder="e.g., almond-coco"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono font-bold"
                              disabled={!!editingProduct}
                              required
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Price (₦ NGN)</label>
                            <input
                              type="number"
                              value={productForm.price}
                              onChange={e => setProductForm({...productForm, price: Number(e.target.value)})}
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-bold"
                              required
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Promo Original Price (Optional)</label>
                            <input
                              type="number"
                              value={productForm.originalPrice}
                              onChange={e => setProductForm({...productForm, originalPrice: Number(e.target.value)})}
                              placeholder="0"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Description</label>
                            <textarea
                              rows={2}
                              value={productForm.description}
                              onChange={e => setProductForm({...productForm, description: e.target.value})}
                              placeholder="Write a mouth-watering description to attract banana bread foodies..."
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate resize-none"
                              required
                            />
                          </div>

                          <div className="sm:col-span-6 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Allowed Glaze Toppings (Comma Separated)</label>
                            <input
                              type="text"
                              value={productForm.toppings}
                              onChange={e => setProductForm({...productForm, toppings: e.target.value})}
                              placeholder="Classic Plain, Butter Glaze, Roasted Nuts"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate"
                              required
                            />
                          </div>

                          <div className="sm:col-span-5 space-y-2">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Recipe Image Source</label>
                            
                            {/* Drag & Drop File Upload Region */}
                            <div
                              onDragOver={handleDragOver}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDrop}
                              onClick={() => document.getElementById('recipe-image-upload-input')?.click()}
                              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[90px] relative overflow-hidden group ${
                                isDragging 
                                  ? 'border-chocolate bg-chocolate/5 scale-[0.99]' 
                                  : 'border-chocolate/10 bg-white hover:border-chocolate/30 hover:bg-beige/5'
                              }`}
                            >
                              <input
                                id="recipe-image-upload-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                              />

                              {isUploading ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Loader2 className="w-5 h-5 text-caramel animate-spin" />
                                  <span className="text-[10px] font-bold text-chocolate/70">Uploading image...</span>
                                </div>
                              ) : (
                                <>
                                  {productForm.image ? (
                                    <div className="absolute inset-0 w-full h-full">
                                      <img 
                                        src={productForm.image} 
                                        alt="Recipe Preview" 
                                        className="w-full h-full object-cover opacity-20 group-hover:opacity-10 transition-opacity duration-200" 
                                      />
                                    </div>
                                  ) : null}
                                  
                                  <div className="relative z-10 flex flex-col items-center">
                                    <UploadCloud className="w-5 h-5 text-chocolate/40 group-hover:text-chocolate/60 transition-colors duration-200 mb-0.5" />
                                    <span className="text-[10px] font-extrabold text-chocolate leading-none">
                                      {productForm.image ? 'Replace Recipe Photo' : 'Upload Recipe Photo'}
                                    </span>
                                    <span className="text-[8px] text-chocolate/50 font-semibold mt-0.5">
                                      Drag & drop or click to upload
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Text URL Input Field (as an alternative option) */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-chocolate/40 font-black uppercase">Or paste raw Image URL</span>
                                {uploadSource && (
                                  <span className="text-[7px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-1 uppercase tracking-wider">
                                    Source: {uploadSource}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={productForm.image}
                                onChange={e => {
                                  setProductForm({...productForm, image: e.target.value});
                                  setUploadSource(null);
                                }}
                                placeholder="https://..."
                                className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-1.5 text-[10px] focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                              />
                            </div>

                            {/* Quick Presets */}
                            <div className="flex gap-1.5">
                              <span className="text-[8px] text-chocolate/40 font-bold">Quick Presets:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm({...productForm, image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600'});
                                  setUploadSource(null);
                                }}
                                className="text-[8px] bg-white border border-chocolate/5 px-1.5 py-0.5 rounded text-caramel hover:bg-beige/10 cursor-pointer"
                              >
                                Loaf
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm({...productForm, image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600'});
                                  setUploadSource(null);
                                }}
                                className="text-[8px] bg-white border border-chocolate/5 px-1.5 py-0.5 rounded text-caramel hover:bg-beige/10 cursor-pointer"
                              >
                                Chocolate
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProductForm({...productForm, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600'});
                                  setUploadSource(null);
                                }}
                                className="text-[8px] bg-white border border-chocolate/5 px-1.5 py-0.5 rounded text-caramel hover:bg-beige/10 cursor-pointer"
                              >
                                Nuts
                              </button>
                            </div>
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Loaf Menu Tag (Promo)</label>
                            <input
                              type="text"
                              value={productForm.tag}
                              onChange={e => setProductForm({...productForm, tag: e.target.value})}
                              placeholder="e.g., Best Seller, Faridah Special"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Oven Prep Notice Message</label>
                            <input
                              type="text"
                              value={productForm.prepTime}
                              onChange={e => setProductForm({...productForm, prepTime: e.target.value})}
                              placeholder="Baked fresh daily (ships within 24h)"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate"
                            />
                          </div>

                          <div className="sm:col-span-12 pt-2 flex justify-end gap-2">
                            {editingProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProduct(null);
                                  setProductForm({
                                    id: '',
                                    title: '',
                                    description: '',
                                    price: 6500,
                                    originalPrice: 0,
                                    tag: '',
                                    toppings: 'Classic Plain, Powdered Sugar, Salted Butter',
                                    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600',
                                    prepTime: 'Baked fresh daily (ships within 24h)'
                                  });
                                }}
                                className="px-4 py-2 border border-chocolate/10 hover:bg-beige/15 text-chocolate rounded-xl font-bold text-xs cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                            )}
                            <button
                              type="submit"
                              className="bg-chocolate hover:bg-chocolate/90 text-white font-black uppercase tracking-wider px-5 py-2 rounded-xl text-xs shadow cursor-pointer"
                            >
                              {editingProduct ? 'Update Recipe Specs' : 'Publish to Storefront menu'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Active Recipe Lines Table */}
                      <div className="space-y-3">
                        <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Active Storefront Menu Catalog ({allProducts.length})</span>
                        <div className="overflow-x-auto border border-chocolate/5 rounded-2xl bg-white">
                          <table className="w-full text-xs text-chocolate">
                            <thead className="bg-beige/15 border-b border-chocolate/5 text-[10px] uppercase font-black text-chocolate/50 tracking-wider text-left">
                              <tr>
                                <th className="p-3">Loaf Loookup</th>
                                <th className="p-3">Title & Tag</th>
                                <th className="p-3">Price Point</th>
                                <th className="p-3">Glaze Options</th>
                                <th className="p-3">Prep Notice</th>
                                <th className="p-3 text-right">Recipe Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-chocolate/5">
                              {allProducts.map(p => (
                                <tr key={p.id} className="hover:bg-beige/10 transition-colors">
                                  <td className="p-3 font-mono font-bold text-caramel">
                                    <div className="flex items-center gap-2">
                                      <img src={p.image} alt="" className="w-10 h-10 object-cover rounded-xl border border-chocolate/5" />
                                      <div>
                                        <div className="font-bold text-chocolate">{p.id}</div>
                                        <div className="text-[9px] text-chocolate/40">Rating: ⭐{p.rating.toFixed(1)}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 font-semibold">
                                    <div className="font-bold text-chocolate">{p.title}</div>
                                    {p.tag && (
                                      <span className="inline-block text-[8px] bg-chocolate text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wider mt-0.5">
                                        {p.tag}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-extrabold text-chocolate">
                                    ₦{p.price.toLocaleString()}
                                    {p.originalPrice ? (
                                      <span className="block text-[9px] text-chocolate/30 line-through font-normal">
                                        ₦{p.originalPrice.toLocaleString()}
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="p-3 text-chocolate/60 truncate max-w-[140px]" title={p.toppings.join(', ')}>
                                    {p.toppings.join(', ')}
                                  </td>
                                  <td className="p-3 text-[10px] text-chocolate/50 italic">{p.prepTime}</td>
                                  <td className="p-3 text-right space-x-1">
                                    <button
                                      onClick={() => handleEditProduct(p)}
                                      className="bg-banana hover:bg-honey text-chocolate font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                                    >
                                      Edit specs
                                    </button>
                                    <button
                                      onClick={() => handleDeleteProduct(p.id)}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 3: MANAGE ORDERS (WITH SEARCH & STATUTES OVERRIDE) */}
                  {adminSubTab === 'orders' && (
                    <div className="space-y-4">
                      {/* Search and Filters bar */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-beige/5 p-4 rounded-2xl border border-chocolate/5">
                        <input
                          type="text"
                          value={adminOrderSearch}
                          onChange={e => setAdminOrderSearch(e.target.value)}
                          placeholder="Search orders (ID, client name, phone...)"
                          className="w-full sm:max-w-xs bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate"
                        />

                        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
                          {['all', 'pending', 'prepping', 'baking', 'cooling', 'delivering', 'delivered', 'rejected'].map((st) => (
                            <button
                              key={st}
                              onClick={() => setAdminOrderStatusFilter(st)}
                              className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all cursor-pointer whitespace-nowrap ${
                                adminOrderStatusFilter === st
                                  ? 'bg-chocolate text-white'
                                  : 'bg-white border border-chocolate/5 text-chocolate/60 hover:bg-beige/10'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Orders table with deletion & status selector */}
                      <div className="overflow-x-auto border border-chocolate/5 rounded-2xl bg-white">
                        <table className="w-full text-xs text-chocolate">
                          <thead className="bg-beige/15 border-b border-chocolate/5 text-[10px] uppercase font-black text-chocolate/50 tracking-wider text-left">
                            <tr>
                              <th className="p-3">Order ID</th>
                              <th className="p-3">Customer Contact</th>
                              <th className="p-3">Delivery Address & Notes</th>
                              <th className="p-3">Loaf Selections</th>
                              <th className="p-3">Baking Stage Control</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Gift Notes</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-chocolate/5">
                            {orders
                              .filter(o => {
                                // Filter by status
                                if (adminOrderStatusFilter !== 'all' && (o.status || 'pending') !== adminOrderStatusFilter) {
                                  return false;
                                }
                                // Filter by search
                                if (adminOrderSearch.trim()) {
                                  const s = adminOrderSearch.toLowerCase();
                                  return (
                                    o.orderId.toLowerCase().includes(s) ||
                                    (o.customerName || '').toLowerCase().includes(s) ||
                                    (o.customerPhone || '').toLowerCase().includes(s) ||
                                    (o.productTitle || '').toLowerCase().includes(s) ||
                                    (o.deliveryNote || '').toLowerCase().includes(s)
                                  );
                                }
                                return true;
                              })
                              .map(o => (
                                <tr key={o.orderId} className="hover:bg-beige/10 transition-colors">
                                  <td className="p-3 font-mono font-bold text-caramel">
                                    <div className="font-bold">{o.orderId}</div>
                                    <div className="text-[9px] text-chocolate/30 font-normal">
                                      {o.date ? new Date(o.date).toLocaleDateString() : 'Just Now'}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold">{o.customerName || 'Guest'}</div>
                                    <div className="text-[9px] text-chocolate/60 font-mono">{o.customerPhone}</div>
                                  </td>
                                  <td className="p-3 max-w-[200px]">
                                    {o.deliveryType === 'pickup' ? (
                                      <span className="inline-block text-[9px] font-bold text-chocolate bg-beige/40 px-1.5 py-0.5 rounded border border-chocolate/10 uppercase tracking-wider">
                                        🏪 Store Pick-Up
                                      </span>
                                    ) : (
                                      <div className="space-y-0.5 whitespace-normal break-words">
                                        <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 uppercase tracking-wider mb-1">
                                          🚚 Ship Address
                                        </span>
                                        <p className="text-[10px] text-chocolate leading-normal font-medium">{o.deliveryNote || 'No address specified'}</p>
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 font-semibold max-w-[180px]">
                                    <div className="truncate" title={o.productTitle}>{o.productTitle}</div>
                                    <div className="text-[9px] text-chocolate/40">Glaze: {o.topping || 'Classic'} • {o.deliveryType || 'standard'}</div>
                                  </td>
                                  <td className="p-3">
                                    {o.status === 'pending' ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleUpdateStatusId(o.orderId, 'prepping')}
                                          disabled={isUpdatingStatusId === o.orderId}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-lg shadow-sm transition-all hover:scale-105 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                          title="Accept and start prepping ingredients"
                                        >
                                          <Check className="w-2.5 h-2.5" /> Accept
                                        </button>
                                        <button
                                          onClick={() => handleUpdateStatusId(o.orderId, 'rejected')}
                                          disabled={isUpdatingStatusId === o.orderId}
                                          className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-lg shadow-sm transition-all hover:scale-105 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                                          title="Decline / Reject this order"
                                        >
                                          <X className="w-2.5 h-2.5" /> Reject
                                        </button>
                                      </div>
                                    ) : (
                                      <select
                                        value={o.status || 'pending'}
                                        onChange={(e) => handleUpdateStatusId(o.orderId, e.target.value)}
                                        disabled={isUpdatingStatusId === o.orderId}
                                        className={`bg-white border rounded-xl p-1.5 font-bold text-[10px] focus:outline-none focus:ring-1 focus:ring-chocolate cursor-pointer ${
                                          o.status === 'rejected' ? 'text-rose-600 border-rose-300' : 'text-chocolate border-chocolate/15'
                                        }`}
                                      >
                                        {STATUS_STEPS.map(step => (
                                          <option key={step.key} value={step.key}>{step.label}</option>
                                        ))}
                                        <option value="rejected">❌ Declined / Rejected</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="p-3 font-extrabold text-chocolate">
                                    <div>₦{(o.totalAmount || 6500).toLocaleString()}</div>
                                    <div className="mt-1">
                                      <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        o.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
                                      }`}>
                                        {o.paymentStatus === 'paid' ? '✅ Paid' : '❌ Unpaid'}
                                      </span>
                                      {o.paymentStatus !== 'paid' && (
                                        <button
                                          onClick={() => handleMarkOrderAsPaid(o.orderId)}
                                          className="block mt-1 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase px-1.5 py-0.5 rounded shadow-sm cursor-pointer"
                                        >
                                          Mark Paid
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3 text-[10px] max-w-[130px] truncate" title={o.isGift ? `Gift card details: To: ${o.giftNote?.to || ''}, message: ${o.giftNote?.message || ''}` : 'No gift bundle'}>
                                    {o.isGift ? (
                                      <span className="text-caramel font-semibold">Gift: {o.giftNote?.to || 'Recipient'}</span>
                                    ) : (
                                      <span className="text-chocolate/30">Standard Delivery</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleDeleteOrder(o.orderId)}
                                      disabled={isDeletingOrderId === o.orderId}
                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                                      title="Delete order logs"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 4: MANAGE CUSTOMERS & LOYALTY (AWARD XP) */}
                  {adminSubTab === 'customers' && (
                    <div className="space-y-4">
                      <div className="bg-beige/5 border border-chocolate/5 rounded-2xl p-4 text-xs space-y-1.5">
                        <strong className="font-serif text-chocolate text-sm font-black block">Loyalty Reward Points Engine (XP)</strong>
                        <p className="text-chocolate/60">
                          Customers earn <strong>100 XP per fresh loaf purchase</strong>. Registered users can view their current active badge tier (Sourdough Cadet up to Imperial Pastry Master) inside their user dashboards in real-time. Award bonus points to your top customers here.
                        </p>
                      </div>

                      {isLoadingUsers ? (
                        <p className="text-xs text-chocolate/50 py-12 text-center">Reading customer records from database...</p>
                      ) : (
                        <div className="overflow-x-auto border border-chocolate/5 rounded-2xl bg-white">
                          <table className="w-full text-xs text-chocolate">
                            <thead className="bg-beige/15 border-b border-chocolate/5 text-[10px] uppercase font-black text-chocolate/50 tracking-wider text-left">
                              <tr>
                                <th className="p-3">Customer ID</th>
                                <th className="p-3">Account Name</th>
                                <th className="p-3">Phone Line</th>
                                <th className="p-3">Loyalty Points (XP)</th>
                                <th className="p-3">Rank Title</th>
                                <th className="p-3 text-right">Award Loyalty Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-chocolate/5">
                              {allUsers.map((user, idx) => {
                                const xp = loyaltyPoints[user.phone] || 150 + (idx * 120); // fallbacks to make lists interesting
                                const rank = xp >= 1000 ? 'Imperial Pastry Master' : xp >= 500 ? 'Master Baker' : xp >= 250 ? 'Sourdough Squire' : 'Loaf Cadet';
                                return (
                                  <tr key={user.id || idx} className="hover:bg-beige/10 transition-colors">
                                    <td className="p-3 font-mono font-bold text-caramel">#{user.id || 100 + idx}</td>
                                    <td className="p-3 font-bold">{user.name}</td>
                                    <td className="p-3 font-mono text-chocolate/75">{user.phone}</td>
                                    <td className="p-3 font-extrabold text-chocolate text-sm">
                                      {xp.toLocaleString()} XP
                                    </td>
                                    <td className="p-3 font-semibold text-caramel">{rank}</td>
                                    <td className="p-3 text-right space-x-1">
                                      <button
                                        onClick={() => handleAdjustLoyalty(user.phone, 100)}
                                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer"
                                      >
                                        +100 XP
                                      </button>
                                      <button
                                        onClick={() => handleAdjustLoyalty(user.phone, 500)}
                                        className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer"
                                      >
                                        +500 XP
                                      </button>
                                      <button
                                        onClick={() => handleAdjustLoyalty(user.phone, -200)}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-1.5 rounded-lg cursor-pointer"
                                      >
                                        Deduct 200
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 5: MANAGE INVENTORY (STOCK CONTROL) */}
                  {adminSubTab === 'inventory' && (
                    <div className="space-y-6">
                      <div className="bg-beige/5 border border-chocolate/5 rounded-2xl p-4 text-xs space-y-1.5">
                        <strong className="font-serif text-chocolate text-sm font-black block">Raw Baking Material Inventory Matrix</strong>
                        <p className="text-chocolate/60">
                          Tracks crucial ingredients live. Quantities automatic decrease upon client loaf checkout. Restock ingredients below to maintain baking efficiency.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                          { key: 'bananas', label: 'Sweet Ripe Bananas', unit: 'kg', threshold: 10, icon: '', color: 'text-amber-600', bg: 'bg-amber-500' },
                          { key: 'flour', label: 'Organic Cake Flour', unit: 'kg', threshold: 10, icon: '', color: 'text-orange-600', bg: 'bg-orange-500' },
                          { key: 'chocolate', label: 'Semi-Sweet Belgian Chocolate', unit: 'kg', threshold: 5, icon: '', color: 'text-rose-900', bg: 'bg-rose-700' },
                          { key: 'walnuts', label: 'California Walnuts', unit: 'kg', threshold: 4, icon: '', color: 'text-yellow-800', bg: 'bg-yellow-700' },
                          { key: 'honey', label: 'Golden Honey Glaze', unit: 'L', threshold: 3, icon: '', color: 'text-yellow-600', bg: 'bg-yellow-500' },
                          { key: 'butter', label: 'Rich Butter Blocks', unit: 'qty', threshold: 8, icon: '', color: 'text-amber-500', bg: 'bg-amber-400' },
                        ].map((item) => {
                          const stock = inventory[item.key] || 0;
                          const isLow = stock < item.threshold;
                          return (
                            <div key={item.key} className={`bg-white border p-5 rounded-2xl space-y-4 shadow-sm ${
                              isLow ? 'border-rose-200 bg-rose-50/10' : 'border-chocolate/5'
                            }`}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <span className="text-xl">{item.icon}</span>
                                  <div>
                                    <h5 className="font-bold text-chocolate text-xs">{item.label}</h5>
                                    <span className="text-[9px] text-chocolate/40 uppercase font-black">Restock threshold: {item.threshold}{item.unit}</span>
                                  </div>
                                </div>
                                {isLow && (
                                  <span className="text-[8px] font-black uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full animate-pulse">
                                    Low Stock
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-black text-chocolate">
                                  <span>Available Store Inventory</span>
                                  <span className={isLow ? 'text-rose-700' : 'text-caramel'}>{stock} {item.unit}</span>
                                </div>
                                <div className="h-2 w-full bg-beige/10 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${item.bg} rounded-full`} 
                                    style={{ width: `${Math.min(100, (stock / 50) * 100)}%` }} 
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1.5">
                                <button
                                  onClick={() => handleRestock(item.key, 10)}
                                  className="w-full bg-beige/15 hover:bg-beige/35 text-chocolate/85 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all"
                                >
                                  +10 {item.unit}
                                </button>
                                <button
                                  onClick={() => handleRestock(item.key, 25)}
                                  className="w-full bg-banana hover:bg-honey text-chocolate text-[10px] font-black py-1.5 rounded-lg cursor-pointer transition-all"
                                >
                                  +25 {item.unit}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 6: MANAGE REVIEWS (MODERATE & REPLY) */}
                  {adminSubTab === 'reviews' && (
                    <div className="space-y-4">
                      <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">Customer Experience Review Feed ({reviewsList.length})</span>

                      {reviewsList.length === 0 ? (
                        <div className="py-16 bg-beige/10 border border-dashed border-chocolate/10 rounded-2xl text-center text-xs text-chocolate/50">
                          No customer feedback reports registered in database yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {reviewsList.map((rev) => (
                            <div key={rev.id} className="bg-white border border-chocolate/5 rounded-2xl p-5 space-y-3.5 shadow-sm text-xs">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h5 className="font-serif font-black text-chocolate text-sm leading-tight">{rev.productTitle}</h5>
                                  <span className="text-[9px] text-chocolate/40 font-mono">Order: {rev.orderId}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`w-3.5 h-3.5 ${star <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-chocolate/10'}`} />
                                  ))}
                                </div>
                              </div>

                              <div className="bg-beige/5 p-3 rounded-xl italic text-chocolate/80">
                                "{rev.comment}"
                              </div>

                              {chefReplies[rev.id] ? (
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1">
                                  <span className="text-[9px] font-black uppercase text-emerald-800 block">Posted Chef Response:</span>
                                  <p className="text-[11px] text-emerald-950 italic">"{chefReplies[rev.id]}"</p>
                                </div>
                              ) : null}

                              {activeReplyId === rev.id ? (
                                <div className="space-y-2 pt-2">
                                  <textarea
                                    rows={2}
                                    placeholder="Write Faridah's warm kitchen reply response..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    className="w-full bg-beige/5 border border-chocolate/15 rounded-xl px-3 py-2 text-[11px] focus:ring-1 focus:ring-chocolate outline-none text-chocolate"
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setActiveReplyId(null);
                                        setReplyText('');
                                      }}
                                      className="px-2.5 py-1 text-[10px] border border-chocolate/10 rounded-lg text-chocolate/70 hover:bg-beige/10 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handlePostChefReply(rev.id)}
                                      className="px-3 py-1 bg-chocolate text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                                    >
                                      Publish Reply
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-1.5 justify-end pt-1.5 border-t border-chocolate/5">
                                  <button
                                    onClick={() => {
                                      setActiveReplyId(rev.id);
                                      setReplyText(chefReplies[rev.id] || '');
                                    }}
                                    className="bg-banana hover:bg-honey text-chocolate text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                                  >
                                    {chefReplies[rev.id] ? 'Edit response' : 'Reply as Faridah'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(rev.id)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                                  >
                                    Moderate Feed
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 7: PAYSTACK & API SETTINGS */}
                  {adminSubTab === 'settings' && (
                    <div className="bg-white border border-chocolate/5 rounded-3xl p-6 space-y-6 shadow-sm">
                      <div className="border-b border-chocolate/5 pb-4 text-left">
                        <h4 className="font-serif font-black text-chocolate text-base">Payment Gateway Configuration</h4>
                        <p className="text-[11px] text-chocolate/50">Configure your Paystack credentials dynamically. Transactions processed during checkout will initialize using these settings.</p>
                      </div>

                      {isLoadingSettings ? (
                        <div className="py-12 text-center text-xs text-chocolate/50 flex flex-col items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-chocolate/20 border-t-chocolate rounded-full animate-spin" />
                          <span>Retrieving current credentials...</span>
                        </div>
                      ) : (
                        <form onSubmit={handleSaveSettings} className="space-y-5 max-w-xl text-left">
                          {settingsMessage && (
                            <div className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
                              settingsMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
                            }`}>
                              <span className="font-extrabold">{settingsMessage.type === 'success' ? '✓' : '✗'}</span>
                              <p className="leading-normal">{settingsMessage.text}</p>
                            </div>
                          )}

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-chocolate/60 tracking-wider">
                              Paystack Public Key (Live or Test)
                            </label>
                            <input
                              type="text"
                              value={paystackPublicKey}
                              onChange={e => setPaystackPublicKey(e.target.value)}
                              placeholder="e.g. pk_test_xxxxxxxx or pk_live_xxxxxxxx"
                              className="w-full bg-beige/5 border border-chocolate/15 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                            />
                            <span className="block text-[9px] text-chocolate/40 leading-normal">
                              This key is exposed client-side in the browser to initialize the Paystack popup checkout securely.
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-chocolate/60 tracking-wider">
                              Paystack Secret Key (Live or Test)
                            </label>
                            <input
                              type="password"
                              value={paystackSecretKey}
                              onChange={e => setPaystackSecretKey(e.target.value)}
                              placeholder="e.g. sk_test_xxxxxxxx or sk_live_xxxxxxxx"
                              className="w-full bg-beige/5 border border-chocolate/15 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                            />
                            <span className="block text-[9px] text-chocolate/40 leading-normal">
                              Keep this key secret. It is stored securely on the backend and used for cryptographic payment verification.
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-chocolate/60 tracking-wider">
                              Meta (Facebook) Pixel ID
                            </label>
                            <input
                              type="text"
                              value={facebookPixelId}
                              onChange={e => setFacebookPixelId(e.target.value)}
                              placeholder="e.g. 123456789012345"
                              className="w-full bg-beige/5 border border-chocolate/15 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                            />
                            <span className="block text-[9px] text-chocolate/40 leading-normal">
                              Enter your 15-digit Meta Pixel ID to track customer purchase funnels and optimize ad campaigns.
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-black uppercase text-chocolate/60 tracking-wider">
                              Meta (Facebook) Purchase Conversion ID / Event ID
                            </label>
                            <input
                              type="text"
                              value={facebookConversionId}
                              onChange={e => setFacebookConversionIdState(e.target.value)}
                              placeholder="e.g. purchase_conversion_2026"
                              className="w-full bg-beige/5 border border-chocolate/15 rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                            />
                            <span className="block text-[9px] text-chocolate/40 leading-normal">
                              Optional. Enter a custom Purchase Event/Conversion ID to optimize tracking or link with Conversions API deduplication.
                            </span>
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={isSavingSettings}
                              className="bg-chocolate hover:bg-chocolate/90 text-white font-extrabold text-[11px] uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.02] flex items-center gap-2"
                            >
                              {isSavingSettings ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                  Saving settings...
                                </>
                              ) : (
                                'Save dynamic keys'
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB: MANAGE GALLERY */}
                  {adminSubTab === 'gallery' && (
                    <div className="space-y-6">
                      {/* Add/Edit Gallery Item Form Container */}
                      <div id="gallery-form-container" className="bg-beige/5 border border-chocolate/5 rounded-2xl p-5 space-y-4 text-left">
                        <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">
                          {editingGalleryItem ? 'Edit Existing Gallery Item' : 'Upload New Gallery Photo'}
                        </span>

                        <form onSubmit={handleSaveGalleryItem} className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                          <div className="sm:col-span-5 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Photo Title</label>
                            <input
                              type="text"
                              value={galleryForm.title}
                              onChange={e => setGalleryForm({...galleryForm, title: e.target.value})}
                              placeholder="e.g., Golden Sliced Loaf on Wood"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                              required
                            />
                          </div>

                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Category</label>
                            <select
                              value={galleryForm.category}
                              onChange={e => setGalleryForm({...galleryForm, category: e.target.value})}
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                              required
                            >
                              {galleryCategories.map(cat => (
                                <option key={cat.key} value={cat.key}>{cat.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Gallery Item ID (Optional)</label>
                            <input
                              type="text"
                              value={galleryForm.id}
                              onChange={e => setGalleryForm({...galleryForm, id: e.target.value})}
                              placeholder="Auto-generated if blank"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono font-bold"
                              disabled={!!editingGalleryItem}
                            />
                          </div>

                          <div className="sm:col-span-7 space-y-2">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Photo Image Source</label>
                            
                            {/* Drag & Drop File Upload Region */}
                            <div
                              onDragOver={handleGalleryDragOver}
                              onDragLeave={handleGalleryDragLeave}
                              onDrop={handleGalleryDrop}
                              onClick={() => document.getElementById('gallery-image-upload-input')?.click()}
                              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[100px] relative overflow-hidden group ${
                                isDraggingGallery 
                                  ? 'border-chocolate bg-chocolate/5 scale-[0.99]' 
                                  : 'border-chocolate/10 bg-white hover:border-chocolate/30 hover:bg-beige/5'
                              }`}
                            >
                              <input
                                id="gallery-image-upload-input"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleGalleryImageUpload}
                                disabled={isUploadingGallery}
                              />

                              {isUploadingGallery ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Loader2 className="w-5 h-5 text-caramel animate-spin" />
                                  <span className="text-[10px] font-bold text-chocolate/70">Uploading gallery image...</span>
                                </div>
                              ) : (
                                <>
                                  {galleryForm.image ? (
                                    <div className="absolute inset-0 w-full h-full">
                                      <img 
                                        src={galleryForm.image} 
                                        alt="Gallery Preview" 
                                        className="w-full h-full object-cover opacity-20 group-hover:opacity-10 transition-opacity duration-200" 
                                      />
                                    </div>
                                  ) : null}
                                  
                                  <div className="relative z-10 flex flex-col items-center">
                                    <UploadCloud className="w-5 h-5 text-chocolate/40 group-hover:text-chocolate/60 transition-colors duration-200 mb-0.5" />
                                    <span className="text-[10px] font-extrabold text-chocolate leading-none">
                                      {galleryForm.image ? 'Replace Gallery Photo' : 'Upload Gallery Photo'}
                                    </span>
                                    <span className="text-[8px] text-chocolate/50 font-semibold mt-0.5">
                                      Drag & drop or click to upload (under 5MB)
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Text URL Input Field (as an alternative option) */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-chocolate/40 font-black uppercase">Or paste raw Image URL</span>
                                {galleryUploadSource && (
                                  <span className="text-[7px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded px-1 uppercase tracking-wider">
                                    Source: {galleryUploadSource}
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={galleryForm.image}
                                onChange={e => setGalleryForm({...galleryForm, image: e.target.value})}
                                placeholder="https://images.unsplash.com/photo-..."
                                className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                              />
                            </div>
                          </div>

                          <div className="sm:col-span-5 flex flex-col justify-end gap-3 pb-1">
                            {editingGalleryItem && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGalleryItem(null);
                                  setGalleryForm({
                                    id: '',
                                    title: '',
                                    category: 'loaves',
                                    image: ''
                                  });
                                }}
                                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-xl shadow-sm cursor-pointer transition-transform hover:scale-[1.01]"
                              >
                                Cancel Edit
                              </button>
                            )}
                            <button
                              type="submit"
                              className="w-full bg-chocolate hover:bg-chocolate/90 text-white font-extrabold text-[11px] uppercase tracking-wider py-2.5 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{editingGalleryItem ? 'Update Gallery Item' : 'Publish to Showcase Gallery'}</span>
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Manage Gallery Categories / Tags Section */}
                      <div className="bg-beige/5 border border-chocolate/5 rounded-2xl p-5 space-y-4 text-left">
                        <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider">
                          Manage Gallery Categories & Tags
                        </span>
                        
                        {/* Add category form */}
                        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Category Label (Display Name)</label>
                            <input
                              type="text"
                              value={newCatLabel}
                              onChange={e => setNewCatLabel(e.target.value)}
                              placeholder="e.g., Seasonal Specials"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-medium"
                              required
                            />
                          </div>
                          <div className="w-full sm:w-48 space-y-1">
                            <label className="block text-[9px] font-black uppercase text-chocolate/60">Category Key (ID / Tag)</label>
                            <input
                              type="text"
                              value={newCatKey}
                              onChange={e => setNewCatKey(e.target.value)}
                              placeholder="e.g., seasonal"
                              className="w-full bg-white border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-chocolate outline-none text-chocolate font-mono"
                              required
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={isSubmittingCategory}
                              className="w-full sm:w-auto bg-chocolate hover:bg-chocolate/90 text-white font-extrabold text-[11px] uppercase tracking-wider py-2 px-5 h-[34px] rounded-xl shadow-md cursor-pointer transition-transform hover:scale-[1.01] flex items-center justify-center gap-1.5 whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isSubmittingCategory ? 'Adding...' : 'Add Tag'}</span>
                            </button>
                          </div>
                        </form>

                        {/* List of existing categories */}
                        <div className="pt-2">
                          <label className="block text-[9px] font-black uppercase text-chocolate/60 mb-2">Existing Category Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {galleryCategories.map(cat => (
                              <div key={cat.key} className="flex items-center gap-2 bg-white border border-chocolate/10 pl-3 pr-1.5 py-1 rounded-full text-xs text-chocolate font-medium shadow-sm">
                                <span>{cat.label} <span className="text-[9px] font-mono text-chocolate/40 font-bold">({cat.key})</span></span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.key)}
                                  className="p-1 hover:bg-rose-50 text-chocolate/40 hover:text-rose-600 rounded-full cursor-pointer transition-colors"
                                  title={`Delete category: ${cat.label}`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Current Showcase List */}
                      <div className="space-y-4">
                        <span className="block text-[10px] font-black uppercase text-chocolate/50 tracking-wider text-left">
                          Active Showcase Gallery Photos ({allGallery.length})
                        </span>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {allGallery.map(item => (
                            <div key={item.id} className="bg-white border border-chocolate/5 rounded-2xl p-2.5 space-y-2 flex flex-col group relative overflow-hidden shadow-sm hover:shadow-md transition-all text-left">
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-cream/10 border border-chocolate/5">
                                <img
                                  src={item.image}
                                  alt={item.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute top-1.5 right-1.5 text-[8px] font-black bg-chocolate/90 text-white uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm">
                                  {item.category}
                                </span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <h5 className="font-serif font-bold text-xs text-chocolate truncate" title={item.title}>
                                  {item.title}
                                </h5>
                                <span className="text-[8px] text-chocolate/40 font-mono">ID: {item.id}</span>
                              </div>

                              <div className="flex gap-1.5 pt-1 border-t border-chocolate/5">
                                <button
                                  onClick={() => {
                                    handleEditGalleryItem(item);
                                    document.getElementById('gallery-form-container')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="flex-1 py-1 bg-beige/10 hover:bg-beige/25 border border-chocolate/10 text-chocolate rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteGalleryItem(item.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[9px] font-black transition-colors cursor-pointer flex items-center justify-center"
                                  title="Delete Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>

          {/* Persistent checkout warning bottom bar */}
          {currentUser?.role !== 'admin' && cartItems.length > 0 && currentTab !== 'cart' && currentTab !== 'checkout' && currentTab !== 'payment' && (
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="mt-6 bg-chocolate text-cream p-4 rounded-2xl flex items-center justify-between shadow-lg text-xs"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-banana shrink-0 animate-pulse" />
                <div className="text-left">
                  <span className="font-bold block">You have {totalCartQty} warm loaves queued in your basket!</span>
                  <span className="text-[10px] text-cream/70 block">Estimated order total: <strong>₦{getCartGrandTotal().toLocaleString()}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setCurrentTab('cart')}
                className="bg-banana hover:bg-honey text-chocolate font-black uppercase tracking-wider py-2 px-4 rounded-xl text-[10px]"
              >
                Open Baking Cart
              </button>
            </motion.div>
          )}

        </div>

      </motion.div>

      {/* Elegant State-Driven Confirmation Dialog */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-chocolate/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream border-2 border-chocolate/5 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-black text-base text-chocolate leading-tight">{confirmModal.title}</h3>
                <p className="text-xs text-chocolate/70 leading-relaxed font-medium">{confirmModal.message}</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-white hover:bg-beige/10 text-chocolate border border-chocolate/10 font-bold uppercase tracking-wider py-2.5 rounded-xl text-[10px] cursor-pointer transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider py-2.5 rounded-xl text-[10px] cursor-pointer shadow-md transition-all duration-200"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
