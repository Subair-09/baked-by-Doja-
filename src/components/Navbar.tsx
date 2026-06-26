import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onOrderNowClick: () => void;
}

export default function Navbar({ onOrderNowClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Our Bread', href: '#our-bread' },
    { name: 'Why Choose Us', href: '#why-choose-us' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <header
      id="navbar"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-cream/90 backdrop-blur-md shadow-md border-b border-chocolate/5 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center space-x-2 group">
            <span className="text-2xl sm:text-3xl font-serif font-black text-chocolate tracking-tight flex items-center">
              Baked <span className="text-banana ml-1">by</span> <span className="text-caramel ml-1">Doja</span>
              <span className="text-xl ml-1 animate-pulse">🍌</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-chocolate/80 hover:text-chocolate font-medium text-sm transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-caramel hover:after:w-full after:transition-all after:duration-300"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="hidden sm:flex items-center space-x-4">
            {/* Order Now Button */}
            <button
              id="nav-order-btn"
              onClick={onOrderNowClick}
              className="bg-banana text-chocolate border border-chocolate/10 hover:bg-honey font-sans font-semibold text-sm px-6 py-2.5 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Order Now
            </button>
          </div>

          {/* Mobile Menu & Controls */}
          <div className="flex lg:hidden items-center space-x-3">
            {/* Mobile Order Button Icon */}
            <button
              id="mobile-order-shortcut-btn"
              onClick={onOrderNowClick}
              className="p-2 rounded-full bg-banana text-chocolate shadow-sm"
              aria-label="Order Now"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>

            {/* Hamburger Toggle */}
            <button
              id="navbar-toggle-btn"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-chocolate hover:bg-beige transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-cream border-b border-chocolate/10 shadow-lg overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-chocolate hover:bg-beige font-medium transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-chocolate/10 flex flex-col items-center space-y-4 px-4">
                <button
                  id="mobile-drawer-order-btn"
                  onClick={() => {
                    setIsOpen(false);
                    onOrderNowClick();
                  }}
                  className="w-full bg-banana text-chocolate text-center py-3.5 rounded-full font-semibold shadow-md flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Order Fresh Bread Now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
