import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Flame, Copy, Check } from 'lucide-react';

interface ExitIntentPopupProps {
  onClaimDiscount: () => void;
}

export default function ExitIntentPopup({ onClaimDiscount }: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    // 1. Detect mouse leave (Exit Intent)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY < 20 && !hasTriggered) {
        setIsVisible(true);
        setHasTriggered(true);
        localStorage.setItem('doja_exit_intent_shown', 'true');
      }
    };

    // 2. Fallback timer (after 15 seconds) if user is idle/mobile doesn't have mouse leave
    const timer = setTimeout(() => {
      const shown = localStorage.getItem('doja_exit_intent_shown');
      if (!shown && !hasTriggered) {
        setIsVisible(true);
        setHasTriggered(true);
        localStorage.setItem('doja_exit_intent_shown', 'true');
      }
    }, 15000);

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timer);
    };
  }, [hasTriggered]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText('DOJALOVE10');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
          {/* Blur Background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsVisible(false)}
            className="fixed inset-0 bg-chocolate/70 backdrop-blur-sm"
          />

          {/* Card Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="relative bg-cream max-w-md w-full rounded-[2.5rem] p-8 sm:p-10 border-4 border-white shadow-2xl text-chocolate z-10 text-center space-y-6"
          >
            {/* Close */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute top-4 right-4 bg-white/80 hover:bg-banana text-chocolate p-2 rounded-full transition-colors focus:outline-none cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sparkly Icons */}
            <div className="mx-auto w-16 h-16 rounded-3xl bg-banana flex items-center justify-center shadow-lg relative">
              <span className="text-3xl animate-bounce">🍞</span>
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Flame className="w-2.5 h-2.5 fill-current" />
                <span>Hot</span>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <span className="text-[10px] bg-banana text-chocolate px-3 py-1.5 rounded-full font-black uppercase tracking-widest">
                Before You Go!
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight pt-2">
                Get 10% Off Your <br />First Sunrise Loaf!
              </h3>
              <p className="text-xs sm:text-sm text-chocolate/75 max-w-xs mx-auto leading-relaxed">
                Enter code <strong className="text-caramel font-bold">DOJALOVE10</strong> on WhatsApp or check out to claim 10% off your fresh warm banana bread.
              </p>
            </div>

            {/* Copy code input / clicker */}
            <div className="flex items-center justify-between bg-white border border-chocolate/10 rounded-2xl p-2 max-w-xs mx-auto shadow-inner">
              <span className="font-mono font-bold text-sm tracking-widest pl-3">DOJALOVE10</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="bg-chocolate hover:bg-chocolate/90 text-cream p-2.5 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-banana" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Main CTA */}
            <button
              id="exit-intent-claim-btn"
              onClick={() => {
                setIsVisible(false);
                onClaimDiscount();
              }}
              className="w-full bg-banana hover:bg-honey text-chocolate font-sans font-black text-sm py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Claim Discount and Order Now
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className="text-[11px] font-bold text-chocolate/40 hover:text-chocolate/60 underline tracking-wider transition-colors cursor-pointer block mx-auto"
            >
              No thanks, I prefer paying full price
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
