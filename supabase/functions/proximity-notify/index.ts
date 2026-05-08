// FIX #4: Persistent deduplication using proximity_notifications table
// Cold-start safe — dedup state survives Edge Function restarts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PROXIMITY_THRESHOLD_METRES = 800;

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Round to 3dp ≈ ~110m grid for deduplication key */
function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: activeOrders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      van_id,
      stop_id,
      route_stops ( lat, lng, street_name, eta ),
      profiles ( expo_push_token, full_name )
    `)
    .eq('status', 'confirmed');

  if (ordersError) {
    console.error('[proximity-notify] Failed to fetch orders:', ordersError.message);
    return new Response('Error fetching orders', { status: 500 });
  }

  const { data: vans, error: vansError } = await supabase
    .from('vans')
    .select('id, current_lat, current_lng, van_name')
    .eq('is_available', true);

  if (vansError) {
    console.error('[proximity-notify] Failed to fetch vans:', vansError.message);
    return new Response('Error fetching vans', { status: 500 });
  }

  const vanMap = new Map(vans.map((v) => [v.id, v]));
  const notifications: Promise<void>[] = [];

  for (const order of activeOrders ?? []) {
    const van = vanMap.get(order.van_id);
    if (!van?.current_lat || !van?.current_lng) continue;

    const stop = order.route_stops as { lat: number; lng: number; street_name: string; eta: string } | null;
    if (!stop) continue;

    const distance = haversineMetres(van.current_lat, van.current_lng, stop.lat, stop.lng);
    if (distance > PROXIMITY_THRESHOLD_METRES) continue;

    const roundedLat = roundCoord(van.current_lat);
    const roundedLng = roundCoord(van.current_lng);

    // FIX #4 CORE: check persistent dedup table — survives cold starts
    const { data: existing } = await supabase
      .from('proximity_notifications')
      .select('id')
      .eq('order_id', order.id)
      .eq('sent_at_lat', roundedLat)
      .eq('sent_at_lng', roundedLng)
      .maybeSingle();

    if (existing) continue;

    const profile = order.profiles as { expo_push_token: string | null; full_name: string } | null;
    const pushToken = profile?.expo_push_token;
    if (!pushToken) continue;

    notifications.push(
      (async () => {
        const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pushToken,
            title: '🍦 Your van is almost here!',
            body: `Your ice cream van is about 10 mins away on ${stop.street_name}! ETA: ${stop.eta}`,
            data: { orderId: order.id },
          }),
        });

        if (!pushResponse.ok) {
          console.error('[proximity-notify] Push send failed for order', order.id);
          return;
        }

        const { error: insertError } = await supabase
          .from('proximity_notifications')
          .insert({
            order_id: order.id,
            van_id: order.van_id,
            sent_at_lat: roundedLat,
            sent_at_lng: roundedLng,
          });

        if (insertError) {
          console.error('[proximity-notify] Dedup insert failed:', insertError.message);
        }
      })(),
    );
  }

  await Promise.allSettled(notifications);

  return new Response(
    JSON.stringify({ sent: notifications.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
