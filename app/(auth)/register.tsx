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
import type { UserRole } from '@/types/database';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['customer', 'van_operator'] as const),
});

type FormValues = z.infer<typeof schema>;

function friendlyError(raw: string): string {
  if (raw.includes('User already registered') || raw.includes('already been registered')) return 'An account already exists with this email. Try signing in instead.';
  if (raw.includes('Password should be')) return 'Password must be at least 8 characters.';
  if (raw.includes('Network request failed') || raw.includes('Failed to fetch')) return 'Connection failed. Check your internet connection and try again.';
  if (raw.includes('Too many requests')) return 'Too many attempts. Please wait a few minutes and try again.';
  return raw || 'Registration failed. Please try again.';
}

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isLoading, error, clearError } = useAuthStore();
  const scrollRef = useRef<ScrollView>(null);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'customer' },
  });

  const selectedRole = watch('role');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (error) scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [error]);

   const onSubmit = async (values: FormValues) => {
    clearError();
    try {
      await signUp(values.email, values.password, values.role, values.fullName);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      if (raw.startsWith('EMAIL_CONFIRM:')) {
        Alert.alert('🎉 Almost there!', raw.replace('EMAIL_CONFIRM:', ''), [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Registration Failed', friendlyError(raw), [{ text: 'OK' }]);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.bg}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>🍦</Text>
          <Text style={styles.title}>
            <Text style={styles.titleBlue}>Create </Text>
            <Text style={styles.titlePink}>Account</Text>
          </Text>
          <Text style={styles.sub}>Join Lancashire's ice cream community</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>I AM A...</Text>
              <View style={styles.roleRow}>
                {(['customer', 'van_operator'] as UserRole[]).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleCard, selectedRole === role && styles.roleCardActive]}
                    onPress={() => setValue('role', role)}
                  >
                    <Text style={styles.roleEmoji}>{role === 'customer' ? '🧍' : '🚐'}</Text>
                    <Text style={[styles.roleLabel, selectedRole === role && styles.roleLabelActive]}>
                      {role === 'customer' ? 'Customer' : 'Van Operator'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, value } }) => (
                  <View style={[styles.inputRow, errors.fullName && styles.inputRowError]}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      style={styles.input}
                      value={value}
                      onChangeText={onChange}
                      autoComplete="name"
                      placeholder="Jane Smith"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              />
              {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName.message}</Text> : null}
            </View>

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
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      placeholder="you@example.com"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                )}
              />
              {errors.email ? <Text style={styles.fieldError}>{errors.email.message}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
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
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
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

          <Button
            label="Create Account 🍦"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            fullWidth
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginHighlight}>Sign in</Text>
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
  backBtn: { marginBottom: 16 },
  backText: { color: BLUE, fontWeight: '600', fontSize: 15 },
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
  form: { gap: 14, marginBottom: 20 },
  field: { gap: 6 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 11, letterSpacing: 0.8 },
  roleRow: { flexDirection: 'row', gap: 12 },
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
  loginLink: { alignItems: 'center', marginTop: 20, paddingBottom: 16 },
  loginText: { color: '#6b7280', fontSize: 14 },
  loginHighlight: { color: BLUE, fontWeight: '700' },
});
