import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { createVanOperator } from '@/lib/supabase/queries/van-operators';
import { createVan } from '@/lib/supabase/queries/vans';
import { startStripeConnectOnboarding } from '@/lib/stripe/connectOnboarding';
import { Button } from '@/components/ui/Button';
import { BLUE, GREEN, AMBER, CREAM } from '@/constants/Colors';

type Step = 'business' | 'van' | 'stripe';

export default function VanOnboardingScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [step, setStep] = useState<Step>('business');
  const [businessName, setBusinessName] = useState('');
  const [vanName, setVanName] = useState('');
  const [registration, setRegistration] = useState('');
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleBusinessNext = async () => {
    if (!businessName.trim()) return Alert.alert('Required', 'Enter your business name');
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const operator = await createVanOperator(profile.id, businessName.trim());
      setOperatorId(operator.id);
      setStep('van');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save business details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVanNext = async () => {
    if (!vanName.trim()) return Alert.alert('Required', 'Enter your van name');
    if (!operatorId) return;
    setIsLoading(true);
    try {
      await createVan(operatorId, vanName.trim(), registration.trim() || undefined);
      setStep('stripe');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not save van details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setIsLoading(true);
    try {
      await startStripeConnectOnboarding();
      router.replace('/(van)/' as any);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not open Stripe onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Blue header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>
            {step === 'stripe' ? '💳' : step === 'van' ? '🚐' : '🏢'}
          </Text>
          <Text style={styles.headerTitle}>
            {step === 'business' ? 'Your Business' : step === 'van' ? 'Your Van' : 'Set Up Payments'}
          </Text>
          <Text style={styles.headerSub}>
            {step === 'business'
              ? "Tell us about your ice cream business"
              : step === 'van'
                ? 'Tell customers who\'s coming'
                : 'Connect your bank to receive order payments'}
          </Text>
        </View>

        {/* Step dots */}
        <View style={styles.stepRow}>
          {(['business', 'van', 'stripe'] as Step[]).map((s) => (
            <View key={s} style={[styles.stepDot, step === s && styles.stepDotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {step === 'business' && (
            <View style={styles.section}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>BUSINESS NAME</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>🏢</Text>
                  <TextInput
                    style={styles.input}
                    value={businessName}
                    onChangeText={setBusinessName}
                    placeholder="e.g. Dave's Ice Cream Co."
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <Button label="Next →" onPress={handleBusinessNext} isLoading={isLoading} fullWidth />
            </View>
          )}

          {step === 'van' && (
            <View style={styles.section}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>VAN NAME</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>🚐</Text>
                  <TextInput
                    style={styles.input}
                    value={vanName}
                    onChangeText={setVanName}
                    placeholder="e.g. Benny's Ice Cream"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>REGISTRATION (OPTIONAL)</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.inputIcon}>🔢</Text>
                  <TextInput
                    style={styles.input}
                    value={registration}
                    onChangeText={setRegistration}
                    placeholder="e.g. WEZ1ICV"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="characters"
                  />
                </View>
              </View>
              <Button label="Next →" onPress={handleVanNext} isLoading={isLoading} fullWidth />
            </View>
          )}

          {step === 'stripe' && (
            <View style={styles.section}>
              <View style={styles.howItWorks}>
                <Text style={styles.howTitle}>💰 How it works</Text>
                {[
                  '1. Customers pay via the app',
                  '2. We collect on your behalf',
                  '3. We deduct our 12% commission',
                  '4. You receive the rest automatically',
                ].map((line) => (
                  <Text key={line} style={styles.howLine}>{line}</Text>
                ))}
              </View>

              <View style={styles.exampleCard}>
                <Text style={styles.exampleTitle}>YOUR EARNINGS EXAMPLE</Text>
                <View style={styles.exampleRow}>
                  <Text style={styles.exampleLabel}>Order total</Text>
                  <Text style={styles.exampleValue}>£10.00</Text>
                </View>
                <View style={styles.exampleRow}>
                  <Text style={styles.exampleLabel}>Platform (12%)</Text>
                  <Text style={[styles.exampleValue, { color: '#ef4444' }]}>-£1.20</Text>
                </View>
                <View style={[styles.exampleRow, styles.exampleYouReceive]}>
                  <Text style={styles.exampleReceiveLabel}>YOU RECEIVE</Text>
                  <Text style={styles.exampleReceiveValue}>£8.80</Text>
                </View>
              </View>

              <Text style={styles.stripeTrust}>
                POWERED BY STRIPE — TRUSTED BY MILLIONS{'\n'}
                You'll be redirected to Stripe to securely connect your bank account. Wez Me Van!! never stores your bank details.
              </Text>

              <Button
                label="Connect My Bank with Stripe →"
                onPress={handleStripeConnect}
                isLoading={isLoading}
                fullWidth
              />
              <Button
                label="Skip for now"
                onPress={() => router.replace('/(van)/' as any)}
                variant="ghost"
                fullWidth
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: BLUE, padding: 20, alignItems: 'center', gap: 4, paddingTop: 24 },
  headerIcon: { fontSize: 36 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, textAlign: 'center' },
  stepRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: BLUE, width: 24, borderRadius: 4 },
  body: { padding: 20, gap: 20 },
  section: { gap: 14 },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    minHeight: 52,
    gap: 10,
  },
  inputIcon: { fontSize: 18 },
  input: { flex: 1, color: '#1a1a1a', fontSize: 16 },
  howItWorks: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  howTitle: { color: '#1a1a1a', fontWeight: '800', fontSize: 15, marginBottom: 4 },
  howLine: { color: '#374151', fontSize: 14, lineHeight: 22 },
  exampleCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  exampleTitle: { color: '#6b7280', fontWeight: '700', fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  exampleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  exampleLabel: { color: '#374151', fontSize: 14 },
  exampleValue: { color: '#374151', fontWeight: '700', fontSize: 14 },
  exampleYouReceive: { borderTopWidth: 1, borderTopColor: '#bfdbfe', paddingTop: 8, marginTop: 4 },
  exampleReceiveLabel: { color: '#1a1a1a', fontWeight: '800', fontSize: 15 },
  exampleReceiveValue: { color: GREEN, fontWeight: '900', fontSize: 18 },
  stripeTrust: { color: '#9ca3af', fontSize: 11, textAlign: 'center', lineHeight: 18 },
});
