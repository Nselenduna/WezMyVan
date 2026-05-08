import { StyleSheet, View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { BLUE } from '@/constants/Colors';
import type { Van } from '@/types/database';

interface VanMarkerProps {
  van: Van;
  onPress: (van: Van) => void;
}

export function VanMarker({ van, onPress }: VanMarkerProps) {
  if (van.current_lat == null || van.current_lng == null) return null;

  return (
    <Marker
      coordinate={{ latitude: van.current_lat, longitude: van.current_lng }}
      onPress={() => onPress(van)}
      tracksViewChanges={false}
    >
      <View style={styles.container}>
        <View style={styles.bubble}>
          <Text style={styles.icon}>🚐</Text>
        </View>
        <View style={styles.label}>
          <Text style={styles.labelText} numberOfLines={1}>{van.van_name}</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: { fontSize: 22 },
  label: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  labelText: { color: '#1a1a1a', fontSize: 11, fontWeight: '700', maxWidth: 90 },
});
