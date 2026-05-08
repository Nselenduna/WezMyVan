import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { BLUE, PINK, SKY } from '@/constants/Colors';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof schema>;

function friendlyError(raw: string): string {
  if (raw.includes('Invalid login credentials')) return 'Email or password is incorrect. Please try again.';
  if (raw.includes('Email not confirmed')) return 'Your email is not verified. Check your inbox for a confirmation link from Supabase and tap it before signing in.';
  if (raw.includes('User not found')) return 'No account found with that email address.';
  if (raw.includes('Network request failed') || raw.includes('Failed to fetch')) return 'Connection failed. Check your internet connection and try again.';
  if (raw.includes('Too many requests')) return 'Too many attempts. Please wait a few minutes and try again.';
  return raw || 'Sign in failed. Please try again.';
}

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading, error, clearError } = useAuthStore();
  const [role, setRole] = useState<'customer' | 'van_operator'>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const submitting = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (error) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [error]);

  const onSubmit = async (values: FormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    clearError();
    try {
      await signIn(values.email, values.password);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      Alert.alert('Sign In Failed', friendlyError(raw), [{ text: 'OK' }]);
    } finally {
      submitting.current = false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bg}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.emoji}>🍦</Text>
          <Text style={styles.title}>
            <Text style={styles.titleBlue}>Wez Me </Text>
            <Text style={styles.titlePink}>Van!!</Text>
          </Text>
          <Text style={styles.sub}>Sign in to continue</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.roleHeading}>I am a...</Text>
          <View style={styles.roleRow}>
            {(['customer', 'van_operator'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleCard, role === r && styles.roleCardActive]}
                onPress={() => setRole(r)}
              >
                <Text style={styles.roleEmoji}>{r === 'customer' ? '🧍' : '🚐'}</Text>
                <Text style={[styles.roleLabel, role === r && styles.roleLabelActive]}>
                  {r === 'customer' ? 'Customer' : 'Van Operator'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputRow, errors.email && styles.inputRowError]}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      placeholder="sarah@example.com"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              />
              {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputRow, errors.password && styles.inputRowError]}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                      placeholder="••••••••"
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                      <Text style={styles.eyeToggle}>{showPassword ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password ? <Text style={styles.fieldError}>{errors.password.message}</Text> : null}
            </View>
          </View>

          <Button label="Sign In 🍦" onPress={handleSubmit(onSubmit)} isLoading={isLoading} fullWidth />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialText}>🍎  Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialBtn, styles.socialGoogle]}>
              <Text style={styles.socialText}>G  Google</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerHighlight}>Register free</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: SKY },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 44 },
  emoji: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  title: { textAlign: 'center', marginBottom: 4 },
  titleBlue: { color: BLUE, fontSize: 30, fontWeight: '900' },
  titlePink: { color: PINK, fontSize: 30, fontWeight: '900' },
  sub: { color: '#6b7280', textAlign: 'center', marginBottom: 24, fontSize: 15 },
  errorBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#ef4444', textAlign: 'center', fontSize: 14 },
  roleHeading: { color: '#374151', fontWeight: '600', marginBottom: 10, fontSize: 14 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  roleCardActive: { borderColor: BLUE },
  roleEmoji: { fontSize: 28, marginBottom: 4 },
  roleLabel: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  roleLabelActive: { color: BLUE },
  form: { gap: 14, marginBottom: 20 },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotLink: { color: BLUE, fontSize: 12, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputRowError: { borderColor: '#ef4444' },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: '#1a1a1a', fontSize: 16 },
  eyeToggle: { fontSize: 18, paddingLeft: 8 },
  fieldError: { color: '#ef4444', fontSize: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#d1d5db' },
  dividerText: { color: '#9ca3af', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  socialBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  socialGoogle: { backgroundColor: '#fff0f7', borderColor: '#fbb6ce' },
  socialText: { color: '#374151', fontWeight: '600', fontSize: 14 },
  registerLink: { alignItems: 'center', paddingBottom: 16 },
  registerText: { color: '#6b7280', fontSize: 14 },
  registerHighlight: { color: BLUE, fontWeight: '700' },
});
