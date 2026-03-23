import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { useToastStore } from './toast-store';

export async function supaQuery<T>(
  promise: PromiseLike<PostgrestSingleResponse<T>>,
  opts?: { silent?: boolean }
): Promise<T | null> {
  const { data, error } = await promise;
  if (error) {
    if (!opts?.silent) {
      useToastStore.getState().showToast({
        type: 'error',
        title: 'SOMETHING WENT WRONG',
        subtitle: error.message,
      });
    }
    return null;
  }
  return data;
}
