import { supabase } from '@/lib/supabase/client';
import type { VanOperator } from '@/types/database';

export async function getVanOperatorByProfile(profileId: string): Promise<VanOperator | null> {
  const { data, error } = await supabase
    .from('van_operators')
    .select('*')
    .eq('profile_id', profileId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createVanOperator(
  profileId: string,
  businessName: string,
): Promise<VanOperator> {
  const { data, error } = await supabase
    .from('van_operators')
    .insert({ profile_id: profileId, business_name: businessName })
    .select()
    .single();

  if (error) throw error;
  return data;
}
