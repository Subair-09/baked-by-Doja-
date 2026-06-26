import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MessageSquare, ShoppingBag, Gift, Truck } from 'lucide-react';
import { Product } from '../types';

interface OrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderModal({ product, isOpen, onClose }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedTopping, setSelectedTopping] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState({ to: '', from: '', message: '' });
  const [deliveryType, setDeliveryType] = useState('standard'); // 'standard', 'express', 'pickup'
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default topping when product changes
  useEffect(() => {
    if (product) {
      setSelectedTopping(product.toppings[0] || 'Classic Plain');
      setQuantity(1);
      setIsGift(false);
      setGiftNote({ to: '', from: '', message: '' });
      setDeliveryType('standard');
      setDeliveryNote('');
    }
  }, [product]);

  if (!product) return null;

  // Pricing math
  const getDeliveryFee = () => {
    if (deliveryType === 'pickup') return 0;
    if (deliveryType === 'express') return 2500;
    // Standard is free if quantity >= 2, otherwise 1500 NGN
    if (quantity >= 2) return 0;
    return 1500;
  };

  const giftWrapFee = isGift ? 1000 : 0;
  const itemTotal = product.price * quantity;
  const grandTotalNGN = itemTotal + getDeliveryFee() + giftWrapFee;

  // Format helper
  const formatPrice = (priceInNGN: number) => {
    return `₦${priceInNGN.toLocaleString()}`;
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Create a beautifully formatted purchase message
    const lines = [
      `*🌟 NEW ORDER - BAKED BY DOJA 🌟*`,
      `=============================`,
      `*Loaf Choice:* ${product.title}`,
      `*Quantity:* ${quantity}x`,
      `*Topping:* ${selectedTopping}`,
      `*Delivery Option:* ${deliveryType.toUpperCase()}`,
      `*Gift Wrap & Note:* ${isGift ? 'Yes (+₦1,000)' : 'No'}`,
    ];

    if (isGift) {
      lines.push(`  - *To:* ${giftNote.to}`);
      lines.push(`  - *From:* ${giftNote.from}`);
      lines.push(`  - *Message:* "${giftNote.message}"`);
    }

    if (deliveryNote) {
      lines.push(`*Delivery Note/Address:* ${deliveryNote}`);
    }

    lines.push(`=============================`);
    lines.push(`*Total Amount:* ${formatPrice(grandTotalNGN)}`);
    lines.push(`=============================`);
    lines.push(`Please confirm bank transfer details to finalize my fresh sunrise baking slot! Thank you!`);

    const fullMessage = encodeURIComponent(lines.join('\n'));

    setTimeout(() => {
      window.open(`https://wa.me/2347025566294?text=${fullMessage}`, '_blank');
      setIsSubmitting(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-chocolate/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-cream rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white text-chocolate"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-white/80 hover:bg-banana text-chocolate p-2 rounded-full transition-colors z-10 focus:outline-none cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <form onSubmit={handleOrderSubmit} className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
                {/* Left Side: Product Glance */}
                <div className="md:w-5/12 bg-beige p-6 flex flex-col justify-between border-r border-chocolate/5">
                  <div className="space-y-4">
                    <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-inner border border-chocolate/5">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-caramel">Baked Fresh</span>
                      <h3 className="text-xl font-serif font-black tracking-tight">{product.title}</h3>
                      <p className="text-xs text-chocolate/70 leading-relaxed mt-2">{product.description}</p>
                    </div>
                  </div>

                  {/* Summary receipt preview */}
                  <div className="pt-6 border-t border-chocolate/10 mt-6 space-y-2 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Loaf Base Price:</span>
                      <span>{formatPrice(product.price)}</span>
                    </div>
                    <div className="flex justify-between text-chocolate/60">
                      <span>Quantity:</span>
                      <span>{quantity}x</span>
                    </div>
                    {isGift && (
                      <div className="flex justify-between text-chocolate/60">
                        <span>Luxe Gift Box Wrap:</span>
                        <span>{formatPrice(1000)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-chocolate/60">
                      <span>Delivery Fee:</span>
                      <span>{getDeliveryFee() === 0 ? 'FREE' : formatPrice(getDeliveryFee())}</span>
                    </div>
                    <div className="flex justify-between font-black text-sm text-caramel pt-2 border-t border-chocolate/5">
                      <span>Total Amount:</span>
                      <span>{formatPrice(grandTotalNGN)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: customization fields */}
                <div className="md:w-7/12 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-serif font-black mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-banana fill-banana" />
                      Customise Your Loaf
                    </h4>

                    {/* Quantity Select */}
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-bold text-chocolate/85 uppercase">How many loaves?</label>
                      <div className="flex items-center space-x-3 w-fit bg-white border border-chocolate/10 rounded-2xl p-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center font-bold text-sm text-chocolate hover:bg-banana/30 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-sm">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-8 h-8 rounded-xl bg-cream flex items-center justify-center font-bold text-sm text-chocolate hover:bg-banana/30 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Toppings Radio Select */}
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-bold text-chocolate/85 uppercase">Signature Topping / Glaze</label>
                      <div className="grid grid-cols-2 gap-2">
                        {product.toppings.map((topping) => (
                          <button
                            key={topping}
                            type="button"
                            onClick={() => setSelectedTopping(topping)}
                            className={`px-3 py-2 text-left rounded-xl border text-xs font-semibold transition-all ${
                              selectedTopping === topping
                                ? 'bg-chocolate text-cream border-chocolate'
                                : 'bg-white text-chocolate/75 border-chocolate/10 hover:border-chocolate/30'
                            }`}
                          >
                            {topping}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gift Option Checkbox */}
                    <div className="p-3 bg-white border border-chocolate/5 rounded-2xl space-y-3 mb-4 shadow-sm">
                      <label className="flex items-center space-x-3 cursor-pointer text-xs font-bold uppercase select-none">
                        <input
                          type="checkbox"
                          checked={isGift}
                          onChange={(e) => setIsGift(e.target.checked)}
                          className="w-4 h-4 rounded text-caramel focus:ring-caramel accent-caramel"
                        />
                        <span className="flex items-center gap-1.5 text-chocolate">
                          <Gift className="w-4 h-4 text-caramel" />
                          Send as custom gold-foil gift box (+₦1,000)
                        </span>
                      </label>

                      <AnimatePresence>
                        {isGift && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="space-y-2 overflow-hidden pt-1"
                          >
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <input
                                  type="text"
                                  value={giftNote.to}
                                  onChange={(e) => setGiftNote({ ...giftNote, to: e.target.value })}
                                  placeholder="To: (Recipient Name)"
                                  className="w-full bg-cream border border-chocolate/10 rounded-xl px-3 py-2 focus:border-caramel focus:outline-none"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={giftNote.from}
                                  onChange={(e) => setGiftNote({ ...giftNote, from: e.target.value })}
                                  placeholder="From: (Your Name)"
                                  className="w-full bg-cream border border-chocolate/10 rounded-xl px-3 py-2 focus:border-caramel focus:outline-none"
                                />
                              </div>
                            </div>
                            <textarea
                              rows={2}
                              value={giftNote.message}
                              onChange={(e) => setGiftNote({ ...giftNote, message: e.target.value })}
                              placeholder="Write your sweet handwritten message..."
                              className="w-full bg-cream border border-chocolate/10 rounded-xl px-3 py-2 text-xs focus:border-caramel focus:outline-none resize-none"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Delivery Type Select */}
                    <div className="space-y-2 mb-4">
                      <label className="block text-xs font-bold text-chocolate/85 uppercase flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />
                        Delivery / Pickup Option
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setDeliveryType('standard')}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                            deliveryType === 'standard'
                              ? 'bg-chocolate text-cream border-chocolate'
                              : 'bg-white text-chocolate/75 border-chocolate/10'
                          }`}
                        >
                          <span className="text-xs font-bold font-sans">Standard</span>
                          <span className="text-[10px] opacity-60 font-medium">Free if 2+ loaves</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryType('express')}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                            deliveryType === 'express'
                              ? 'bg-chocolate text-cream border-chocolate'
                              : 'bg-white text-chocolate/75 border-chocolate/10'
                          }`}
                        >
                          <span className="text-xs font-bold font-sans">Express</span>
                          <span className="text-[10px] opacity-60 font-medium">Same-day (+₦2,500)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeliveryType('pickup')}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                            deliveryType === 'pickup'
                              ? 'bg-chocolate text-cream border-chocolate'
                              : 'bg-white text-chocolate/75 border-chocolate/10'
                          }`}
                        >
                          <span className="text-xs font-bold font-sans">Pickup</span>
                          <span className="text-[10px] opacity-60 font-medium">Ikoyi Studio (Free)</span>
                        </button>
                      </div>
                    </div>

                    {/* Address Note */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={deliveryNote}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="e.g. Delivery Address, Ikoyi or Marina Office..."
                        className="w-full bg-white border border-chocolate/10 rounded-xl px-4 py-2.5 text-xs focus:border-caramel focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submission Buttons */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-banana hover:bg-honey text-chocolate font-sans font-black text-sm py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <MessageSquare className="w-5 h-5 text-chocolate fill-chocolate" />
                    {isSubmitting ? 'Securing Baking Slot...' : 'Submit Order on WhatsApp'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
