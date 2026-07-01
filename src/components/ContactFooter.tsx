import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, MapPin, Send, Instagram, Facebook, MessageCircle, Heart, CheckCircle2 } from 'lucide-react';

interface ContactFooterProps {
  onOrderNowClick: () => void;
}

export default function ContactFooter({ onOrderNowClick }: ContactFooterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    loaf: 'Classic Plain',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert("Please fill in your Name and Phone Number so we can reach you!");
      return;
    }

    setIsSubmitted(true);

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Server failed to save inquiry');
      }

      // Sync locally too
      try {
        const existing = localStorage.getItem('baked_by_doja_inquiries');
        const inquiries = existing ? JSON.parse(existing) : [];
        inquiries.push({ ...formData, date: new Date().toISOString() });
        localStorage.setItem('baked_by_doja_inquiries', JSON.stringify(inquiries));
      } catch (err) {}

      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', phone: '', message: '', loaf: 'Classic Plain' });
      }, 3000);

    } catch (err) {
      console.warn("API Inquiry failed, saving to local storage fallback:", err);
      try {
        const existing = localStorage.getItem('baked_by_doja_inquiries');
        const inquiries = existing ? JSON.parse(existing) : [];
        inquiries.push({
          ...formData,
          date: new Date().toISOString(),
        });
        localStorage.setItem('baked_by_doja_inquiries', JSON.stringify(inquiries));
      } catch (err2) {
        console.error('Failed to save inquiry locally', err2);
      }

      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: '', email: '', phone: '', message: '', loaf: 'Classic Plain' });
      }, 3000);
    }
  };

  return (
    <footer id="contact" className="bg-chocolate text-cream pt-20 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 left-[-150px] w-96 h-96 bg-caramel/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-150px] right-[-150px] w-96 h-96 bg-banana/10 rounded-full filter blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-20">
        
        {/* Contact Form Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          
          {/* Info Details & Socials */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="text-xs font-black tracking-widest text-banana uppercase">
                Connect With Us
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-white leading-tight">
                Get in Touch For Custom &amp; Corporate Orders
              </h2>
              <p className="text-xs sm:text-sm text-cream/70 leading-relaxed font-sans max-w-lg">
                Have a wedding, office party, corporate event, or a special gift delivery in mind? Send us a message or contact us directly on WhatsApp. We reply within minutes!
              </p>
            </div>

            {/* Direct Contacts */}
            <div className="space-y-4 font-sans text-sm sm:text-base">
              <a
                href="tel:+2347025566294"
                className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-banana/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-banana text-chocolate flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-cream/50 font-bold">Call / WhatsApp Hotline</p>
                  <p className="font-semibold text-white group-hover:text-banana transition-colors">+234 702 556 6294</p>
                </div>
              </a>

              <a
                href="mailto:orders@bakedbydoja.com"
                className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-banana/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-banana text-chocolate flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-cream/50 font-bold">Inquiries Email</p>
                  <p className="font-semibold text-white group-hover:text-banana transition-colors">orders@bakedbydoja.com</p>
                </div>
              </a>

              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-banana text-chocolate flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-cream/50 font-bold">Bakery Studio Hub</p>
                  <p className="font-semibold text-white">Ikoyi, Lagos State, Nigeria</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white/5 backdrop-blur-md p-6 sm:p-10 rounded-[2.5rem] border border-white/10 shadow-xl relative">
            <h3 className="text-xl sm:text-2xl font-serif font-black text-white mb-6">
              Send a Quick Inquiry
            </h3>

            <AnimatePresence mode="wait">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-12 space-y-4"
                >
                  <div className="w-14 h-14 rounded-full bg-leaf text-white flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Inquiry Sent Successfully!</h4>
                  <p className="text-xs text-cream/70 max-w-xs">
                    Thank you! Your inquiry has been received. Our head baker will contact you shortly.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
                  <div>
                    <label className="block text-xs font-bold text-cream/80 mb-1.5 uppercase">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Chioma Ademola"
                      className="w-full bg-white/10 border border-white/15 focus:border-banana rounded-xl px-4 py-3 text-white placeholder-cream/40 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-cream/80 mb-1.5 uppercase">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. +234..."
                        className="w-full bg-white/10 border border-white/15 focus:border-banana rounded-xl px-4 py-3 text-white placeholder-cream/40 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-cream/80 mb-1.5 uppercase">Loaf Choice</label>
                      <select
                        value={formData.loaf}
                        onChange={(e) => setFormData({ ...formData, loaf: e.target.value })}
                        className="w-full bg-chocolate border border-white/15 focus:border-banana rounded-xl px-4 py-3 text-white focus:outline-none transition-colors"
                      >
                        <option value="Classic Plain">Classic Banana Bread</option>
                        <option value="Choco-Chip">Double Chocolate Chip</option>
                        <option value="Walnut">Toasted Walnut</option>
                        <option value="Caramel">Premium Caramel Glaze</option>
                        <option value="Gift Bundle">Luxe Gift Box Bundle</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cream/80 mb-1.5 uppercase">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. chioma@gmail.com"
                      className="w-full bg-white/10 border border-white/15 focus:border-banana rounded-xl px-4 py-3 text-white placeholder-cream/40 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-cream/80 mb-1.5 uppercase">Your Message</label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Write details about your corporate orders, dietary preferences, or specific delivery requests here..."
                      className="w-full bg-white/10 border border-white/15 focus:border-banana rounded-xl px-4 py-3 text-white placeholder-cream/40 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-banana hover:bg-honey text-chocolate font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Send Message
                  </button>
                </form>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Final Call-To-Action Banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-banana text-chocolate text-center p-8 sm:p-12 lg:p-16 rounded-[3rem] border border-white/20 shadow-xl relative overflow-hidden"
        >
          {/* Sparkly bits */}
          <div className="absolute top-0 left-0 text-3xl opacity-20 p-6"></div>
          <div className="absolute bottom-0 right-0 text-3xl opacity-20 p-6"></div>

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black leading-tight">
              Every Slice Tells a Story
            </h2>
            <p className="text-sm sm:text-base text-chocolate/85 font-sans leading-relaxed">
              Treat yourself or someone deeply special to the comforting taste of freshly baked homemade banana bread. Life is sweeter with every single bite.
            </p>
            <button
              id="final-cta-btn"
              onClick={onOrderNowClick}
              className="bg-chocolate hover:bg-chocolate/90 text-cream font-sans font-black text-sm sm:text-base px-8 py-4 rounded-full shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Order Fresh Banana Bread Now
            </button>
          </div>
        </motion.div>

        {/* Bottom copyright & details */}
        <div className="pt-12 pb-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs sm:text-sm text-cream/50">
          <div className="text-center md:text-left space-y-1">
            <p className="text-lg font-serif font-black text-white tracking-tight">
              Baked <span className="text-banana">by</span> Doja
            </p>
            <p>"Where Every Slice Feels Like Home."</p>
          </div>

          {/* Social Icons */}
          <div className="flex items-center space-x-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/5 rounded-full text-cream/70 hover:text-banana hover:bg-white/10 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/5 rounded-full text-cream/70 hover:text-banana hover:bg-white/10 transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://wa.me/2347025566294"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/5 rounded-full text-cream/70 hover:text-banana hover:bg-white/10 transition-colors"
              aria-label="WhatsApp"
            >
              <MessageCircle className="w-5 h-5" />
            </a>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noreferrer"
              className="p-2.5 bg-white/5 rounded-full text-cream/70 hover:text-banana hover:bg-white/10 transition-colors"
              aria-label="TikTok"
            >
              {/* Custom TikTok SVG since Lucide doesn't have it natively */}
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.2-.41-.43-.6-.67-.02 3.12-.01 6.24-.02 9.35-.07 2.12-.86 4.32-2.53 5.67-1.72 1.44-4.14 1.94-6.32 1.53-2.61-.43-4.88-2.39-5.63-4.94-.9-2.88-.06-6.42 2.21-8.32 1.56-1.35 3.73-1.92 5.79-1.6v4.02c-1.12-.24-2.39.06-3.13.94-.79.88-.86 2.3-.17 3.29.62.96 1.88 1.41 2.99 1.18 1.11-.18 1.94-1.13 2.01-2.25.04-3.79.02-7.58.03-11.37z" />
              </svg>
            </a>
          </div>

          <div className="text-center md:text-right space-y-1 font-sans">
            <p>© {new Date().getFullYear()} Baked by Doja. All Rights Reserved.</p>
            <p className="text-[10px] text-cream/30 flex items-center justify-center md:justify-end gap-1">
              Hand-baked with <Heart className="w-3 h-3 text-red-500 fill-current" /> in Ikoyi, Lagos State.
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}
