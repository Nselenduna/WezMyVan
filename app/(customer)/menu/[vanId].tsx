import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getVanMenu } from '@/lib/supabase/queries/menu-items';
import { getTodayRouteStops } from '@/lib/supabase/queries/route-stops';
import { useOrderStore } from '@/store/order.store';
import { Button } from '@/components/ui/Button';
import { BLUE, PINK, AMBER, CREAM } from '@/constants/Colors';
import type { MenuItem, RouteStop } from '@/types/database';

export default function MenuScreen() {
  const { vanId, vanName } = useLocalSearchParams<{ vanId: string; vanName: string }>();
  const router = useRouter();
  const { basket, addToBasket, removeFromBasket, setSelectedStop } = useOrderStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [selectedStop, setSelectedStopLocal] = useState<RouteStop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vanId) return;
    Promise.all([getVanMenu(vanId), getTodayRouteStops(vanId)])
      .then(([items, routeStops]) => {
        setMenuItems(items);
        setStops(routeStops);
        if (routeStops.length) setSelectedStopLocal(routeStops[0]);
      })
      .catch(() => Alert.alert('Error', 'Could not load menu'))
      .finally(() => setIsLoading(false));
  }, [vanId]);

  const basketCount = basket.reduce((sum, b) => sum + b.quantity, 0);
  const basketTotal = basket.reduce((sum, b) => sum + b.quantity * b.unit_price_gbp, 0);
  const getItemQty = (id: string) => basket.find((b) => b.menu_item_id === id)?.quantity ?? 0;

  const handleGoToBasket = () => {
    if (!selectedStop || !vanId) return;
    setSelectedStop(vanId, selectedStop);
    router.push('/(customer)/basket');
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Blue header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← </Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.vanName}>🍦 {vanName}</Text>
          {selectedStop && (
            <View style={styles.etaRow}>
              <Text style={styles.etaIcon}>📍</Text>
              <Text style={styles.etaStreet}>{selectedStop.street_name} ETA</Text>
              <Text style={styles.etaTime}>{selectedStop.eta}</Text>
            </View>
          )}
        </View>
      </View>

      {stops.length > 1 && (
        <View style={styles.stopPicker}>
          <FlatList
            data={stops}
            keyExtractor={(s) => s.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.stopChip, selectedStop?.id === item.id && styles.stopChipActive]}
                onPress={() => setSelectedStopLocal(item)}
              >
                <Text style={[styles.stopChipText, selectedStop?.id === item.id && styles.stopChipTextActive]}>
                  {item.street_name} · {item.eta}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}
          />
        </View>
      )}

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const qty = getItemQty(item.id);
          return (
            <View style={styles.itemRow}>
              <View style={styles.itemImageBox}>
                <Text style={styles.itemImagePlaceholder}>🍦</Text>
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? <Text style={styles.itemDesc}>{item.description}</Text> : null}
                <Text style={styles.itemPrice}>£{item.price_gbp.toFixed(2)}</Text>
              </View>
              <View style={styles.qtyRow}>
                {qty > 0 && (
                  <TouchableOpacity style={styles.qtyBtnMinus} onPress={() => removeFromBasket(item.id)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                )}
                {qty > 0 && <Text style={styles.qtyCount}>{qty}</Text>}
                <TouchableOpacity style={styles.qtyBtnAdd} onPress={() => addToBasket(item)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No items available right now</Text>}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 120 }}
      />

      {basketCount > 0 && (
        <View style={styles.basketBar}>
          <TouchableOpacity style={styles.basketBtn} onPress={handleGoToBasket} activeOpacity={0.9}>
            <View style={styles.basketLeft}>
              <View style={styles.basketCountBadge}>
                <Text style={styles.basketCountText}>{basketCount} items</Text>
              </View>
            </View>
            <Text style={styles.basketTotal}>£{basketTotal.toFixed(2)}</Text>
            <Text style={styles.basketCta}>Checkout →</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: {
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backText: { color: '#fff', fontSize: 20 },
  headerInfo: { flex: 1, gap: 4 },
  vanName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  etaIcon: { fontSize: 12 },
  etaStreet: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  etaTime: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 4 },
  stopPicker: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stopChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  stopChipActive: { borderColor: BLUE, backgroundColor: '#eff6ff' },
  stopChipText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  stopChipTextActive: { color: BLUE },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  itemImageBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemImagePlaceholder: { fontSize: 26 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  itemDesc: { color: '#9ca3af', fontSize: 12 },
  itemPrice: { color: BLUE, fontWeight: '700', fontSize: 15, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtnMinus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qtyBtnAdd: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 24 },
  qtyCount: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 40 },
  basketBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  basketBtn: {
    backgroundColor: PINK,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  basketLeft: { flex: 1 },
  basketCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  basketCountText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  basketTotal: { color: '#fff', fontWeight: '800', fontSize: 18 },
  basketCta: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 12 },
});
