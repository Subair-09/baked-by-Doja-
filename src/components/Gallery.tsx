import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ZoomIn, X } from 'lucide-react';
import { gallery } from '../data';
import { GalleryItem } from '../types';

interface GalleryProps {
  gallery?: GalleryItem[];
}

export default function Gallery({ gallery: propGallery }: GalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeImage, setActiveImage] = useState<GalleryItem | null>(null);

  const activeList = propGallery || gallery;

  const categories = [
    { key: 'all', label: 'All Photos' },
    { key: 'loaves', label: 'Our Loaves' },
    { key: 'pairing', label: 'Perfect Pairings' },
    { key: 'packaging', label: 'Luxe Packaging' },
    { key: 'lifestyle', label: 'Lifestyle' },
  ];

  const filteredGallery = selectedCategory === 'all'
    ? activeList
    : activeList.filter(item => item.category === selectedCategory);

  return (
    <section id="gallery" className="py-20 bg-cream/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-xs font-bold tracking-widest text-caramel uppercase bg-beige px-3.5 py-1.5 rounded-full border border-chocolate/5">
            Pinterest-style Aesthetic
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            Our Bread, Sliced and Shared
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            Take a visual tour of our baking studio. Browse our hand-wrapped loaves, delicious coffee combinations, premium gifting boxes, and family breakfast moments.
          </p>
        </div>

        {/* Filter Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                selectedCategory === cat.key
                  ? 'bg-chocolate text-cream shadow-md'
                  : 'bg-white text-chocolate/60 border border-chocolate/10 hover:border-chocolate/30 hover:text-chocolate'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Pinterest-style Masonry / Grid */}
        <motion.div
          layout
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredGallery.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="break-inside-avoid bg-white rounded-3xl overflow-hidden border border-chocolate/5 shadow-sm hover:shadow-lg transition-all group cursor-pointer relative"
                onClick={() => setActiveImage(item)}
              >
                {/* Image */}
                <div className="relative overflow-hidden aspect-auto max-h-[400px]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500 rounded-3xl"
                    referrerPolicy="no-referrer"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-chocolate/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                    <ZoomIn className="w-5 h-5 mb-2 text-banana" />
                    <p className="font-serif font-bold text-sm tracking-tight">{item.title}</p>
                    <p className="text-[10px] text-banana uppercase tracking-widest mt-1 font-semibold">{item.category}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-chocolate/90 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setActiveImage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl w-full bg-cream rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveImage(null)}
                className="absolute top-4 right-4 bg-white/90 text-chocolate p-2 rounded-full hover:bg-banana hover:text-chocolate transition-colors shadow-lg z-10 focus:outline-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="md:w-2/3 max-h-[70vh] overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={activeImage.image}
                    alt={activeImage.title}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Info details */}
                <div className="p-6 sm:p-8 md:w-1/3 text-chocolate flex flex-col justify-between">
                  <div className="space-y-4">
                    <span className="text-[10px] bg-banana text-chocolate font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      Category: {activeImage.category}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-black tracking-tight mt-2">
                      {activeImage.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-chocolate/70 leading-relaxed font-sans">
                      Our loaves are baked fresh with natural ingredients, perfect for sharing cozy moments with the family.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-chocolate/5 mt-6">
                    <p className="text-[10px] uppercase font-black tracking-widest text-chocolate/40 mb-2">Baked by Doja Studio</p>
                    <div className="flex items-center space-x-2 text-xs text-chocolate/75">
                      <span>Shot Fresh</span>
                      <span>•</span>
                      <span>Handcrafted</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
