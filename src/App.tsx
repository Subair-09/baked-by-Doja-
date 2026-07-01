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
import ExitIntentPopup from './components/ExitIntentPopup';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { Product } from './types';
import { products as defaultProducts } from './data';

export default function App() {
  const [activeProducts, setActiveProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      return stored ? JSON.parse(stored) : defaultProducts;
    } catch {
      return defaultProducts;
    }
  });

  useEffect(() => {
    const checkProducts = () => {
      try {
        const stored = localStorage.getItem('baked_by_doja_products');
        if (stored) {
          setActiveProducts(JSON.parse(stored));
        }
      } catch (e) {}
    };
    const interval = setInterval(checkProducts, 1000);
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
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; role?: string } | null>(() => {
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

  const handleAuthSuccess = (user: { name: string; phone: string; role?: string }) => {
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
              localStorage.setItem('baked_by_doja_products', JSON.stringify(updated));
              setActiveProducts(updated);
              window.dispatchEvent(new Event('storage'));
            }}
          />

          {/* Value Proposition Benefit Bento Grid */}
          <WhyChooseUs />

          {/* Modern High Fidelity Testimonials */}
          <Testimonials />

          {/* Pinterest-style Gallery with zoomable Lightbox */}
          <Gallery />

          {/* Step by step Interactive Process Chart */}
          <HowItWorks />

          {/* Limited-time Free Shipping Discount Banner */}
          <OfferBanner onOrderNowClick={handleOpenDefaultOrder} />

          {/* Accordion FAQ Section */}
          <FAQ />

          {/* Custom Contact Form, Call-to-action & Footer */}
          <ContactFooter onOrderNowClick={handleOpenDefaultOrder} />

          {/* Continuous exit intent prompt */}
          <ExitIntentPopup onClaimDiscount={handleOpenDefaultOrder} />
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
          onProductsChange={(updated) => {
            setActiveProducts(updated);
            localStorage.setItem('baked_by_doja_products', JSON.stringify(updated));
            window.dispatchEvent(new Event('storage'));
          }}
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
