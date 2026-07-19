export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  image: string;
  tag?: string;
  toppings: string[];
  prepTime: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  review: string;
  rating: number;
  image: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
}

export interface Benefit {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
  selectedTopping: string;
  giftMessage?: string;
}
