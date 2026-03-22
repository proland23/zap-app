import { act, renderHook } from '@testing-library/react-native';
import { useCartStore } from '../cart-store';

beforeEach(() => useCartStore.setState({ items: [] }));

describe('cart store', () => {
  it('adds a new item with qty 1', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(1);
  });

  it('increments qty when same item added twice', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
  });

  it('removes an item', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.removeItem('1'));
    expect(result.current.items).toHaveLength(0);
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.clearCart());
    expect(result.current.items).toHaveLength(0);
  });
});

describe('shop cart store', () => {
  beforeEach(() => useCartStore.setState({ shopItems: [] }));

  it('adds a new shop item with the given qty', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 2));
    expect(result.current.shopItems).toHaveLength(1);
    expect(result.current.shopItems[0].qty).toBe(2);
  });

  it('accumulates qty when same shop item added again', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 3));
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 4));
    expect(result.current.shopItems).toHaveLength(1);
    expect(result.current.shopItems[0].qty).toBe(7);
  });

  it('caps qty at 10 when accumulating', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 8));
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 5));
    expect(result.current.shopItems[0].qty).toBe(10);
  });

  it('removes an entire shop item line', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 3));
    act(() => result.current.removeShopItem('a'));
    expect(result.current.shopItems).toHaveLength(0);
  });

  it('clears all shop items', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addShopItem({ id: 'a', name: 'Tee', price: 25 }, 1));
    act(() => result.current.addShopItem({ id: 'b', name: 'Cable', price: 15 }, 2));
    act(() => result.current.clearShopCart());
    expect(result.current.shopItems).toHaveLength(0);
  });

  it('does not affect food cart when adding shop items', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: 'f1', name: 'Burger', price: 9.99 }));
    act(() => result.current.addShopItem({ id: 's1', name: 'Tee', price: 25 }, 1));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.shopItems).toHaveLength(1);
  });
});
