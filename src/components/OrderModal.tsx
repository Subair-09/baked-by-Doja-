import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ShoppingBag, Gift, Truck, CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { Product } from '../types';
import AuthScreen from './AuthScreen';

interface OrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: { name: string; phone: string } | null;
  onAuthSuccess: (user: { name: string; phone: string }) => void;
}

export default function OrderModal({ product, isOpen, onClose, currentUser, onAuthSuccess }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedTopping, setSelectedTopping] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState({ to: '', from: '', message: '' });
  const [deliveryType, setDeliveryType] = useState('standard'); // 'standard', 'express', 'pickup'
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isOrderSuccessful, setIsOrderSuccessful] = useState(false);

  // Set default topping when product changes
  useEffect(() => {
    if (product) {
      setSelectedTopping(product.toppings[0] || 'Classic Plain');
      setQuantity(1);
      setIsGift(false);
      setGiftNote({ to: '', from: '', message: '' });
      setDeliveryType('standard');
      setDeliveryNote('');
      setShowAuth(!currentUser);
      setIsOrderSuccessful(false);
    }
  }, [product, currentUser]);

  if (!product) return null;

  // Pricing math
  const getDeliveryFee = () => {
    return 0;
  };

  const giftWrapFee = isGift ? 1000 : 0;
  const itemTotal = product.price * quantity;
  const grandTotalNGN = itemTotal + getDeliveryFee() + giftWrapFee;

  // Format helper
  const formatPrice = (priceInNGN: number) => {
    return `₦${priceInNGN.toLocaleString()}`;
  };

  const handleOrderSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!currentUser) {
      setShowAuth(true);
      return;
    }

    setIsSubmitting(true);
    const orderId = `DOJA-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderData = {
      orderId,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      productTitle: product.title,
      quantity,
      topping: selectedTopping,
      deliveryType,
      isGift,
      giftNote,
      deliveryNote,
      totalAmount: grandTotalNGN,
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        throw new Error('Server failed to save order');
      }

      // Sync locally as well for immediate local responsiveness
      try {
        const existing = localStorage.getItem('baked_by_doja_orders');
        const orders = existing ? JSON.parse(existing) : [];
        orders.push({ ...orderData, date: new Date().toISOString() });
        localStorage.setItem('baked_by_doja_orders', JSON.stringify(orders));
      } catch (err) {}

      setIsSubmitting(false);
      setIsOrderSuccessful(true);
    } catch (err) {
      console.warn("API Order failed, saving to local storage fallback:", err);
      try {
        const existing = localStorage.getItem('baked_by_doja_orders');
        const orders = existing ? JSON.parse(existing) : [];
        orders.push({
          ...orderData,
          date: new Date().toISOString(),
        });
        localStorage.setItem('baked_by_doja_orders', JSON.stringify(orders));
      } catch (err2) {
        console.error('Failed to save order locally', err2);
      }
      setIsSubmitting(false);
      setIsOrderSuccessful(true);
    }
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

              {isOrderSuccessful ? (
                <div className="p-8 sm:p-10 text-center space-y-6 max-h-[90vh] overflow-y-auto">
                  <div className="inline-flex items-center justify-center bg-green-50 text-emerald-600 p-4 rounded-full shadow-md">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif font-black tracking-tight text-chocolate">
                      Order Placed Successfully!
                    </h3>
                    <p className="text-xs text-chocolate/75 mt-2 max-w-sm mx-auto">
                      We've secured your fresh baking slot! Your homemade banana bread is scheduled for the next sunrise bake.
                    </p>
                  </div>

                  {/* Invoice Receipt */}
                  <div className="bg-beige rounded-2xl p-5 border border-chocolate/5 text-left text-xs font-sans space-y-3 shadow-inner max-w-md mx-auto">
                    <div className="flex justify-between border-b border-chocolate/5 pb-2 font-bold uppercase text-[10px] text-chocolate/50 tracking-wider">
                      <span>Item Description</span>
                      <span>Summary</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-chocolate">{product.title}</span>
                      <span className="font-bold">{quantity}x</span>
                    </div>
                    <div className="flex justify-between text-chocolate/70">
                      <span>Signature Topping / Glaze:</span>
                      <span className="font-semibold">{selectedTopping}</span>
                    </div>
                    <div className="flex justify-between text-chocolate/70 items-start">
                      <span>Delivery Type ({deliveryType.toUpperCase()}):</span>
                      <span className="text-right max-w-[180px]">
                        {deliveryType === 'pickup' ? (
                          'FREE'
                        ) : (
                          <span className="text-[10px] font-bold text-caramel block leading-tight">
                            Admin will contact you concerning the delivery fee
                          </span>
                        )}
                      </span>
                    </div>
                    {isGift && (
                      <div className="flex justify-between text-chocolate/70">
                        <span>Luxe Gift Wrap (+ Gift Note):</span>
                        <span>{formatPrice(1000)}</span>
                      </div>
                    )}
                    {deliveryNote && (
                      <div className="text-chocolate/70 border-t border-chocolate/5 pt-2">
                        <span className="block font-semibold text-[10px] uppercase text-chocolate/50 mb-1">Delivery Address/Note:</span>
                        <p className="italic bg-white/50 p-2 rounded-lg border border-chocolate/5">{deliveryNote}</p>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm text-caramel pt-3 border-t-2 border-dashed border-chocolate/10">
                      <span>Total Payable Amount:</span>
                      <span>{formatPrice(grandTotalNGN)}</span>
                    </div>
                  </div>

                  {/* Bank Transfer Details Box */}
                  <div className="bg-banana/10 border-2 border-dashed border-banana rounded-2xl p-5 max-w-md mx-auto text-left space-y-3">
                    <h4 className="text-xs font-black uppercase text-chocolate/80 tracking-wider flex items-center gap-1.5">
                      Bank Transfer Payment Details
                    </h4>
                    <p className="text-[11px] text-chocolate/75 leading-relaxed">
                      Please make a bank transfer of <strong className="text-caramel">{formatPrice(grandTotalNGN)}</strong> to secure your sunrise baking slot:
                    </p>
                    <div className="bg-white/80 border border-chocolate/5 p-3.5 rounded-xl space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-chocolate/60">Bank Name:</span>
                        <span className="font-bold">Wema Bank</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-chocolate/60">Account Number:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-chocolate text-sm">0123456789</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('0123456789');
                              alert('Account Number copied to clipboard!');
                            }}
                            className="p-1 hover:bg-banana/30 rounded text-chocolate/60 hover:text-chocolate transition-colors cursor-pointer"
                            title="Copy Account Number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-chocolate/60">Account Name:</span>
                        <span className="font-bold text-chocolate">Baked by Doja</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-chocolate/65 text-center italic mt-1">
                      *Send payment proof via WhatsApp or phone call using the contact links below.*
                    </p>
                  </div>

                  {/* Contact info and Close actions */}
                  <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                    <a
                      href="https://wa.me/2347025566294"
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Chat on WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 bg-chocolate hover:bg-chocolate/90 text-cream font-bold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Done &amp; Return
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto">
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
                      <div className="flex justify-between text-chocolate/60 items-start">
                        <span>Delivery Fee:</span>
                        <span className="text-right max-w-[160px]">
                          {deliveryType === 'pickup' ? (
                            'FREE'
                          ) : (
                            <span className="text-[10px] font-bold text-caramel block leading-tight">
                              Admin will contact you concerning the delivery fee
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between font-black text-sm text-caramel pt-2 border-t border-chocolate/5">
                        <span>Total Amount:</span>
                        <span>{formatPrice(grandTotalNGN)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: customization fields or Auth */}
                  <div className="md:w-7/12 p-6 sm:p-8 flex flex-col justify-between max-h-[90vh] overflow-y-auto">
                    {showAuth ? (
                      <div className="w-full h-full flex flex-col justify-between">
                        {currentUser && (
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => setShowAuth(false)}
                              className="text-xs font-bold text-chocolate/60 hover:text-chocolate flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              ← Back to customisation
                            </button>
                          </div>
                        )}
                        <AuthScreen
                          onSuccess={(user) => {
                            onAuthSuccess(user);
                            setShowAuth(false);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col h-full justify-between space-y-6">
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
                                <span className="text-[10px] opacity-60 font-medium">Billed by Admin</span>
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
                                <span className="text-[10px] opacity-60 font-medium">Billed by Admin</span>
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

                          {/* Address Note / Delivery Address */}
                          {deliveryType !== 'pickup' ? (
                            <div className="space-y-1 mb-4">
                              <label className="block text-xs font-bold text-chocolate/85 uppercase mb-1">
                                Delivery Address <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                rows={2}
                                required
                                value={deliveryNote}
                                onChange={(e) => setDeliveryNote(e.target.value)}
                                placeholder="e.g. 12 Mall Road, Phase 1, Ikoyi, Lagos"
                                className="w-full bg-white border border-chocolate/10 rounded-xl px-4 py-2.5 text-xs focus:border-caramel focus:outline-none resize-none"
                              />
                            </div>
                          ) : (
                            <div className="p-3 bg-beige/60 border border-chocolate/5 rounded-xl text-[11px] text-chocolate/75 mb-4 leading-relaxed">
                              <strong>Pickup Location:</strong> Baked by Doja Studio, Ikoyi, Lagos. We will send you the exact pickup address and ready time.
                            </div>
                          )}
                        </div>

                        {/* Submission Buttons */}
                        <button
                          type="button"
                          onClick={() => handleOrderSubmit()}
                          disabled={isSubmitting}
                          className="w-full bg-banana hover:bg-honey text-chocolate font-sans font-black text-sm py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                        >
                          <ShoppingBag className="w-5 h-5 text-chocolate" />
                          {isSubmitting ? 'Securing Baking Slot...' : 'Confirm & Place Order'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
