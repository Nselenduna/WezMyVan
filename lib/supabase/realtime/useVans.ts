// FIX #2: channelRef + isMounted guard — guaranteed cleanup on unmount
import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useVanStore } from '@/store/van.store';
import type { Van } from '@/types/database';
import { REALTIME_VANS_CHANNEL } from '@/constants/config';

export function useVansRealtime(): void {
  const { updateVan } = useVanStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    let isMounted = true;

    const channel = supabase
      .channel(REALTIME_VANS_CHANNEL)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vans', filter: 'is_available=eq.true' },
        (payload) => {
          if (!isMounted) return;
          updateVan(payload.new as Van);
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vans' },
        (payload) => {
          if (!isMounted) return;
          const van = payload.new as Van;
          if (van.is_available) updateVan(van);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [updateVan]);
}
