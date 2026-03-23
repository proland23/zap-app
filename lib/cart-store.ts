import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  // Food cart
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  // Shop cart
  shopItems: CartItem[];
  addShopItem: (item: Omit<CartItem, 'qty'>, qty: number) => void;
  removeShopItem: (id: string) => void;
  clearShopCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      // Food cart
      items: [],
      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return { items: state.items.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) };
          }
          return { items: [...state.items, { ...item, qty: 1 }] };
        });
      },
      removeItem: (id) => { set((state) => ({ items: state.items.filter((i) => i.id !== id) })); },
      clearCart: () => { set({ items: [] }); },

      // Shop cart
      shopItems: [],
      addShopItem: (item, qty) => {
        set((state) => {
          const existing = state.shopItems.find((i) => i.id === item.id);
          if (existing) {
            return {
              shopItems: state.shopItems.map((i) =>
                i.id === item.id ? { ...i, qty: Math.min(i.qty + qty, 10) } : i
              ),
            };
          }
          return { shopItems: [...state.shopItems, { ...item, qty: Math.min(qty, 10) }] };
        });
      },
      removeShopItem: (id) => { set((state) => ({ shopItems: state.shopItems.filter((i) => i.id !== id) })); },
      clearShopCart: () => { set({ shopItems: [] }); },
    }),
    {
      name: 'zapp-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, shopItems: state.shopItems }),
      skipHydration: process.env.NODE_ENV === 'test',
    }
  )
);
