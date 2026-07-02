import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle, ArrowRight } from 'lucide-react';

interface HeroProps {
  onOrderNowClick: () => void;
  onViewMenuClick: () => void;
}

export default function Hero({ onOrderNowClick, onViewMenuClick }: HeroProps) {
  return (
    <section
      id="home"
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden min-h-screen flex items-center"
      style={{
        background: 'linear-gradient(135deg, #FFF8F0 0%, #F5EBDD 35%, #F4C430 100%)',
      }}
    >
      {/* Background Leaves & Accents */}
      <div className="absolute top-10 left-[-100px] w-[300px] h-[300px] bg-leaf/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-[-100px] w-[400px] h-[400px] bg-banana/20 rounded-full filter blur-3xl pointer-events-none" />

      {/* Decorative banana leaves patterns */}
      <div className="absolute top-20 right-5 opacity-5 w-40 h-40 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-chocolate">
          <path d="M10,80 Q30,40 80,10 Q60,50 10,80 Z" />
        </svg>
      </div>
      <div className="absolute bottom-20 left-10 opacity-5 w-48 h-48 pointer-events-none select-none">
        <svg viewBox="0 0 100 100" fill="currentColor" className="text-leaf">
          <path d="M10,90 C30,70 70,30 90,10 C70,30 30,70 10,90 Z" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Text Column */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col space-y-6 text-chocolate"
          >
            {/* Tagline / Breadcrumb */}
            <div className="inline-flex items-center space-x-2 bg-cream/80 border border-chocolate/10 px-3 py-1.5 rounded-full w-fit self-start shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-leaf animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-wider text-caramel">
                Where Every Slice Feels Like Home
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black leading-[1.1] tracking-tight">
              Freshly Baked <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-chocolate to-caramel underline decoration-banana decoration-wavy">
                Banana Bread
              </span> <br />
              You’ll Fall in Love With
            </h1>

            {/* Features Stacks */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-cream/50 backdrop-blur-sm border border-chocolate/5 p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl font-bold font-serif text-caramel">Soft.</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Texture</span>
              </div>
              <div className="bg-cream/50 backdrop-blur-sm border border-chocolate/5 p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl font-bold font-serif text-caramel">Moist.</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Crumb</span>
              </div>
              <div className="bg-cream/50 backdrop-blur-sm border border-chocolate/5 p-3 rounded-2xl shadow-sm text-center">
                <span className="block text-xl font-bold font-serif text-caramel">Rich.</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Flavor</span>
              </div>
            </div>

            {/* Sub-description list */}
            <p className="text-base sm:text-lg text-chocolate/80 leading-relaxed font-sans max-w-xl">
              Made with real hand-ripened sweet bananas, gourmet sweet cream butter, and zero artificial preservatives. Freshly baked daily and delivered straight to your doorstep warm.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <button
                id="hero-whatsapp-btn"
                onClick={() => {
                  const message = encodeURIComponent("Hello Baked by Doja! I would love to order some of your famous fresh banana bread!");
                  window.open(`https://wa.me/2347025566294?text=${message}`, '_blank');
                }}
                className="bg-leaf hover:bg-leaf/90 text-white font-semibold text-base px-8 py-4 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                Order on WhatsApp
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                id="hero-menu-btn"
                onClick={onViewMenuClick}
                className="bg-cream hover:bg-beige text-chocolate border border-chocolate/20 font-semibold text-base px-8 py-4 rounded-full shadow-md transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 text-center cursor-pointer"
              >
                View Menu
              </button>
            </div>
          </motion.div>

          {/* Right Image Column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="relative flex justify-center items-center"
          >
            {/* Image Wrapper with organic frame shadow */}
            <div className="relative w-full max-w-md sm:max-w-lg aspect-square sm:aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/60 animate-float bg-chocolate/10">
              <img
                src="https://imgur.com/hI3nWDi.png"
                alt="Freshly sliced Baked by Doja Banana Bread served with walnuts, bananas, and morning coffee"
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-6 right-6 text-white text-xs drop-shadow-md flex items-center justify-between">
                <span>Baked by Doja Loaf Serving</span>
                <span>Warm &amp; Moist</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
