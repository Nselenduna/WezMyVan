import { supabase } from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';

export async function getVanMenu(vanId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('van_id', vanId)
    .eq('is_available', true)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function getAllVanMenuItems(vanId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('van_id', vanId)
    .order('name');

  if (error) throw error;
  return data ?? [];
}

export async function upsertMenuItem(
  item: Omit<MenuItem, 'id' | 'created_at'> & { id?: string },
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .upsert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleMenuItemAvailability(
  itemId: string,
  isAvailable: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
  if (error) throw error;
}
