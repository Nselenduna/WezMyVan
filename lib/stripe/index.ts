import { supabase } from '@/lib/supabase/client';
import type { BasketItem } from './calculateOrder';

export { calculateOrder } from './calculateOrder';

interface CreatePaymentIntentParams {
  van_id: string;
  stop_id: string;
  items: BasketItem[];
}

interface CreatePaymentIntentResult {
  clientSecret: string;
  orderId: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams,
): Promise<CreatePaymentIntentResult> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResult>(
    'create-payment-intent',
    { body: params },
  );

  if (error) throw error;
  if (!data) throw new Error('No response from payment intent function');

  return data;
}
