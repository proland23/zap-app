// lib/card-data.ts
export interface CardData {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  comingSoon: boolean;
  route?: string;
}

export const CARDS: CardData[] = [
  { id: 'charge', title: 'Charge', emoji: '⚡', subtitle: 'Find a charger near you',  comingSoon: false, route: '/charge' },
  { id: 'stay',   title: 'Stay',   emoji: '🏠', subtitle: 'Book EV-friendly stays',    comingSoon: false, route: '/stay'   },
  { id: 'eat',    title: 'Eat',    emoji: '🍽', subtitle: 'Dine while you charge',     comingSoon: false, route: '/eat'    },
  { id: 'shop',   title: 'Shop',   emoji: '🛒', subtitle: 'Shop nearby',               comingSoon: false, route: '/shop'   },
  { id: 'ride',   title: 'Ride',   emoji: '🚗', subtitle: 'EV rides on demand',        comingSoon: true                   },
  { id: 'fly',    title: 'Fly',    emoji: '✈',  subtitle: 'Electric air travel',       comingSoon: true                   },
];
