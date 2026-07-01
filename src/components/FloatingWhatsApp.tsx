import React from 'react';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

export default function FloatingWhatsApp() {
  const handleClick = () => {
    const text = encodeURIComponent("Hello Baked by Doja! I am browsing your stunning website and would love to ask about your fresh banana bread loaves.");
    window.open(`https://wa.me/2347025566294?text=${text}`, '_blank');
  };

  return (
    <motion.button
      id="floating-whatsapp-btn"
      onClick={handleClick}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', delay: 2, stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 z-40 bg-leaf hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl transition-colors cursor-pointer flex items-center justify-center border border-white/20 group"
      aria-label="Chat on WhatsApp"
    >
      {/* Floating tooltip */}
      <span className="absolute right-14 bg-chocolate text-cream text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
        Chat With Doja
      </span>
      <MessageCircle className="w-6 h-6 fill-current text-white" />
    </motion.button>
  );
}
