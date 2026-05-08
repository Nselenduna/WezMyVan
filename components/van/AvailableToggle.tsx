import { useState } from 'react';
import { StyleSheet, View, Text, Switch, Alert } from 'react-native';
import { useVanStore } from '@/store/van.store';
import { GREEN } from '@/constants/Colors';

interface AvailableToggleProps {
  vanId: string;
  isAvailable: boolean;
}

export function AvailableToggle({ vanId, isAvailable }: AvailableToggleProps) {
  const { setAvailability } = useVanStore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (value: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await setAvailability(vanId, value);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update availability';
      if (message.includes('permission') || message.includes('location')) {
        Alert.alert(
          'Location Permission Required',
          'Background location lets customers see your van on the map. Please enable it in Settings.',
          [{ text: 'OK' }],
        );
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={[styles.container, isAvailable ? styles.live : styles.offline]}>
      <View style={styles.textGroup}>
        <Text style={styles.status}>{isAvailable ? '🟢  Available' : '⚫  Offline'}</Text>
        <Text style={styles.hint}>
          {isAvailable ? 'You are LIVE on the map' : 'Toggle to go live'}
        </Text>
      </View>
      <Switch
        value={isAvailable}
        onValueChange={handleToggle}
        disabled={isUpdating}
        trackColor={{ false: '#d1d5db', true: GREEN }}
        thumbColor="#fff"
        ios_backgroundColor="#d1d5db"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1.5,
  },
  live: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  offline: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  textGroup: { flex: 1 },
  status: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
  hint: { color: '#6b7280', fontSize: 13, marginTop: 2 },
});
