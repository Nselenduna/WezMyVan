import { supabase } from '@/lib/supabase/client';
import type { Van } from '@/types/database';

export async function getAvailableVans(): Promise<Van[]> {
  const { data, error } = await supabase
    .from('vans')
    .select('*')
    .eq('is_available', true);

  if (error) throw error;
  return data ?? [];
}

export async function getVanByOperator(operatorId: string): Promise<Van | null> {
  const { data, error } = await supabase
    .from('vans')
    .select('*')
    .eq('operator_id', operatorId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateVanAvailability(vanId: string, isAvailable: boolean): Promise<void> {
  const { error } = await supabase
    .from('vans')
    .update({ is_available: isAvailable })
    .eq('id', vanId);

  if (error) throw error;
}

export async function updateVanLocation(
  vanId: string,
  lat: number,
  lng: number,
): Promise<void> {
  const { error } = await supabase
    .from('vans')
    .update({ current_lat: lat, current_lng: lng, last_ping: new Date().toISOString() })
    .eq('id', vanId);

  if (error) throw error;
}

export async function createVan(
  operatorId: string,
  vanName: string,
  registration?: string,
): Promise<Van> {
  const { data, error } = await supabase
    .from('vans')
    .insert({ operator_id: operatorId, van_name: vanName, registration })
    .select()
    .single();

  if (error) throw error;
  return data;
}
