import React, { useState } from 'react';
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
import ExitIntentPopup from './components/ExitIntentPopup';
import FloatingWhatsApp from './components/FloatingWhatsApp';
import { Product } from './types';
import { products } from './data';

export default function App() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Trigger default order modal (e.g. Classic Plain loaf) when clicking generic "Order Now"
  const handleOpenDefaultOrder = () => {
    const classicProduct = products.find((p) => p.id === 'classic') || products[0];
    setSelectedProduct(classicProduct);
    setIsOrderModalOpen(true);
  };

  const handleProductOrder = (product: Product) => {
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
        onOrderNowClick={handleOpenDefaultOrder}
      />

      {/* Hero Header Section */}
      <Hero
        onOrderNowClick={handleOpenDefaultOrder}
        onViewMenuClick={() => handleScrollToSection('our-bread')}
      />

      {/* Trust Stamp Badges Bar */}
      <TrustBadges />

      {/* Interactive Products Menu Grid */}
      <BestSellers
        onProductOrder={handleProductOrder}
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

      {/* Unified checkout and customisation modal */}
      <OrderModal
        product={selectedProduct}
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />

      {/* Continuous exit intent prompt */}
      <ExitIntentPopup onClaimDiscount={handleOpenDefaultOrder} />

      {/* Sticky floating bottom-right WhatsApp action trigger */}
      <FloatingWhatsApp />
    </div>
  );
}
