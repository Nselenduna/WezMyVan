import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrderStore } from '@/store/order.store';
import { calculateOrder } from '@/lib/stripe/calculateOrder';
import { Button } from '@/components/ui/Button';
import { BLUE, AMBER, CREAM } from '@/constants/Colors';
import { PLATFORM_COMMISSION } from '@/constants/config';

export default function BasketScreen() {
  const router = useRouter();
  const { basket, selectedStop, removeFromBasket, addToBasket, clearBasket } = useOrderStore();

  if (!basket.length) {
    router.back();
    return null;
  }

  const totals = calculateOrder(basket);
  const commissionPct = Math.round(PLATFORM_COMMISSION * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Basket</Text>
        <TouchableOpacity onPress={clearBasket}>
          <Text style={styles.clear}>Clear</Text>
        </TouchableOpacity>
      </View>

      {selectedStop && (
        <View style={styles.stopBanner}>
          <Text style={styles.stopBannerIcon}>📍</Text>
          <Text style={styles.stopBannerText}>
            {selectedStop.street_name} · {selectedStop.eta}
          </Text>
        </View>
      )}

      <FlatList
        data={basket}
        keyExtractor={(item) => item.menu_item_id}
        renderItem={({ item }) => (
          <View style={styles.lineItem}>
            <View style={styles.lineInfo}>
              <Text style={styles.lineName}>{item.name}</Text>
              <Text style={styles.lineUnit}>£{item.unit_price_gbp.toFixed(2)} each</Text>
            </View>
            <View style={styles.lineQty}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => removeFromBasket(item.menu_item_id)}
              >
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyCount}>{item.quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, styles.qtyBtnAdd]}
                onPress={() =>
                  addToBasket({
                    id: item.menu_item_id,
                    name: item.name,
                    price_gbp: item.unit_price_gbp,
                    van_id: '',
                    description: null,
                    image_url: null,
                    is_available: true,
                    created_at: '',
                  })
                }
              >
                <Text style={[styles.qtyText, styles.qtyTextAdd]}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lineTotal}>
              £{(item.quantity * item.unit_price_gbp).toFixed(2)}
            </Text>
          </View>
        )}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>£{totals.total_gbp.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{commissionPct}% service fee</Text>
          <Text style={styles.summaryValue}>£{totals.commission_gbp.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotalRow]}>
          <Text style={styles.totalLabel}>Total paid</Text>
          <Text style={styles.totalValue}>£{totals.total_gbp.toFixed(2)}</Text>
        </View>
        <Text style={styles.feeNote}>
          Van receives £{totals.van_payout_gbp.toFixed(2)} after platform fee.
        </Text>
        <Button
          label={`Pay £${totals.total_gbp.toFixed(2)}`}
          onPress={() => router.push('/(customer)/checkout')}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  back: { color: BLUE, fontSize: 22, fontWeight: '600' },
  title: { color: '#1a1a1a', fontSize: 18, fontWeight: '800' },
  clear: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
  stopBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  stopBannerIcon: { fontSize: 16 },
  stopBannerText: { color: BLUE, fontSize: 14, fontWeight: '600' },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  lineInfo: { flex: 1 },
  lineName: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  lineUnit: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  lineQty: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qtyBtnAdd: { backgroundColor: BLUE, borderColor: BLUE },
  qtyText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700', lineHeight: 20 },
  qtyTextAdd: { color: '#fff' },
  qtyCount: { color: '#1a1a1a', fontWeight: '700', minWidth: 20, textAlign: 'center' },
  lineTotal: { color: BLUE, fontWeight: '800', fontSize: 15, minWidth: 52, textAlign: 'right' },
  summary: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: '#6b7280', fontSize: 14 },
  summaryValue: { color: '#1a1a1a', fontSize: 14 },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
  totalValue: { color: BLUE, fontWeight: '900', fontSize: 18 },
  feeNote: { color: '#9ca3af', fontSize: 11, marginBottom: 4 },
});
