import { act, renderHook } from '@testing-library/react-native';
import { useToastStore } from '../toast-store';

beforeEach(() => useToastStore.setState({ toast: null }));

describe('toast store', () => {
  it('starts with no toast', () => {
    const { result } = renderHook(() => useToastStore());
    expect(result.current.toast).toBeNull();
  });

  it('showToast sets the toast', () => {
    const { result } = renderHook(() => useToastStore());
    act(() => result.current.showToast({ type: 'success', title: 'Done' }));
    expect(result.current.toast).toEqual({ type: 'success', title: 'Done' });
  });

  it('showToast with subtitle includes subtitle', () => {
    const { result } = renderHook(() => useToastStore());
    act(() => result.current.showToast({ type: 'error', title: 'Fail', subtitle: 'Try again' }));
    expect(result.current.toast?.subtitle).toBe('Try again');
  });

  it('hideToast clears the toast', () => {
    const { result } = renderHook(() => useToastStore());
    act(() => result.current.showToast({ type: 'info', title: 'Hi' }));
    act(() => result.current.hideToast());
    expect(result.current.toast).toBeNull();
  });

  it('showToast replaces existing toast', () => {
    const { result } = renderHook(() => useToastStore());
    act(() => result.current.showToast({ type: 'success', title: 'First' }));
    act(() => result.current.showToast({ type: 'error', title: 'Second' }));
    expect(result.current.toast?.title).toBe('Second');
    expect(result.current.toast?.type).toBe('error');
  });
});
