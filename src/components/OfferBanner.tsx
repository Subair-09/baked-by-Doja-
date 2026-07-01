import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Flame, Clock, Sparkles } from 'lucide-react';

interface OfferBannerProps {
  onOrderNowClick: () => void;
}

export default function OfferBanner({ onOrderNowClick }: OfferBannerProps) {
  // Countdown Timer: set it to run down continuously or reset every 24 hours
  const [timeLeft, setTimeLeft] = useState({
    hours: 2,
    minutes: 48,
    seconds: 53,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Reset countdown to trigger continuous urgency
          return { hours: 3, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 bg-cream/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[3rem] overflow-hidden p-8 sm:p-12 lg:p-16 text-white shadow-xl border-4 border-white"
          style={{
            background: 'linear-gradient(135deg, #5A3825 0%, #A86A2A 50%, #E8A317 100%)',
          }}
        >
          {/* Subtle sparkles backgrounds */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-banana/20 rounded-full filter blur-3xl pointer-events-none" />
          <div className="absolute bottom-[-50px] left-[-50px] w-60 h-60 bg-cream/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left promo detail */}
            <div className="space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-banana">
                <Flame className="w-4 h-4 fill-current text-banana" />
                <span>Limited-Time Sunrise Special</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-tight">
                Buy 2 Loaves, <br className="hidden sm:block" />
                Get <span className="text-banana">FREE Delivery</span>
              </h2>

              <p className="text-xs sm:text-sm text-cream/90 max-w-lg leading-relaxed font-sans">
                Treat yourself and surprise a loved one. Mix and match any two flavors of our soft, comforting banana bread loaves and we’ll wave the entire shipping fee!
              </p>
            </div>

            {/* Right Interactive Countdown & CTA */}
            <div className="bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-[2rem] border border-white/15 flex flex-col items-center space-y-6 w-full max-w-sm shrink-0 shadow-lg">
              <div className="flex items-center space-x-2 text-banana font-bold text-xs uppercase tracking-widest">
                <Clock className="w-4 h-4" />
                <span>Offer Expires Soon</span>
              </div>

              {/* Timer Counters */}
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-center">
                  <span className="bg-white text-chocolate font-sans font-black text-xl sm:text-2xl h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-md">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-white/80 font-semibold uppercase tracking-wider mt-1.5">Hrs</span>
                </div>
                <span className="text-banana font-black text-xl sm:text-2xl mb-5">:</span>

                <div className="flex flex-col items-center">
                  <span className="bg-white text-chocolate font-sans font-black text-xl sm:text-2xl h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-md">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-white/80 font-semibold uppercase tracking-wider mt-1.5">Mins</span>
                </div>
                <span className="text-banana font-black text-xl sm:text-2xl mb-5">:</span>

                <div className="flex flex-col items-center">
                  <span className="bg-white text-chocolate font-sans font-black text-xl sm:text-2xl h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-md">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] text-white/80 font-semibold uppercase tracking-wider mt-1.5">Secs</span>
                </div>
              </div>

              {/* Giant CTA */}
              <button
                id="offer-banner-order-btn"
                onClick={onOrderNowClick}
                className="w-full bg-banana hover:bg-honey text-chocolate font-sans font-black text-sm sm:text-base py-3.5 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                Order and Claim Free Delivery
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
