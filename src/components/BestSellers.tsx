import React from 'react';
import { motion } from 'motion/react';
import { Star, Clock, ShoppingCart, Percent } from 'lucide-react';
import { Product } from '../types';
import { products } from '../data';

interface BestSellersProps {
  onProductOrder: (product: Product) => void;
}

export default function BestSellers({ onProductOrder }: BestSellersProps) {
  // Format price helper
  const formatPrice = (priceInNGN: number) => {
    return `₦${priceInNGN.toLocaleString()}`;
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
    </section>
  );
}
