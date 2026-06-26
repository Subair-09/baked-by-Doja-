import React from 'react';
import { motion } from 'motion/react';
import { ChefHat, ShieldCheck, Sparkles, Coins, Truck, Gift, Heart, Utensils } from 'lucide-react';
import { Benefit } from '../types';
import { benefits } from '../data';

// Helper to render beautiful vector icons or Lucide icons
const renderIcon = (iconName: string) => {
  const iconClass = "w-6 h-6 text-caramel";
  switch (iconName) {
    case 'ChefHat':
      return <ChefHat className={iconClass} />;
    case 'Banana':
      // Gorgeous custom banana SVG
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-banana">
          <path d="M12 2c0 0-4 4-4 9s3 8 7 11" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M15 3c0 0-3 3-3 8s2.5 7.5 5.5 10.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 2s-1 .5-1.5 1.5S9 5.5 9 5.5" strokeLinecap="round" />
        </svg>
      );
    case 'Cookie':
      return <Utensils className={iconClass} />;
    case 'ShieldCheck':
      return <ShieldCheck className={iconClass} />;
    case 'Sparkles':
      return <Sparkles className={iconClass} />;
    case 'Coins':
      return <Coins className={iconClass} />;
    case 'Truck':
      return <Truck className={iconClass} />;
    case 'Gift':
      return <Gift className={iconClass} />;
    default:
      return <Heart className={iconClass} />;
  }
};

export default function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="py-20 bg-cream/40 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/2 left-[-100px] w-80 h-80 bg-banana/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-[-100px] w-96 h-96 bg-caramel/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold tracking-widest text-leaf uppercase bg-emerald-50 px-3.5 py-1.5 rounded-full border border-leaf/10">
            Artisanal Quality
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            Why Choose Baked by Doja?
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            We are dedicated to crafting the finest banana bread experience. Every single slice reflects our obsession with quality, freshness, and genuine home-baked flavor.
          </p>
        </div>

        {/* Benefits Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit, idx) => (
            <motion.div
              key={benefit.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.05 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm hover:shadow-md border border-chocolate/5 hover:border-caramel/10 transition-all duration-300 flex flex-col space-y-4 text-chocolate"
            >
              {/* Icon Container */}
              <div className="w-12 h-12 rounded-2xl bg-cream border border-chocolate/5 flex items-center justify-center shadow-inner shrink-0">
                {renderIcon(benefit.iconName)}
              </div>

              {/* Title & Desc */}
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-serif font-extrabold tracking-tight">
                  {benefit.title}
                </h3>
                <p className="text-xs sm:text-sm text-chocolate/70 leading-relaxed font-sans">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
