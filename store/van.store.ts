import { create } from 'zustand';
import type { Van, RouteStop } from '@/types/database';
import { getAvailableVans, updateVanAvailability } from '@/lib/supabase/queries/vans';
import { getTodayRouteStops, replaceRouteStops } from '@/lib/supabase/queries/route-stops';
import { startBroadcast, stopBroadcast } from '@/lib/location/broadcastLocation';

interface VanState {
  vans: Van[];
  myVan: Van | null;
  todayStops: RouteStop[];
  isLoading: boolean;
  error: string | null;
}

interface VanActions {
  setVans: (vans: Van[]) => void;
  updateVan: (van: Van) => void;
  fetchAvailableVans: () => Promise<void>;
  fetchMyVan: (vanId: string) => Promise<void>;
  setAvailability: (vanId: string, available: boolean) => Promise<void>;
  fetchTodayStops: (vanId: string) => Promise<void>;
  saveTodayStops: (vanId: string, stops: Omit<RouteStop, 'id' | 'created_at'>[]) => Promise<void>;
  clearError: () => void;
}

export const useVanStore = create<VanState & VanActions>((set, get) => ({
  vans: [],
  myVan: null,
  todayStops: [],
  isLoading: false,
  error: null,

  setVans: (vans) => set({ vans }),

  updateVan: (updatedVan) => {
    set((state) => ({
      vans: state.vans.some((v) => v.id === updatedVan.id)
        ? state.vans.map((v) => (v.id === updatedVan.id ? updatedVan : v))
        : [...state.vans, updatedVan],
      myVan: state.myVan?.id === updatedVan.id ? updatedVan : state.myVan,
    }));
  },

  fetchAvailableVans: async () => {
    set({ isLoading: true, error: null });
    try {
      const vans = await getAvailableVans();
      set({ vans, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load vans', isLoading: false });
    }
  },

  fetchMyVan: async (vanId) => {
    set({ isLoading: true });
    try {
      const vans = await getAvailableVans();
      const myVan = vans.find((v) => v.id === vanId) ?? null;
      set({ myVan, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load van', isLoading: false });
    }
  },

  setAvailability: async (vanId, available) => {
    try {
      await updateVanAvailability(vanId, available);
      if (available) {
        await startBroadcast(vanId);
      } else {
        await stopBroadcast();
      }
      set((state) => ({
        myVan: state.myVan ? { ...state.myVan, is_available: available } : null,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to update availability' });
      throw err;
    }
  },

  fetchTodayStops: async (vanId) => {
    try {
      const stops = await getTodayRouteStops(vanId);
      set({ todayStops: stops });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load route' });
    }
  },

  saveTodayStops: async (vanId, stops) => {
    set({ isLoading: true });
    try {
      const saved = await replaceRouteStops(vanId, stops);
      set({ todayStops: saved, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save route', isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
