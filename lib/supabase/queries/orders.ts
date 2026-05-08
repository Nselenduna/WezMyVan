import { supabase } from '@/lib/supabase/client';
import type { Order, OrderStatus, OrderWithItems } from '@/types/database';

export async function getCustomerOrders(customerId: string): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as OrderWithItems[]) ?? [];
}

export async function getVanOrders(vanId: string): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(*))')
    .eq('van_id', vanId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as OrderWithItems[]) ?? [];
}

export async function getPendingVanOrders(vanId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('van_id', vanId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  const update: Partial<Order> = { status };
  if (status === 'rejected') update.rejected_at = new Date().toISOString();
  if (status === 'collected') update.collected_at = new Date().toISOString();

  const { error } = await supabase.from('orders').update(update).eq('id', orderId);
  if (error) throw error;
}

export interface AlertOrder {
  id: string;
  status: OrderStatus;
  total_gbp: number;
  created_at: string;
  vans: { van_name: string } | null;
  route_stops: { street_name: string; eta: string } | null;
}

export async function getCustomerAlertsData(customerId: string): Promise<AlertOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, total_gbp, created_at, vans(van_name), route_stops(street_name, eta)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data as unknown as AlertOrder[]) ?? [];
}
