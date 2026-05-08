import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase/client';

export async function startStripeConnectOnboarding(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('create-stripe-account', {
    body: {
      returnUrl: 'wezmevan://stripe-return',
      refreshUrl: 'wezmevan://stripe-refresh',
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('No onboarding URL returned');

  await Linking.openURL(data.url);
}

export async function getStripeAccountStatus(
  operatorId: string,
): Promise<{ connected: boolean; accountId: string | null }> {
  const { data } = await supabase
    .from('van_operators')
    .select('stripe_account_id')
    .eq('id', operatorId)
    .single();

  return {
    connected: !!data?.stripe_account_id,
    accountId: data?.stripe_account_id ?? null,
  };
}
