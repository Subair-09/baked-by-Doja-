import React from 'react';
import { motion } from 'motion/react';
import { Quote, Star } from 'lucide-react';
import { testimonials } from '../data';

export default function Testimonials() {
  return (
    <section id="reviews" className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold tracking-widest text-caramel uppercase bg-beige px-3.5 py-1.5 rounded-full border border-chocolate/5">
            Customer Love
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            Loved By Hundreds of Foodies
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            Don’t just take our word for it. Here is what our lovely community in Lagos and beyond says about our comforting homemade banana bread loaves.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-chocolate/5 hover:border-caramel/10 transition-all duration-300 relative flex flex-col justify-between"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-8 opacity-10 text-caramel">
                <Quote className="w-10 h-10 fill-current" />
              </div>

              <div className="space-y-6">
                {/* Stars */}
                <div className="flex space-x-1">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-banana fill-banana" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-sm sm:text-base italic text-chocolate/85 leading-relaxed font-sans">
                  "{testimonial.review}"
                </p>
              </div>

              {/* User Bio */}
              <div className="flex items-center space-x-4 pt-6 mt-6 border-t border-chocolate/5">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-chocolate/10 shrink-0">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-serif font-black text-chocolate">
                    {testimonial.name}
                  </h4>
                  <p className="text-xs text-chocolate/60">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
