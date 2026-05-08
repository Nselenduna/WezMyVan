import { useEffect } from 'react';
import { useVanStore } from '@/store/van.store';
import { useVansRealtime } from '@/lib/supabase/realtime/useVans';

export function useVans() {
  const { vans, isLoading, error, fetchAvailableVans } = useVanStore();

  // Subscribe to Realtime GPS updates
  useVansRealtime();

  useEffect(() => {
    fetchAvailableVans();
  }, [fetchAvailableVans]);

  return { vans, isLoading, error };
}
