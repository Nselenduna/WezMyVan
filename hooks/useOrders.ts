import { useEffect } from 'react';
import { useOrderStore } from '@/store/order.store';
import { useAuthStore } from '@/store/auth.store';

export function useOrders() {
  const profile = useAuthStore((s) => s.profile);
  const { orders, isLoading, error, fetchOrders } = useOrderStore();

  useEffect(() => {
    if (profile?.id) {
      fetchOrders(profile.id);
    }
  }, [profile?.id, fetchOrders]);

  return { orders, isLoading, error };
}
