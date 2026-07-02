import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, MousePointerClick, CreditCard, Flame, Truck, ArrowRight } from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      id: 1,
      title: 'Choose Your Favorite Loaf',
      description: 'Select from our award-winning menu—Classic, Walnut, Chocolate Chip, Caramel, or Gift Box Bundle.',
      icon: <ShoppingBag className="w-6 h-6 text-caramel" />,
      color: 'bg-banana/20',
    },
    {
      id: 2,
      title: 'Click Order & Customise',
      description: 'Decide on extra toppings, add a hand-written gold gift note, and pick your perfect quantity.',
      icon: <MousePointerClick className="w-6 h-6 text-caramel" />,
      color: 'bg-cream border border-chocolate/10',
    },
    {
      id: 3,
      title: 'Secure Payment',
      description: 'Make a seamless wire transfer or secure online checkout to lock in your morning baking slot.',
      icon: <CreditCard className="w-6 h-6 text-caramel" />,
      color: 'bg-banana/20',
    },
    {
      id: 4,
      title: 'Fresh Sunrise Baking',
      description: 'Our master bakers rise at 4:30 AM to mix, bake, and pack your loaves from scratch.',
      icon: <Flame className="w-6 h-6 text-caramel animate-pulse" />,
      color: 'bg-cream border border-chocolate/10',
    },
    {
      id: 5,
      title: 'Delivered Fresh & Warm',
      description: 'Delivered in our pristine heat-sealed linen wrapping right to your desk or home doorstep.',
      icon: <Truck className="w-6 h-6 text-leaf" />,
      color: 'bg-leaf/15',
    },
  ];

  return (
    <section className="py-20 bg-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-bold tracking-widest text-caramel uppercase bg-beige px-3.5 py-1.5 rounded-full border border-chocolate/5">
            Our Pure Process
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-chocolate tracking-tight">
            How Ordering Works
          </h2>
          <div className="h-1 w-20 bg-banana mx-auto rounded-full" />
          <p className="text-sm sm:text-base text-chocolate/75 leading-relaxed">
            Getting fresh warm banana bread has never been easier. We coordinate everything smoothly from sunrise baking to your front doorstep.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden lg:block absolute top-[52px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-banana via-caramel to-leaf -z-0" />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 relative z-10">
            {steps.map((step, idx) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative flex flex-col items-center text-center space-y-4 group pt-4"
              >
                {/* Step Number Badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-chocolate text-cream font-sans font-black text-xs h-6 w-6 rounded-full flex items-center justify-center shadow-md z-20">
                  {step.id}
                </div>

                {/* Icon Wrapper */}
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all duration-300 group-hover:scale-110 z-10 ${step.color}`}>
                  {step.icon}
                </div>

                {/* Content */}
                <div className="space-y-2 px-2">
                  <h3 className="text-base sm:text-lg font-serif font-black text-chocolate tracking-tight group-hover:text-caramel transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-chocolate/70 leading-relaxed font-sans">
                    {step.description}
                  </p>
                </div>

                {/* Arrow indicator for mobile/tablet */}
                {idx < steps.length - 1 && (
                  <div className="lg:hidden text-banana font-bold text-xl pt-2 animate-bounce">
                    ↓
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
