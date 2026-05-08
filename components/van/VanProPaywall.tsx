import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { purchaseVanPro, restorePurchases } from '@/lib/revenuecat';
import { Button } from '@/components/ui/Button';
import { BLUE, AMBER } from '@/constants/Colors';

interface VanProPaywallProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FEATURES = [
  { icon: '📊', title: 'Sales Analytics Dashboard', desc: 'See best streets, peak hours, top sellers' },
  { icon: '📍', title: 'Priority Map Placement', desc: 'Your van listed first in your area' },
  { icon: '🎵', title: 'Custom Jingle Upload', desc: 'Play your own tune in the app' },
  { icon: '📦', title: 'Minimum Order Setting', desc: 'Set your own minimum basket size' },
  { icon: '🚐', title: 'Multiple Van Management', desc: 'Run a fleet, manage all vans' },
];

export function VanProPaywall({ visible, onClose, onSuccess }: VanProPaywallProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const success = await purchaseVanPro();
      if (success) {
        onSuccess();
      } else {
        Alert.alert('Purchase cancelled', 'No charge was made.');
      }
    } catch {
      Alert.alert('Error', 'Could not complete purchase. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Restored!', 'Your Van Pro subscription has been restored.');
        onSuccess();
      } else {
        Alert.alert('Nothing to restore', 'No active Van Pro subscription found.');
      }
    } catch {
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.crown}>👑</Text>
            <Text style={styles.title}>Van Pro</Text>
            <Text style={styles.subtitle}>Supercharge your ice cream business</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <View key={f.title} style={styles.featureRow}>
                  <View style={styles.featureIconBox}>
                    <Text style={styles.featureIcon}>{f.icon}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                  <Text style={styles.crownSmall}>👑</Text>
                </View>
              ))}
            </View>

            <View style={styles.priceCard}>
              <Text style={styles.price}>£9.99</Text>
              <Text style={styles.priceSub}>per month · Cancel anytime · Via App Store</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator color={AMBER} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <Button label="👑  Subscribe via App Store" onPress={handleSubscribe} variant="amber" fullWidth />
                <TouchableOpacity onPress={handleRestore} style={styles.restoreBtn}>
                  <Text style={styles.restoreText}>Restore existing purchase</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.legal}>
              Subscription auto-renews. Manage or cancel in your device Settings.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  closeBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 8 },
  closeText: { color: '#9ca3af', fontSize: 18, fontWeight: '700' },
  header: {
    backgroundColor: AMBER,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 6,
  },
  crown: { fontSize: 48 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
  body: { padding: 20, gap: 16 },
  featureList: { gap: 0 },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: { fontSize: 22 },
  featureText: { flex: 1 },
  featureTitle: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  featureDesc: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  crownSmall: { fontSize: 16 },
  priceCard: {
    backgroundColor: BLUE,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  price: { color: '#fff', fontSize: 36, fontWeight: '900' },
  priceSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { color: '#6b7280', fontSize: 13 },
  legal: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingBottom: 24,
  },
});
