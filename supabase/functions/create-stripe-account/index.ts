import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return err('Unauthorized', 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return err('Unauthorized', 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'van_operator') return err('Forbidden: van operators only', 403);

    const { data: operator } = await supabase
      .from('van_operators')
      .select('id, stripe_account_id')
      .eq('profile_id', user.id)
      .single();

    if (!operator) return err('Van operator record not found', 404);

    // Re-use existing account if already created
    let accountId = operator.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'express', country: 'GB' });
      accountId = account.id;

      await supabase
        .from('van_operators')
        .update({ stripe_account_id: accountId })
        .eq('id', operator.id);
    }

    const { returnUrl, refreshUrl } = await req.json().catch(() => ({
      returnUrl: 'wezmevan://stripe-return',
      refreshUrl: 'wezmevan://stripe-refresh',
    }));

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, accountId }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (e) {
    console.error('create-stripe-account error:', e);
    return err('Internal server error', 500);
  }
});

function err(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
