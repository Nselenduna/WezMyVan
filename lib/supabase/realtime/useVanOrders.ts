import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Order } from '@/types/database';
import { REALTIME_ORDERS_CHANNEL } from '@/constants/config';

type OrderCallback = (order: Order) => void;

export function useVanOrdersRealtime(vanId: string | undefined, onNewOrder: OrderCallback): void {
  useEffect(() => {
    if (!vanId) return;

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
        (payload) => onNewOrder(payload.new as Order),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vanId, onNewOrder]);
}
