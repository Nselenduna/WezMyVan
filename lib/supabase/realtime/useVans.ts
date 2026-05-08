import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useVanStore } from '@/store/van.store';
import type { Van } from '@/types/database';
import { REALTIME_VANS_CHANNEL } from '@/constants/config';

export function useVansRealtime(): void {
  const { setVans, updateVan } = useVanStore();

  useEffect(() => {
    const channel = supabase
      .channel(REALTIME_VANS_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vans', filter: 'is_available=eq.true' },
        (payload) => {
          updateVan(payload.new as Van);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vans' },
        (payload) => {
          const van = payload.new as Van;
          if (van.is_available) updateVan(van);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setVans, updateVan]);
}
