import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { faqs } from '../data';

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggleFAQ = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="py-20 bg-cream/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold tracking-widest text-caramel uppercase bg-beige px-3.5 py-1.5 rounded-full border border-chocolate/5">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            Everything you need to know about our sunrise baking schedule, local Osun State deliveries, bulk orders, and delicious storing secrets.
          </p>
        </div>

        {/* Accordions */}
        <div className="space-y-4">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <motion.div
                key={faq.id}
                className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm ${
                  isOpen ? 'border-caramel/30 shadow-md' : 'border-chocolate/5'
                }`}
              >
                <button
                  id={`faq-btn-${faq.id}`}
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full text-left px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between gap-4 text-chocolate focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <HelpCircle className="w-5 h-5 text-caramel shrink-0" />
                    <span className="font-serif font-bold text-sm sm:text-base tracking-tight leading-tight">
                      {faq.question}
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-full bg-cream transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-caramel' : 'text-chocolate/50'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 sm:px-8 sm:pb-8 text-xs sm:text-sm text-chocolate/75 leading-relaxed font-sans border-t border-chocolate/5 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
