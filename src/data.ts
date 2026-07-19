import { Product, Testimonial, FAQItem, GalleryItem, Benefit } from './types';

export const products: Product[] = [];

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Subair Nurudeen Adewale',
    role: 'Verified Customer',
    review: "The softest banana bread I've ever tasted in Lagos! We ordered 20 loaves for our corporate breakfast meeting, and everyone was raving about it. Absolutely moist and delightful.",
    rating: 5,
    image: 'https://imgur.com/rNTla0P.png'
  },
  {
    id: '2',
    name: 'Rukayat Abidoye',
    role: 'from Tiktok',
    review: "I ordered one loaf of the Chocolate Chip banana bread and instantly became a loyal customer. The chocolate chips melt inside, and the bread stays moist for days!",
    rating: 5,
    image: 'https://imgur.com/QSUspgE.png'
  },
  {
    id: '3',
    name: 'Mubarak Ademola',
    role: 'from Tiktok',
    review: "My kids absolutely love it for breakfast! It is wholesome, perfectly sweet, and has zero preservatives. It has become our Sunday morning family ritual with warm tea.",
    rating: 5,
    image: 'https://imgur.com/Sucf5rt.png'
  },
  {
    id: '4',
    name: 'Abigail A',
    role: 'University Student',
    review: "The price is incredibly affordable for this level of luxury. Fast delivery to my hostel and it arrived warm! Tastes like home in every single slice.",
    rating: 5,
    image: 'https://imgur.com/pmLqOkZ.png'
  }
];

export const benefits: Benefit[] = [
  {
    id: 'baked-daily',
    title: 'Baked Fresh Daily',
    description: 'We do not sell day-old bread. Every single loaf is mixed, baked, and packed the very morning of your delivery.',
    iconName: 'ChefHat'
  },
  {
    id: 'real-bananas',
    title: 'Made with Real Bananas',
    description: 'No artificial banana flavorings or extracts. Only highly-caramelized, hand-selected, perfectly-ripened organic bananas.',
    iconName: 'Banana'
  },
  {
    id: 'premium-butter',
    title: 'Premium Sweet Cream Butter',
    description: 'We use high-grade sweet cream dairy butter for a rich, moist crumb that melts in your mouth and holds its structure.',
    iconName: 'Cookie'
  },
  {
    id: 'no-preservatives',
    title: 'No Artificial Preservatives',
    description: 'Pure, wholesome ingredients that you would find in your own grandmother’s kitchen. 100% natural and clean.',
    iconName: 'ShieldCheck'
  },
  {
    id: 'moist-texture',
    title: 'Signature Soft & Moist Texture',
    description: 'Our confidential multi-stage baking technique ensures an intensely moist center that doesn’t dry out for up to 5 days.',
    iconName: 'Sparkles'
  },
  {
    id: 'affordable',
    title: 'Affordable Luxury',
    description: 'Premium, hand-crafted bakery experience priced accessibly for everyday breakfast moments and special celebrations.',
    iconName: 'Coins'
  },
  {
    id: 'fast-delivery',
    title: 'Same-Day Local Delivery',
    description: 'Freshly packed in secure heat-sealed paper and delivered straight to your door or office while it is still warm.',
    iconName: 'Truck'
  },
  {
    id: 'perfect-gifts',
    title: 'Perfect for Gifting',
    description: 'Stunning premium boxes, personal handwritten notes, and gold-trimmed wrapping to make anyone feel deeply special.',
    iconName: 'Gift'
  }
];

export const gallery: GalleryItem[] = [
  {
    id: 'g1',
    title: 'Our Signature Golden Crust Loaf',
    category: 'loaves',
    image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g2',
    title: 'Gently Sliced and Ready to Serve',
    category: 'loaves',
    image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g3',
    title: 'A Perfect Morning Coffee Pairing',
    category: 'pairing',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g4',
    title: 'Premium Hand-Wrapped Packaging',
    category: 'packaging',
    image: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g5',
    title: 'Luxury Linen Gift Box Bundle',
    category: 'packaging',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g6',
    title: 'Cozy Family Breakfast Moments',
    category: 'lifestyle',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g7',
    title: 'Warm Butter Melting Over Slice',
    category: 'pairing',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'g8',
    title: 'Handcrafted Bakery Prep with Care',
    category: 'lifestyle',
    image: 'https://images.unsplash.com/photo-1517433456452-f9633a875f6f?auto=format&fit=crop&q=80&w=600'
  }
];

export const faqs: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How long does delivery take?',
    answer: 'We bake fresh every morning! Orders placed before 10:00 AM are delivered same-day. Orders placed after 10:00 AM are queued for early next-morning baking and delivery. You can also select a specific future date and time during checkout.'
  },
  {
    id: 'faq-2',
    question: 'Do you bake fresh daily?',
    answer: 'Absolutely. We do not store or freeze our products. Every single loaf of banana bread is baked from scratch starting at 4:30 AM every day and delivered warm right from the oven.'
  },
  {
    id: 'faq-3',
    question: 'Can I order in bulk for events or office meetings?',
    answer: 'Yes! We cater to corporate orders, office breakfasts, brunch parties, and wedding favors. For orders of 10 loaves or more, please place your order at least 24-48 hours in advance so we can reserve our oven capacity for you.'
  },
  {
    id: 'faq-4',
    question: 'Can I send a banana bread loaf as a gift?',
    answer: 'Yes, it makes the perfect gift! We offer a premium linen-wrapped Gift Box Bundle that includes premium custom packaging, a golden ribbon, and a handwritten greeting card with your personalized message. Just fill in the recipient details at checkout!'
  },
  {
    id: 'faq-5',
    question: 'How should I store my banana bread?',
    answer: 'Our bread remains perfectly moist for up to 3 days at room temperature when kept in our airtight container/wrap. You can store it in the refrigerator for up to 7 days, or slice and freeze it for up to 1 month. Tip: Reheat a slice in the toaster or microwave for 10 seconds for that fresh-out-of-the-oven melt-in-your-mouth experience!'
  }
];
