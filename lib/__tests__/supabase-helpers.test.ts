import { useToastStore } from '../toast-store';
import { supaQuery } from '../supabase-helpers';

beforeEach(() => useToastStore.setState({ toast: null }));

describe('supaQuery', () => {
  it('returns data when no error', async () => {
    const result = await supaQuery(
      Promise.resolve({ data: [{ id: '1' }], error: null })
    );
    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns null and shows error toast on error', async () => {
    const result = await supaQuery(
      Promise.resolve({ data: null, error: { message: 'not found', details: '', hint: '', code: '404' } })
    );
    expect(result).toBeNull();
    expect(useToastStore.getState().toast).toMatchObject({
      type: 'error',
      title: 'SOMETHING WENT WRONG',
      subtitle: 'not found',
    });
  });

  it('does not show toast when silent:true', async () => {
    await supaQuery(
      Promise.resolve({ data: null, error: { message: 'err', details: '', hint: '', code: '500' } }),
      { silent: true }
    );
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('returns null when data is null with no error', async () => {
    const result = await supaQuery(
      Promise.resolve({ data: null, error: null })
    );
    expect(result).toBeNull();
  });
});
