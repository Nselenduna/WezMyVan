import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const PROXIMITY_METRES = 800;

// Haversine formula — returns distance in metres between two lat/lng points
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch confirmed orders with their stop location and van's current GPS
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      customer_id,
      van_id,
      stop_id,
      status,
      vans ( current_lat, current_lng, is_available ),
      route_stops ( lat, lng, street_name, eta )
    `)
    .eq('status', 'confirmed');

  if (error || !orders) {
    console.error('Failed to fetch orders:', error);
    return new Response('Error', { status: 500 });
  }

  let notified = 0;

  for (const order of orders) {
    const van = order.vans as { current_lat: number | null; current_lng: number | null; is_available: boolean } | null;
    const stop = order.route_stops as { lat: number; lng: number; street_name: string; eta: string } | null;

    if (!van?.is_available || van.current_lat == null || van.current_lng == null || !stop) continue;

    const distance = haversineMetres(van.current_lat, van.current_lng, stop.lat, stop.lng);
    if (distance > PROXIMITY_METRES) continue;

    // Fetch customer push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', order.customer_id)
      .single();

    if (!profile?.expo_push_token) continue;

    // Send via Expo Push Notification Service
    const message = {
      to: profile.expo_push_token,
      sound: 'default',
      title: '🍦 Your van is almost here!',
      body: `Your ice cream van is almost at ${stop.street_name}! ETA: ${stop.eta}`,
      data: { orderId: order.id },
    };

    const epnsResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (epnsResponse.ok) {
      notified++;
      // Update order to en_route so we don't spam the same notification
      await supabase
        .from('orders')
        .update({ status: 'en_route' })
        .eq('id', order.id);
    }
  }

  return new Response(JSON.stringify({ notified }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
