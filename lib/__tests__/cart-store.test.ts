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
