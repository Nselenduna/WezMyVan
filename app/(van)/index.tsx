import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvailableToggle } from '@/components/van/AvailableToggle';
import { useAuthStore } from '@/store/auth.store';
import { useVanStore } from '@/store/van.store';
import { useOrderStore } from '@/store/order.store';
import { useVanOrdersRealtime } from '@/lib/supabase/realtime/useVanOrders';
import { getPendingVanOrders } from '@/lib/supabase/queries/orders';
import { BLUE, GREEN, AMBER, CREAM } from '@/constants/Colors';
import type { Order } from '@/types/database';
import { ORDER_REJECTION_WINDOW_MS } from '@/constants/config';

function useCountdown(createdAt: string): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const remaining = Math.max(0, ORDER_REJECTION_WINDOW_MS - elapsed);
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.floor((remaining % 60_000) / 1_000);
      setLabel(`${mins}:${secs.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [createdAt]);
  return label;
}

function PendingOrderCard({
  order,
  onConfirm,
  onReject,
}: {
  order: Order;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const countdown = useCountdown(order.created_at);
  const isExpiring = (() => {
    const elapsed = Date.now() - new Date(order.created_at).getTime();
    return ORDER_REJECTION_WINDOW_MS - elapsed < 60_000;
  })();

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderTotal}>£{order.total_gbp.toFixed(2)}</Text>
        <Text style={[styles.countdown, isExpiring && styles.countdownUrgent]}>
          ⏱ {countdown}
        </Text>
      </View>
      <Text style={styles.orderMeta}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm(order.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmText}>✓ CONFIRM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => onReject(order.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.rejectText}>✕ REJECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function VanDashboard() {
  const { profile } = useAuthStore();
  const { myVan } = useVanStore();
  const { confirmOrder, rejectOrder } = useOrderStore();
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingOrders = useCallback(async () => {
    if (!myVan?.id) return;
    setIsLoading(true);
    try {
      const orders = await getPendingVanOrders(myVan.id);
      setPendingOrders(orders);
    } catch {
      // Non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [myVan?.id]);

  useEffect(() => { loadPendingOrders(); }, [loadPendingOrders]);

  const handleNewOrder = useCallback((order: Order) => {
    setPendingOrders((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      Vibration.vibrate(400);
      return [order, ...prev];
    });
  }, []);

  useVanOrdersRealtime(myVan?.id, handleNewOrder);

  const handleConfirm = async (orderId: string) => {
    await confirmOrder(orderId);
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleReject = async (orderId: string) => {
    await rejectOrder(orderId);
    setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Blue header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              Hey {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={styles.vanName}>{myVan?.name ?? 'Your Van'} 🐄</Text>
          </View>
        </View>
        {myVan && (
          <AvailableToggle vanId={myVan.id} isAvailable={myVan.is_available} />
        )}
      </View>

      <FlatList
        data={pendingOrders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📦 Incoming Orders</Text>
            {pendingOrders.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingOrders.length}</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <PendingOrderCard
            order={item}
            onConfirm={handleConfirm}
            onReject={handleReject}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍦</Text>
              <Text style={styles.empty}>No pending orders right now</Text>
              <Text style={styles.emptySub}>New orders will appear here instantly</Text>
            </View>
          )
        }
        contentContainerStyle={{ gap: 12, padding: 16, paddingBottom: 40 }}
        onRefresh={loadPendingOrders}
        refreshing={isLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  vanName: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: { color: '#1a1a1a', fontSize: 16, fontWeight: '800' },
  badge: {
    backgroundColor: AMBER,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: AMBER + '50',
  },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { color: '#1a1a1a', fontSize: 22, fontWeight: '900' },
  orderMeta: { color: '#9ca3af', fontSize: 12 },
  countdown: { color: AMBER, fontSize: 14, fontWeight: '700' },
  countdownUrgent: { color: '#ef4444' },
  orderActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: GREEN,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#fef2f2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectText: { color: '#ef4444', fontWeight: '800', fontSize: 13 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 6 },
  emptyIcon: { fontSize: 48 },
  empty: { color: '#374151', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#9ca3af', fontSize: 13 },
});
