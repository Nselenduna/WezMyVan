import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { getCustomerAlertsData, type AlertOrder } from '@/lib/supabase/queries/orders';
import { BLUE, AMBER, GREEN, CREAM } from '@/constants/Colors';
import type { OrderStatus } from '@/types/database';

interface AlertEntry {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

type ListRow = { kind: 'header'; label: string } | { kind: 'alert'; entry: AlertEntry };

const ALERT_ICON: Record<OrderStatus, string> = {
  pending:   '⏳',
  confirmed: '✅',
  en_route:  '🚐',
  ready:     '🎉',
  collected: '🍦',
  rejected:  '✕',
  refunded:  '↩',
};

const ALERT_TITLE: Record<OrderStatus, string> = {
  pending:   'Order Placed',
  confirmed: 'Order Confirmed!',
  en_route:  'Van Almost Here!',
  ready:     'Order Ready to Collect!',
  collected: 'Order Collected',
  rejected:  'Order Cancelled',
  refunded:  'Payment Refunded',
};

function buildBody(status: OrderStatus, van: string, stop: string): string {
  switch (status) {
    case 'pending':   return `Waiting for ${van} to confirm your order.`;
    case 'confirmed': return `${van} confirmed your order. Head to ${stop} at the right time.`;
    case 'en_route':  return `${van} is heading to ${stop} — get ready outside!`;
    case 'ready':     return `Your order is ready to collect at ${stop}.`;
    case 'collected': return `Enjoy your treats from ${van}! 🍦`;
    case 'rejected':  return `Your ${van} order was cancelled. If you were charged, a refund is on its way.`;
    case 'refunded':  return `Your payment for the ${van} order has been refunded.`;
    default:          return `Your order status has been updated.`;
  }
}

const ACTIVE_STATUSES = new Set<OrderStatus>(['pending', 'confirmed', 'en_route', 'ready']);

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (isToday(dateStr)) return timeStr;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return `Yesterday, ${timeStr}`;
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function orderToEntry(order: AlertOrder): AlertEntry {
  const van = order.vans?.van_name ?? 'your van';
  const stop = order.route_stops?.street_name ?? 'your stop';
  return {
    id: order.id,
    icon: ALERT_ICON[order.status] ?? '•',
    title: ALERT_TITLE[order.status] ?? 'Update',
    body: buildBody(order.status, van, stop),
    time: formatTime(order.created_at),
    unread: isToday(order.created_at) && ACTIVE_STATUSES.has(order.status),
  };
}

function buildRows(orders: AlertOrder[]): ListRow[] {
  const todayOrders = orders.filter((o) => isToday(o.created_at));
  const earlierOrders = orders.filter((o) => !isToday(o.created_at));
  const rows: ListRow[] = [];

  if (todayOrders.length > 0) {
    rows.push({ kind: 'header', label: 'TODAY' });
    todayOrders.forEach((o) => rows.push({ kind: 'alert', entry: orderToEntry(o) }));
  }
  if (earlierOrders.length > 0) {
    rows.push({ kind: 'header', label: 'EARLIER' });
    earlierOrders.forEach((o) => rows.push({ kind: 'alert', entry: orderToEntry(o) }));
  }
  return rows;
}

export default function AlertsScreen() {
  const { profile } = useAuthStore();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!profile?.id) return;
      if (isRefresh) setRefreshing(true);
      try {
        const orders = await getCustomerAlertsData(profile.id);
        setRows(buildRows(orders));
      } catch {
        // Non-fatal
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [profile?.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>🔔 Alerts</Text>
        <Text style={styles.sub}>Your order activity feed</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, i) =>
          item.kind === 'header' ? `header-${item.label}` : item.entry.id
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={BLUE}
          />
        }
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return <Text style={styles.sectionLabel}>{item.label}</Text>;
          }
          const { entry } = item;
          return (
            <View style={[styles.alertCard, entry.unread && styles.alertCardUnread]}>
              <View style={[styles.alertIconBox, entry.unread && styles.alertIconBoxUnread]}>
                <Text style={styles.alertIcon}>{entry.icon}</Text>
              </View>
              <View style={styles.alertBody}>
                <Text style={styles.alertTitle}>{entry.title}</Text>
                <Text style={styles.alertText}>{entry.body}</Text>
                <Text style={styles.alertTime}>{entry.time}</Text>
              </View>
              {entry.unread && <View style={styles.unreadDot} />}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No activity yet</Text>
            <Text style={styles.emptySub}>
              Place your first order and your alerts will appear here.
            </Text>
          </View>
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  heading: { color: '#1a1a1a', fontSize: 22, fontWeight: '800' },
  sub: { color: '#9ca3af', fontSize: 14, marginTop: 2 },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  alertCardUnread: { borderColor: '#bfdbfe', backgroundColor: '#f0f7ff' },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertIconBoxUnread: { backgroundColor: '#dbeafe' },
  alertIcon: { fontSize: 22 },
  alertBody: { flex: 1, gap: 3 },
  alertTitle: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  alertText: { color: '#6b7280', fontSize: 13, lineHeight: 18 },
  alertTime: { color: '#9ca3af', fontSize: 12 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
    marginTop: 4,
  },
  emptyState: { alignItems: 'center', gap: 8, marginTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#1a1a1a', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#9ca3af', textAlign: 'center', fontSize: 14, paddingHorizontal: 20 },
});
