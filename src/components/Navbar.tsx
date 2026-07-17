import React, { useState, useEffect } from 'react';
import { Menu, X, ShoppingBag, Globe, Database, ChevronDown, ChevronUp, LogOut, LayoutDashboard, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  onOrderNowClick: () => void;
  currentUser: { name: string; phone: string; role?: string } | null;
  onLogout: () => void;
  onViewDashboardClick: () => void;
  currentPage: 'landing' | 'dashboard';
  setCurrentPage: (page: 'landing' | 'dashboard') => void;
}

export default function Navbar({ onOrderNowClick, currentUser, onLogout, onViewDashboardClick, currentPage, setCurrentPage }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; storageConnected?: boolean; source: string; message?: string; details?: string }>({
    connected: false,
    storageConnected: false,
    source: 'Checking Connection Status...',
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch('/api/db/status');
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data);
        }
      } catch (e) {
        setDbStatus({ connected: false, source: 'Offline sandbox' });
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 10000);
    return () => clearInterval(interval);
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
          {/* Logo & DB Pill */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center space-x-2 group"
            >
              <span className="text-2xl sm:text-3xl font-serif font-black text-chocolate tracking-tight flex items-center">
                Baked <span className="text-banana ml-1">by</span> <span className="text-caramel ml-1">Doja</span>
                <span className="text-xl ml-1 animate-pulse"></span>
              </span>
            </a>

            {/* Connection Status Indicators */}
            <div className="flex items-center gap-2 ml-2">
              {/* Database Status Indicator Dot */}
              {dbStatus.connected ? (
                <div 
                  className="relative flex h-2.5 w-2.5 cursor-help"
                  title={dbStatus.details || "Connected to Database Server"}
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
              ) : (
                <div 
                  className="h-2.5 w-2.5 rounded-full bg-amber-400 cursor-help"
                  title={dbStatus.message || "Database credentials not configured. App running in Sandbox mode with local memory."}
                />
              )}

              {/* Storage Status Indicator Dot */}
              {dbStatus.storageConnected ? (
                <div 
                  className="relative flex h-2.5 w-2.5 cursor-help"
                  title="Connected to Cloud Storage"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                </div>
              ) : (
                <div 
                  className="h-2.5 w-2.5 rounded-full bg-slate-300 cursor-help"
                  title="Cloud Storage credentials not configured. App running with local image fallback. Add AZURE_STORAGE_CONNECTION_STRING to Secrets."
                />
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
             {navLinks.map((link) => (
               <a
                 key={link.name}
                 href={link.href}
                 onClick={() => setCurrentPage('landing')}
                 className="text-chocolate/80 hover:text-chocolate font-medium text-sm transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-caramel hover:after:w-full after:transition-all after:duration-300"
               >
                 {link.name}
               </a>
             ))}
          </nav>

          {/* Right Controls */}
          <div className="hidden sm:flex items-center space-x-4">
            {currentUser && (
              <div className="relative">
                {/* Profile Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2.5 bg-white hover:bg-beige/30 border border-chocolate/10 px-4 py-2 rounded-full shadow-sm transition-all duration-300 cursor-pointer select-none"
                >
                  <div className="w-6 h-6 rounded-full bg-caramel/10 border border-caramel/20 flex items-center justify-center text-caramel font-black text-xs">
                    {currentUser.role === 'admin' ? 'A' : currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[11px] font-black text-chocolate tracking-wide uppercase leading-none">
                      {currentUser.role === 'admin' ? 'Admin Faridah' : currentUser.name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-chocolate/50 leading-none mt-0.5">
                      {currentUser.role === 'admin' ? 'Store Owner' : 'Customer'}
                    </span>
                  </div>
                  {isProfileDropdownOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 text-chocolate/50 shrink-0 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-chocolate/50 shrink-0 transition-transform duration-200" />
                  )}
                </button>

                {/* Click Outside overlay */}
                {isProfileDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfileDropdownOpen(false)} 
                  />
                )}

                {/* Dropdown Card */}
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 bg-white border border-chocolate/10 rounded-2xl shadow-xl py-2 z-50 overflow-hidden"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-2.5 bg-beige/10 border-b border-chocolate/5">
                        <p className="text-[10px] uppercase font-black tracking-wider text-chocolate/40">Logged In User</p>
                        <p className="text-xs font-bold text-chocolate truncate">{currentUser.name}</p>
                        <p className="text-[9px] font-mono text-chocolate/60 truncate mt-0.5">{currentUser.phone}</p>
                      </div>

                      {/* Dropdown Items */}
                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onViewDashboardClick();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-chocolate hover:bg-beige/40 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-caramel shrink-0" />
                          <span>{currentUser.role === 'admin' ? 'Admin Center' : 'Baking Dashboard'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

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
              {currentUser && (
                <div className="px-4 py-3 bg-beige/50 rounded-xl flex items-center justify-between border border-chocolate/5 mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-caramel/10 flex items-center justify-center text-caramel font-bold text-xs select-none">
                      {currentUser.role === 'admin' ? 'A' : currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-chocolate">
                        {currentUser.role === 'admin' ? 'Admin Faridah' : `Hey, ${currentUser.name}`}
                      </div>
                      <div className="text-[10px] text-chocolate/60">{currentUser.phone}</div>
                      <button 
                        onClick={() => {
                          setIsOpen(false);
                          onViewDashboardClick();
                        }}
                        className="text-[10px] text-emerald-700 hover:underline font-bold mt-1 block"
                      >
                        {currentUser.role === 'admin' ? 'Admin Center' : 'Baking Dashboard'}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onLogout();
                    }}
                    className="text-xs text-caramel font-bold hover:underline cursor-pointer"
                  >
                    Log out
                  </button>
                </div>
              )}
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    setIsOpen(false);
                    setCurrentPage('landing');
                  }}
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
