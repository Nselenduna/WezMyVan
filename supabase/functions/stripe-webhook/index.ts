import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, sound: 'default', title, body, data }),
  });
}

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('stripe_payment_id', pi.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Update status and get customer_id in one query
        const { data: updated } = await supabase
          .from('orders')
          .update({ status: 'rejected' })
          .eq('stripe_payment_id', pi.id)
          .select('customer_id')
          .maybeSingle();

        if (updated?.customer_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('expo_push_token')
            .eq('id', updated.customer_id)
            .maybeSingle();

          if (profile?.expo_push_token) {
            await sendPushNotification(
              profile.expo_push_token,
              '❌ Payment failed',
              'Your payment could not be processed. Please try your order again.',
              { type: 'payment_failed', paymentIntentId: pi.id },
            );
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await supabase
            .from('orders')
            .update({ status: 'refunded' })
            .eq('stripe_payment_id', charge.payment_intent as string);
        }
        break;
      }

      default:
        // Unhandled event type — ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
