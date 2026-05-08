import { StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BLUE, PINK, AMBER } from '@/constants/Colors';

type Variant = 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {isLoading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: { backgroundColor: BLUE },
  secondary: { backgroundColor: PINK },
  amber: { backgroundColor: AMBER },
  danger: { backgroundColor: '#ef4444' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: BLUE },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: '700' },
  primaryLabel: { color: '#fff' },
  secondaryLabel: { color: '#fff' },
  amberLabel: { color: '#fff' },
  dangerLabel: { color: '#fff' },
  ghostLabel: { color: BLUE },
});
