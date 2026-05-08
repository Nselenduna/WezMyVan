import { create } from 'zustand';
import type { MenuItem, OrderWithItems, RouteStop } from '@/types/database';
import { getCustomerOrders, updateOrderStatus } from '@/lib/supabase/queries/orders';
import { createPaymentIntent } from '@/lib/stripe';
import { calculateOrder, type BasketItem } from '@/lib/stripe/calculateOrder';

interface BasketEntry extends BasketItem {
  name: string;
}

interface OrderState {
  orders: OrderWithItems[];
  basket: BasketEntry[];
  selectedVanId: string | null;
  selectedStop: RouteStop | null;
  isLoading: boolean;
  error: string | null;
}

interface OrderActions {
  fetchOrders: (customerId: string) => Promise<void>;
  addToBasket: (item: MenuItem) => void;
  removeFromBasket: (menuItemId: string) => void;
  clearBasket: () => void;
  setSelectedStop: (vanId: string, stop: RouteStop) => void;
  checkout: () => Promise<{ clientSecret: string; orderId: string }>;
  confirmOrder: (orderId: string) => Promise<void>;
  rejectOrder: (orderId: string) => Promise<void>;
  collectOrder: (orderId: string) => Promise<void>;
  clearError: () => void;
}

export const useOrderStore = create<OrderState & OrderActions>((set, get) => ({
  orders: [],
  basket: [],
  selectedVanId: null,
  selectedStop: null,
  isLoading: false,
  error: null,

  fetchOrders: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      const orders = await getCustomerOrders(customerId);
      set({ orders, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load orders', isLoading: false });
    }
  },

  addToBasket: (item) => {
    set((state) => {
      const existing = state.basket.find((b) => b.menu_item_id === item.id);
      if (existing) {
        return {
          basket: state.basket.map((b) =>
            b.menu_item_id === item.id ? { ...b, quantity: b.quantity + 1 } : b,
          ),
        };
      }
      return {
        basket: [
          ...state.basket,
          { menu_item_id: item.id, quantity: 1, unit_price_gbp: item.price_gbp, name: item.name },
        ],
      };
    });
  },

  removeFromBasket: (menuItemId) => {
    set((state) => ({
      basket: state.basket
        .map((b) => (b.menu_item_id === menuItemId ? { ...b, quantity: b.quantity - 1 } : b))
        .filter((b) => b.quantity > 0),
    }));
  },

  clearBasket: () => set({ basket: [], selectedVanId: null, selectedStop: null }),

  setSelectedStop: (vanId, stop) => set({ selectedVanId: vanId, selectedStop: stop }),

  checkout: async () => {
    const { basket, selectedVanId, selectedStop } = get();
    if (!selectedVanId || !selectedStop) throw new Error('No stop selected');
    if (!basket.length) throw new Error('Basket is empty');

    set({ isLoading: true, error: null });
    try {
      const result = await createPaymentIntent({
        van_id: selectedVanId,
        stop_id: selectedStop.id,
        items: basket.map(({ menu_item_id, quantity }) => ({ menu_item_id, quantity, unit_price_gbp: 0 })),
      });
      set({ isLoading: false });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Checkout failed', isLoading: false });
      throw err;
    }
  },

  confirmOrder: async (orderId) => {
    await updateOrderStatus(orderId, 'confirmed');
  },

  rejectOrder: async (orderId) => {
    await updateOrderStatus(orderId, 'rejected');
  },

  collectOrder: async (orderId) => {
    await updateOrderStatus(orderId, 'collected');
  },

  clearError: () => set({ error: null }),
}));

export { calculateOrder };
