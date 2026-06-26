import React from 'react';
import { Star, Flame, Shield, Award, Truck, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export default function TrustBadges() {
  const badges = [
    {
      id: 'rating',
      icon: <Star className="w-5 h-5 text-banana fill-banana" />,
      label: 'Rated 5.0 Stars',
      sublabel: 'by 500+ foodies',
    },
    {
      id: 'fresh',
      icon: <Flame className="w-5 h-5 text-caramel" />,
      label: 'Freshly Baked Daily',
      sublabel: 'Oven to door warm',
    },
    {
      id: 'clean',
      icon: <Shield className="w-5 h-5 text-leaf" />,
      label: 'No Preservatives',
      sublabel: '100% natural recipe',
    },
    {
      id: 'ingredients',
      icon: <Award className="w-5 h-5 text-honey" />,
      label: 'Premium Ingredients',
      sublabel: 'Real sweet bananas',
    },
    {
      id: 'delivery',
      icon: <Truck className="w-5 h-5 text-chocolate" />,
      label: 'Fast Local Delivery',
      sublabel: 'Same-day delivery available',
    },
    {
      id: 'love',
      icon: <Heart className="w-5 h-5 text-red-500 fill-current animate-pulse" />,
      label: 'Made With Love',
      sublabel: 'Hand-mixed with care',
    },
  ];

  return (
    <section className="bg-cream/40 border-y border-chocolate/5 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 justify-items-center">
          {badges.map((badge, idx) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.08 }}
              className="flex flex-col items-center text-center space-y-1.5 p-3 rounded-2xl hover:bg-cream hover:shadow-sm transition-all duration-300 w-full max-w-[160px]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-chocolate/5">
                {badge.icon}
              </div>
              <p className="text-xs font-bold text-chocolate font-sans">
                {badge.label}
              </p>
              <p className="text-[10px] text-chocolate/60">
                {badge.sublabel}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
