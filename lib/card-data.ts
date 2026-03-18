// lib/card-data.ts
export interface CardData {
  id: string;
  title: string;
  subtitle: string;
  comingSoon: boolean;
  route?: string;
}

export const CARDS: CardData[] = [
  { id: 'charge', title: 'Charge', subtitle: 'Find a charger near you',  comingSoon: false, route: '/(drawer)/charge' },
  { id: 'stay',   title: 'Stay',   subtitle: 'Book EV-friendly stays',    comingSoon: false, route: '/(drawer)/stay'   },
  { id: 'eat',    title: 'Eat',    subtitle: 'Dine while you charge',     comingSoon: false, route: '/(drawer)/eat'    },
  { id: 'shop',   title: 'Shop',   subtitle: 'Shop nearby',               comingSoon: true                             },
  { id: 'ride',   title: 'Ride',   subtitle: 'EV rides on demand',        comingSoon: true                             },
  { id: 'fly',    title: 'Fly',    subtitle: 'Electric air travel',       comingSoon: true                             },
];
