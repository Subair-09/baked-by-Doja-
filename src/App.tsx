import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBadges from './components/TrustBadges';
import BestSellers from './components/BestSellers';
import WhyChooseUs from './components/WhyChooseUs';
import Testimonials from './components/Testimonials';
import Gallery from './components/Gallery';
import HowItWorks from './components/HowItWorks';
import OfferBanner from './components/OfferBanner';
import FAQ from './components/FAQ';
import ContactFooter from './components/ContactFooter';
import OrderModal from './components/OrderModal';
import UserDashboard from './components/UserDashboard';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { Product, GalleryItem } from './types';
import { products as defaultProducts, gallery as defaultGallery } from './data';
import { initFacebookPixel, setFacebookConversionId } from './utils/pixel';

export default function App() {
  const [activeProducts, setActiveProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      return stored ? JSON.parse(stored) : defaultProducts;
    } catch {
      return defaultProducts;
    }
  });

  const [activeGallery, setActiveGallery] = useState<GalleryItem[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_gallery');
      return stored ? JSON.parse(stored) : defaultGallery;
    } catch {
      return defaultGallery;
    }
  });

  useEffect(() => {
    const loadProductsFromServer = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products)) {
            setActiveProducts(data.products);
            localStorage.setItem('baked_by_doja_products', JSON.stringify(data.products));
          }
        }
      } catch (err) {
        console.error("Error loading products from server:", err);
      }
    };
    const loadGalleryFromServer = async () => {
      try {
        const res = await fetch('/api/gallery');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.gallery)) {
            setActiveGallery(data.gallery);
            localStorage.setItem('baked_by_doja_gallery', JSON.stringify(data.gallery));
          }
        }
      } catch (err) {
        console.error("Error loading gallery from server:", err);
      }
    };
    const loadPublicKeysAndPixel = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.facebook_pixel_id) {
              initFacebookPixel(data.facebook_pixel_id);
            }
            if (data.facebook_conversion_id) {
              setFacebookConversionId(data.facebook_conversion_id);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load public keys / pixel settings:", err);
      }
    };
    loadProductsFromServer();
    loadGalleryFromServer();
    loadPublicKeysAndPixel();
  }, []);

  const saveProducts = async (updated: Product[]) => {
    setActiveProducts(updated);
    localStorage.setItem('baked_by_doja_products', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify({ products: updated })
      });
    } catch (e) {
      console.error('Failed to sync products to database:', e);
    }
  };

  const saveGallery = async (updated: GalleryItem[]) => {
    setActiveGallery(updated);
    localStorage.setItem('baked_by_doja_gallery', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
      }
      await fetch('/api/gallery', {
        method: 'POST',
        headers,
        body: JSON.stringify({ gallery: updated })
      });
    } catch (e) {
      console.error('Failed to sync gallery to database:', e);
    }
  };

  const refreshProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setActiveProducts(data.products);
          localStorage.setItem('baked_by_doja_products', JSON.stringify(data.products));
          window.dispatchEvent(new Event('storage'));
          return data.products;
        }
      }
    } catch (err) {
      console.error("Error loading products from server:", err);
    }
    return null;
  };

  const refreshGallery = async () => {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.gallery)) {
          setActiveGallery(data.gallery);
          localStorage.setItem('baked_by_doja_gallery', JSON.stringify(data.gallery));
          window.dispatchEvent(new Event('storage'));
          return data.gallery;
        }
      }
    } catch (err) {
      console.error("Error loading gallery from server:", err);
    }
    return null;
  };

  useEffect(() => {
    const checkProductsAndGallery = () => {
      try {
        const stored = localStorage.getItem('baked_by_doja_products');
        if (stored) {
          const parsed = JSON.parse(stored);
          setActiveProducts(prev => {
            if (JSON.stringify(parsed) !== JSON.stringify(prev)) {
              return parsed;
            }
            return prev;
          });
        }
      } catch (e) {}
      try {
        const storedGal = localStorage.getItem('baked_by_doja_gallery');
        if (storedGal) {
          const parsedGal = JSON.parse(storedGal);
          setActiveGallery(prev => {
            if (JSON.stringify(parsedGal) !== JSON.stringify(prev)) {
              return parsedGal;
            }
            return prev;
          });
        }
      } catch (e) {}
    };
    const interval = setInterval(checkProductsAndGallery, 2000);
    return () => clearInterval(interval);
  }, []);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'landing' | 'dashboard'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('payment_success') || params.has('reference')) {
        return 'dashboard';
      }
      return window.location.hash === '#dashboard' ? 'dashboard' : 'landing';
    } catch {
      return 'landing';
    }
  });
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; role?: string; token?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('baked_by_doja_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [editProductOnDashboard, setEditProductOnDashboard] = useState<Product | null>(null);
  const [dashboardTab, setDashboardTab] = useState<string>('browse');

  const isCartEmpty = () => {
    try {
      const stored = localStorage.getItem('baked_by_doja_cart');
      const cart = stored ? JSON.parse(stored) : [];
      return cart.length === 0;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(window.location.hash === '#dashboard' ? 'dashboard' : 'landing');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      window.location.hash = 'dashboard';
    } else {
      if (window.location.hash === '#dashboard') {
        window.location.hash = '';
      }
    }
  }, [currentPage]);

  const handleAuthSuccess = (user: { name: string; phone: string; role?: string; token?: string }) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentPage('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('baked_by_doja_current_user');
    setCurrentUser(null);
  };

  // Trigger default order modal or specific product (e.g. for reorders)
  const handleOpenOrderWithProduct = (productTitle?: string) => {
    if (currentUser === null && isCartEmpty()) {
      setDashboardTab('auth');
      setCurrentPage('dashboard');
      return;
    }

    if (productTitle) {
      const target = activeProducts.find((p) => p.title.toLowerCase() === productTitle.toLowerCase() || p.id.toLowerCase() === productTitle.toLowerCase());
      if (target) {
        setSelectedProduct(target);
        setIsOrderModalOpen(true);
        return;
      }
    }
    const classicProduct = activeProducts.find((p) => p.id === 'classic') || activeProducts[0];
    setSelectedProduct(classicProduct);
    setIsOrderModalOpen(true);
  };

  const handleOpenDefaultOrder = () => handleOpenOrderWithProduct();

  const handleProductOrder = (product: Product) => {
    if (currentUser === null && isCartEmpty()) {
      setDashboardTab('auth');
      setCurrentPage('dashboard');
      return;
    }

    setSelectedProduct(product);
    setIsOrderModalOpen(true);
  };

  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-cream min-h-screen relative font-sans antialiased selection:bg-banana selection:text-chocolate overflow-x-hidden text-chocolate">
      {/* Navbar with global controls */}
      <Navbar
        onOrderNowClick={() => handleOpenOrderWithProduct()}
        currentUser={currentUser}
        onLogout={handleLogout}
        onViewDashboardClick={() => {
          setDashboardTab(currentUser ? 'browse' : 'auth');
          setCurrentPage('dashboard');
        }}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {currentPage === 'landing' ? (
        <>
          {/* Hero Header Section */}
          <Hero
            onOrderNowClick={() => handleOpenOrderWithProduct()}
            onViewMenuClick={() => handleScrollToSection('our-bread')}
          />

          {/* Trust Stamp Badges Bar */}
          <TrustBadges />

          {/* Interactive Products Menu Grid */}
          <BestSellers
            onProductOrder={handleProductOrder}
            currentUser={currentUser}
            onEditProduct={(product) => {
              setEditProductOnDashboard(product);
              setCurrentPage('dashboard');
            }}
            products={activeProducts}
            onDeleteProduct={(id) => {
              const updated = activeProducts.filter(p => p.id !== id);
              saveProducts(updated);
            }}
          />

          {/* Value Proposition Benefit Bento Grid */}
          <WhyChooseUs />

          {/* Modern High Fidelity Testimonials */}
          <Testimonials />

          {/* Pinterest-style Gallery with zoomable Lightbox */}
          <Gallery gallery={activeGallery} />

          {/* Step by step Interactive Process Chart */}
          <HowItWorks />

          {/* Limited-time Free Shipping Discount Banner */}
          <OfferBanner onOrderNowClick={handleOpenDefaultOrder} />

          {/* Accordion FAQ Section */}
          <FAQ />

          {/* Custom Contact Form, Call-to-action & Footer */}
          <ContactFooter onOrderNowClick={handleOpenDefaultOrder} />
        </>
      ) : (
        /* Modern Live Tracker & Loyalty Dashboard as a standalone page */
        <UserDashboard
          isOpen={currentPage === 'dashboard'}
          onClose={() => setCurrentPage('landing')}
          currentUser={currentUser}
          onOrderNowClick={handleOpenOrderWithProduct}
          onAuthSuccess={handleAuthSuccess}
          editProductOnLoad={editProductOnDashboard}
          onResetEditProductOnLoad={() => setEditProductOnDashboard(null)}
          products={activeProducts}
          onProductsChange={saveProducts}
          onRefreshProducts={refreshProducts}
          gallery={activeGallery}
          onGalleryChange={saveGallery}
          onRefreshGallery={refreshGallery}
          initialTab={dashboardTab}
        />
      )}

      {/* Unified checkout and customisation modal - accessible from both landing and dashboard */}
      <OrderModal
        product={selectedProduct}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Sticky floating bottom-right WhatsApp action trigger */}
      <FloatingWhatsApp />
    </div>
  );
}
