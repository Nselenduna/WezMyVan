import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrders } from '@/hooks/useOrders';
import { BLUE, GREEN, AMBER, PINK, CREAM } from '@/constants/Colors';
import type { OrderWithItems } from '@/types/database';

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  pending:   { color: AMBER,    label: 'Pending',    icon: '⏳' },
  confirmed: { color: GREEN,    label: 'Confirmed',  icon: '✅' },
  en_route:  { color: BLUE,     label: 'En Route',   icon: '🚐' },
  ready:     { color: GREEN,    label: 'Ready',      icon: '🎉' },
  collected: { color: '#9ca3af', label: 'Collected', icon: '✓' },
  rejected:  { color: '#ef4444', label: 'Rejected',  icon: '✕' },
  refunded:  { color: '#9ca3af', label: 'Refunded',  icon: '↩' },
};

function OrderCard({ order }: { order: OrderWithItems }) {
  const status = STATUS_CONFIG[order.status] ?? { color: '#9ca3af', label: order.status, icon: '•' };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
          <Text style={styles.statusIcon}>{status.icon}</Text>
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.itemsList}>
        {order.order_items.map((item) => (
          <Text key={item.id} style={styles.itemLine}>
            {item.quantity}× {item.menu_items.name}
            <Text style={styles.itemPrice}> — £{(item.quantity * item.unit_price_gbp).toFixed(2)}</Text>
          </Text>
        ))}
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.totalLabel}>Total paid</Text>
        <Text style={styles.totalValue}>£{order.total_gbp.toFixed(2)}</Text>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const { orders, isLoading, error } = useOrders();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>📋 My Orders</Text>
      </View>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySub}>Find a van on the map and place your first order!</Text>
          </View>
        }
        contentContainerStyle={{ gap: 12, padding: 16 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  heading: { color: '#1a1a1a', fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { color: '#9ca3af', fontSize: 13, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusIcon: { fontSize: 12 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  itemsList: { gap: 4 },
  itemLine: { color: '#374151', fontSize: 14 },
  itemPrice: { color: '#9ca3af' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  totalLabel: { color: '#6b7280', fontSize: 14 },
  totalValue: { color: BLUE, fontWeight: '900', fontSize: 16 },
  emptyState: { alignItems: 'center', gap: 8, marginTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#1a1a1a', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#9ca3af', textAlign: 'center', fontSize: 14 },
  errorText: { color: '#ef4444', fontSize: 14 },
});
