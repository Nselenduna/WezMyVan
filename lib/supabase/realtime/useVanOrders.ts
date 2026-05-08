// FIX #3: channelRef + isMounted guard — guaranteed cleanup on unmount
import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Order } from '@/types/database';
import { REALTIME_ORDERS_CHANNEL } from '@/constants/config';

type OrderCallback = (order: Order) => void;

export function useVanOrdersRealtime(vanId: string | undefined, onNewOrder: OrderCallback): void {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!vanId) return;

    let isMounted = true;

    const channel = supabase
      .channel(`${REALTIME_ORDERS_CHANNEL}:${vanId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `van_id=eq.${vanId}`,
        },
        (payload) => {
          if (!isMounted) return;
          onNewOrder(payload.new as Order);
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
  }, [vanId, onNewOrder]);
}
