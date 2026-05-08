import { supabase } from '@/lib/supabase/client';
import type { Profile, UserRole } from '@/types/database';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProfile(
  userId: string,
  fullName: string,
  role: UserRole,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, full_name: fullName, role })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePushToken(userId: string, token: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) throw error;
}
