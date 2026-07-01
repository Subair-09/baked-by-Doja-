import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Clock, ShoppingCart, Percent, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Product } from '../types';
import { products as defaultProducts } from '../data';

interface BestSellersProps {
  onProductOrder: (product: Product) => void;
  currentUser?: { name: string; phone: string; role?: string } | null;
  onEditProduct?: (product: Product) => void;
  products?: Product[];
  onDeleteProduct?: (id: string) => void;
}

export default function BestSellers({ 
  onProductOrder, currentUser, onEditProduct, products: propProducts, onDeleteProduct 
}: BestSellersProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(() => {
    try {
      const stored = localStorage.getItem('baked_by_doja_products');
      return stored ? JSON.parse(stored) : defaultProducts;
    } catch {
      return defaultProducts;
    }
  });

  const [deleteProductConfirm, setDeleteProductConfirm] = useState<{ id: string; title: string } | null>(null);

  const products = propProducts || localProducts;

  useEffect(() => {
    if (propProducts) return;
    const checkProducts = () => {
      try {
        const stored = localStorage.getItem('baked_by_doja_products');
        if (stored) {
          setLocalProducts(JSON.parse(stored));
        }
      } catch (e) {}
    };
    const interval = setInterval(checkProducts, 1000);
    return () => clearInterval(interval);
  }, [propProducts]);
  // Format price helper
  const formatPrice = (priceInNGN: number) => {
    return `₦${priceInNGN.toLocaleString()}`;
  };

  const handleDeleteProductDirect = (id: string, title: string) => {
    setDeleteProductConfirm({ id, title });
  };

  const handleConfirmDeleteDirect = () => {
    if (!deleteProductConfirm) return;
    const { id } = deleteProductConfirm;
    if (onDeleteProduct) {
      onDeleteProduct(id);
    } else {
      try {
        const stored = localStorage.getItem('baked_by_doja_products');
        const currentProducts: Product[] = stored ? JSON.parse(stored) : defaultProducts;
        const updated = currentProducts.filter(p => p.id !== id);
        localStorage.setItem('baked_by_doja_products', JSON.stringify(updated));
        setLocalProducts(updated);
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        console.error(e);
      }
    }
    setDeleteProductConfirm(null);
  };

  return (
    <section id="our-bread" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold tracking-widest text-caramel uppercase bg-beige px-3.5 py-1.5 rounded-full border border-chocolate/5">
            Our Signature Baked Goods
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            Explore Our Daily Best Sellers
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            Every loaf is baked fresh to order in Lagos using hand-selected sweet bananas, organic farm-fresh eggs, and rich premium butter. Order now and experience premium luxury comfort in every bite.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className="bg-white rounded-[2rem] overflow-hidden shadow-md hover:shadow-xl border border-chocolate/5 transition-all duration-300 flex flex-col group"
            >
              {/* Product Image Wrapper */}
              <div className="relative overflow-hidden aspect-[4/3] bg-chocolate/5">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />

                {/* Floating Tags */}
                {product.tag && (
                  <span className="absolute top-4 left-4 bg-chocolate text-cream font-sans font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 z-10">
                    <Star className="w-3 h-3 fill-banana text-banana" />
                    {product.tag}
                  </span>
                )}

                {/* Discount Badge */}
                {product.originalPrice && (
                  <span className="absolute top-4 right-4 bg-banana text-chocolate font-sans font-black text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Percent className="w-3 h-3" />
                    Promo
                  </span>
                )}

                {/* Quick Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-chocolate/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-white text-xs font-semibold bg-chocolate/85 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-banana" />
                    {product.prepTime}
                  </span>
                </div>
              </div>

              {/* Product Body */}
              <div className="p-6 sm:p-8 flex flex-col flex-grow text-chocolate">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-serif font-bold tracking-tight">
                    {product.title}
                  </h3>
                  <div className="flex items-center space-x-1 shrink-0 bg-cream border border-chocolate/5 px-2 py-1 rounded-xl">
                    <Star className="w-3.5 h-3.5 text-banana fill-banana" />
                    <span className="text-xs font-bold font-sans">{product.rating.toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-chocolate/70 leading-relaxed font-sans mb-6 flex-grow">
                  {product.description}
                </p>

                {currentUser?.role === 'admin' && (
                  <div className="flex gap-2 mb-4 p-2 bg-beige/10 rounded-2xl border border-chocolate/5">
                    <button
                      onClick={() => onEditProduct && onEditProduct(product)}
                      className="flex-1 bg-chocolate hover:bg-chocolate/95 text-white py-1.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all duration-200"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit Recipe
                    </button>
                    <button
                      onClick={() => handleDeleteProductDirect(product.id, product.title)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all duration-200"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}

                {/* Pricing & Order */}
                <div className="flex items-center justify-between pt-4 border-t border-chocolate/5">
                  <div className="flex flex-col">
                    {product.originalPrice && (
                      <span className="text-xs line-through text-chocolate/40 font-semibold mb-0.5">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                    <span className="text-xl font-black text-caramel tracking-tight font-sans">
                      {formatPrice(product.price)}
                    </span>
                  </div>

                  <button
                    id={`order-btn-${product.id}`}
                    onClick={() => onProductOrder(product)}
                    className="bg-banana hover:bg-honey text-chocolate border border-chocolate/10 font-sans font-bold text-xs sm:text-sm px-5 py-2.5 rounded-full shadow-md transition-all duration-300 flex items-center gap-1.5 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Order Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Elegant State-Driven Confirmation Dialog */}
      <AnimatePresence>
        {deleteProductConfirm && (
          <div className="fixed inset-0 bg-chocolate/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-cream border-2 border-chocolate/5 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl space-y-4 text-center"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center mx-auto text-rose-600 animate-bounce">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-black text-base text-chocolate leading-tight">Remove Loaf Recipe</h3>
                <p className="text-xs text-chocolate/70 leading-relaxed font-medium">
                  Are you absolutely sure you want to remove <strong className="text-chocolate font-extrabold">"{deleteProductConfirm.title}"</strong> from the storefront menu catalog?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteProductConfirm(null)}
                  className="flex-1 bg-white hover:bg-beige/10 text-chocolate border border-chocolate/10 font-bold uppercase tracking-wider py-2.5 rounded-xl text-[10px] cursor-pointer transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteDirect}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider py-2.5 rounded-xl text-[10px] cursor-pointer shadow-md transition-all duration-200"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}
