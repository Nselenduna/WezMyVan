import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { useOrderStore } from '@/store/order.store';
import { Button } from '@/components/ui/Button';
import { BLUE, GREEN, PINK, CREAM } from '@/constants/Colors';

type CheckoutState = 'loading' | 'ready' | 'processing' | 'success' | 'error';

export default function CheckoutScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { basket, selectedStop, checkout, clearBasket } = useOrderStore();
  const [state, setState] = useState<CheckoutState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { initSheet(); }, []);

  const initSheet = async () => {
    setState('loading');
    try {
      const { clientSecret } = await checkout();
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Wez Me Van!!',
        appearance: {
          colors: {
            primary: BLUE,
            background: '#ffffff',
            componentBackground: '#f9fafb',
            componentText: '#1a1a1a',
            componentBorder: '#e5e7eb',
            placeholderText: '#9ca3af',
            primaryText: '#1a1a1a',
            secondaryText: '#6b7280',
          },
        },
      });
      if (error) throw new Error(error.message);
      setState('ready');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Could not initialise payment');
      setState('error');
    }
  };

  const handlePay = async () => {
    setState('processing');
    const { error } = await presentPaymentSheet();
    if (error) {
      if (error.code !== 'Canceled') {
        setErrorMessage(error.message);
        setState('error');
      } else {
        setState('ready');
      }
      return;
    }
    clearBasket();
    setState('success');
  };

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} size="large" />
        <Text style={styles.loadingText}>Preparing payment…</Text>
      </View>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>🍦</Text>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSub}>
            See you at {selectedStop?.street_name} around {selectedStop?.eta}.
          </Text>
          <Button label="Track My Order" onPress={() => router.replace('/(customer)/orders')} fullWidth />
          <Button label="Back to Map" onPress={() => router.replace('/(customer)/')} variant="ghost" fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Payment Failed</Text>
          <Text style={styles.errorMsg}>{errorMessage}</Text>
          <Button label="Try Again" onPress={initSheet} fullWidth />
          <Button label="Go Back" onPress={() => router.back()} variant="ghost" fullWidth />
        </View>
      </SafeAreaView>
    );
  }

  const total = basket.reduce((s, b) => s + b.unit_price_gbp * b.quantity, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <View style={styles.orderSummary}>
        <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
        {basket.map((item) => (
          <View key={item.menu_item_id} style={styles.summaryLine}>
            <Text style={styles.summaryItem}>{item.quantity}× {item.name}</Text>
            <Text style={styles.summaryPrice}>£{(item.quantity * item.unit_price_gbp).toFixed(2)}</Text>
          </View>
        ))}
        {selectedStop && (
          <View style={styles.stopInfo}>
            <Text style={styles.stopInfoText}>📍 {selectedStop.street_name} · {selectedStop.eta}</Text>
          </View>
        )}
      </View>

      <View style={styles.paySection}>
        <Button
          label={`Pay £${total.toFixed(2)} with Card`}
          onPress={handlePay}
          isLoading={state === 'processing'}
          fullWidth
        />
        <Text style={styles.secureNote}>🔒 Secure payment powered by Stripe</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: CREAM },
  header: { backgroundColor: BLUE, padding: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  loadingText: { color: '#6b7280', marginTop: 12 },
  orderSummary: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  sectionLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  summaryLine: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { color: '#1a1a1a', fontSize: 14 },
  summaryPrice: { color: '#1a1a1a', fontWeight: '700' },
  stopInfo: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  stopInfoText: { color: BLUE, fontSize: 13, fontWeight: '600' },
  paySection: { padding: 16, gap: 10, marginTop: 'auto' },
  secureNote: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
  successContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  successIcon: { fontSize: 64, marginBottom: 8 },
  successTitle: { color: GREEN, fontSize: 26, fontWeight: '900' },
  successSub: { color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  errorIcon: { fontSize: 48 },
  errorTitle: { color: '#ef4444', fontSize: 20, fontWeight: '700' },
  errorMsg: { color: '#6b7280', textAlign: 'center' },
});
