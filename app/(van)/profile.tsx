import { useState } from 'react';
import { StyleSheet, View, Text, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { useEntitlements } from '@/lib/revenuecat';
import { startStripeConnectOnboarding } from '@/lib/stripe/connectOnboarding';
import { VanProPaywall } from '@/components/van/VanProPaywall';
import { Button } from '@/components/ui/Button';
import { BLUE, AMBER, GREEN, CREAM } from '@/constants/Colors';

export default function VanProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const { isVanPro, isLoading } = useEntitlements();
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      await startStripeConnectOnboarding();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open Stripe onboarding');
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Blue header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '🚐'}
          </Text>
        </View>
        <Text style={styles.headerName}>{profile?.full_name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>🚐 Van Operator</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Plan badge */}
        {!isLoading && (
          <View style={[styles.planCard, isVanPro ? styles.planCardPro : styles.planCardFree]}>
            <Text style={styles.planLabel}>{isVanPro ? '⭐ Van Pro' : '🆓 Free Plan'}</Text>
            {isVanPro && (
              <Text style={styles.planSub}>All pro features unlocked</Text>
            )}
          </View>
        )}

        {/* Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENTS</Text>
          <Button
            label="Manage Stripe Payout Account"
            onPress={handleStripeConnect}
            isLoading={stripeLoading}
            variant="ghost"
            fullWidth
          />
        </View>

        {/* Van Pro features or upgrade */}
        {isVanPro ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VAN PRO FEATURES</Text>
            <View style={styles.featureList}>
              {[
                { icon: '📊', label: 'Analytics Dashboard', coming: true },
                { icon: '📍', label: 'Priority Map Placement', coming: false },
                { icon: '🎵', label: 'Custom Jingle Upload', coming: true },
                { icon: '💰', label: 'Minimum Order Setting', coming: false },
                { icon: '🚐', label: 'Multiple Van Management', coming: true },
              ].map((f, idx, arr) => (
                <View
                  key={f.label}
                  style={[styles.featureRow, idx < arr.length - 1 && styles.featureRowBorder]}
                >
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  {f.coming && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Soon</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ) : (
          !isLoading && (
            <View style={styles.upgradeCard}>
              <Text style={styles.upgradeTitle}>🚀 Upgrade to Van Pro</Text>
              <Text style={styles.upgradeDesc}>
                Analytics, priority placement, custom jingle — £9.99/month
              </Text>
              <Button
                label="See Van Pro Features"
                onPress={() => setPaywallVisible(true)}
                variant="amber"
                fullWidth
              />
            </View>
          )
        )}

        <View style={styles.footer}>
          <Button label="Sign Out" onPress={signOut} variant="ghost" fullWidth />
        </View>
      </ScrollView>

      <VanProPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onSuccess={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: {
    backgroundColor: BLUE,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  headerName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  body: { padding: 20, gap: 16 },
  planCard: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 2,
  },
  planCardPro: { backgroundColor: '#fffbeb', borderColor: AMBER },
  planCardFree: { backgroundColor: '#fff', borderColor: '#e5e7eb' },
  planLabel: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
  planSub: { color: '#6b7280', fontSize: 13 },
  section: { gap: 10 },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  featureList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  featureIcon: { fontSize: 20 },
  featureLabel: { color: '#1a1a1a', flex: 1, fontSize: 14, fontWeight: '500' },
  comingSoonBadge: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: AMBER + '50',
  },
  comingSoonText: { color: AMBER, fontSize: 10, fontWeight: '700' },
  upgradeCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: AMBER,
  },
  upgradeTitle: { color: '#1a1a1a', fontWeight: '800', fontSize: 16 },
  upgradeDesc: { color: '#6b7280', fontSize: 13, lineHeight: 20 },
  footer: { marginTop: 8 },
});
