import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const COMMISSION_RATE = 0.12;

interface OrderItem {
  menu_item_id: string;
  quantity: number;
}

interface RequestBody {
  van_id: string;
  stop_id: string;
  items: OrderItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify auth — customer only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Unauthorized', 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (authError || !user) return errorResponse('Unauthorized', 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'customer') return errorResponse('Forbidden: customers only', 403);

    const body: RequestBody = await req.json();
    const { van_id, stop_id, items } = body;

    if (!van_id || !stop_id || !items?.length) {
      return errorResponse('Missing required fields', 400);
    }

    // Fetch menu items and verify they belong to this van
    const menuItemIds = items.map((i) => i.menu_item_id);
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, price_gbp, name, is_available, van_id')
      .in('id', menuItemIds);

    if (menuError || !menuItems) return errorResponse('Failed to fetch menu items', 500);

    for (const item of menuItems) {
      if (item.van_id !== van_id) return errorResponse('Menu item does not belong to this van', 400);
      if (!item.is_available) return errorResponse(`Item "${item.name}" is no longer available`, 400);
    }

    // Calculate totals
    let total_gbp = 0;
    const lineItems = items.map((orderItem) => {
      const menuItem = menuItems.find((m) => m.id === orderItem.menu_item_id)!;
      const lineTotal = menuItem.price_gbp * orderItem.quantity;
      total_gbp += lineTotal;
      return { menu_item_id: orderItem.menu_item_id, quantity: orderItem.quantity, unit_price_gbp: menuItem.price_gbp };
    });

    const commission_gbp = Math.round(total_gbp * COMMISSION_RATE * 100) / 100;
    const totalPence = Math.round(total_gbp * 100);
    const commissionPence = Math.round(commission_gbp * 100);

    // Get van operator's Stripe account
    const { data: van } = await supabase
      .from('vans')
      .select('operator_id')
      .eq('id', van_id)
      .single();

    const { data: operator } = await supabase
      .from('van_operators')
      .select('stripe_account_id')
      .eq('id', van?.operator_id)
      .single();

    if (!operator?.stripe_account_id) {
      return errorResponse('Van operator has not connected Stripe', 400);
    }

    // Create Stripe destination charge PaymentIntent
    // Physical goods: Apple/Google take 0% — Stripe Connect only
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalPence,
      currency: 'gbp',
      transfer_data: { destination: operator.stripe_account_id },
      application_fee_amount: commissionPence,
      metadata: { van_id, stop_id, customer_id: user.id },
    });

    // Insert order + order_items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        van_id,
        stop_id,
        status: 'pending',
        total_gbp,
        commission_gbp,
        stripe_payment_id: paymentIntent.id,
      })
      .select('id')
      .single();

    if (orderError || !order) return errorResponse('Failed to create order', 500);

    await supabase.from('order_items').insert(
      lineItems.map((li) => ({ ...li, order_id: order.id })),
    );

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret, orderId: order.id }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (err) {
    console.error('create-payment-intent error:', err);
    return errorResponse('Internal server error', 500);
  }
});

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
