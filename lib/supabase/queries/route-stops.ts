import { supabase } from '@/lib/supabase/client';
import type { RouteStop } from '@/types/database';

export async function getTodayRouteStops(vanId: string): Promise<RouteStop[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('route_stops')
    .select('*')
    .eq('van_id', vanId)
    .eq('route_date', today)
    .order('stop_order');

  if (error) throw error;
  return data ?? [];
}

export async function replaceRouteStops(
  vanId: string,
  stops: Omit<RouteStop, 'id' | 'created_at'>[],
): Promise<RouteStop[]> {
  const today = new Date().toISOString().split('T')[0];

  // Delete existing stops for today, then insert new ones
  await supabase.from('route_stops').delete().eq('van_id', vanId).eq('route_date', today);

  const { data, error } = await supabase
    .from('route_stops')
    .insert(stops.map((s, i) => ({ ...s, van_id: vanId, stop_order: i + 1, route_date: today })))
    .select();

  if (error) throw error;
  return data ?? [];
}
