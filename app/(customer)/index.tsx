import { useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { VanMarker } from '@/components/map/VanMarker';
import { Button } from '@/components/ui/Button';
import { useVans } from '@/hooks/useVans';
import { useOrderStore } from '@/store/order.store';
import { DEFAULT_MAP_REGION } from '@/constants/config';
import { BLUE, PINK, GREEN, CREAM } from '@/constants/Colors';
import type { Van, RouteStop } from '@/types/database';
import { getTodayRouteStops } from '@/lib/supabase/queries/route-stops';

export default function MapScreen() {
  const router = useRouter();
  const { clearBasket } = useOrderStore();
  const { vans, isLoading } = useVans();
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [showRoute, setShowRoute] = useState(false);

  const handleVanPress = async (van: Van) => {
    setSelectedVan(van);
    setShowRoute(false);
    try {
      const stops = await getTodayRouteStops(van.id);
      setRouteStops(stops);
    } catch {
      setRouteStops([]);
    }
  };

  const handleViewRoute = () => setShowRoute(true);
  const handleDismiss = () => { setSelectedVan(null); setShowRoute(false); };

  const routeCoords = routeStops.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  return (
    <View style={styles.container}>
      {/* Blue top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search your street..."
              placeholderTextColor="#9ca3af"
            />
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <MapView
        style={StyleSheet.absoluteFillObject}
        provider="google"
        initialRegion={DEFAULT_MAP_REGION}
        showsUserLocation
      >
        {vans.map((van) => (
          <VanMarker key={van.id} van={van} onPress={handleVanPress} />
        ))}
        {showRoute && routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor={BLUE} strokeWidth={3} strokePattern={[10, 5]} />
        )}
      </MapView>

      {selectedVan && (
        <SafeAreaView edges={['bottom']} style={styles.sheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={styles.vanIconBox}>
              <Text style={styles.vanIcon}>🚐</Text>
            </View>
            <View style={styles.vanInfo}>
              <Text style={styles.vanName}>{selectedVan.van_name}</Text>
              <Text style={styles.vanSub}>{routeStops.length} stops near you</Text>
            </View>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>

          {routeStops.length > 0 && (
            <View style={styles.stopChips}>
              {routeStops.slice(0, 3).map((stop, i) => (
                <View key={stop.id} style={[styles.stopChip, i === 0 && styles.stopChipFirst]}>
                  <Text style={[styles.stopChipStreet, i === 0 && styles.stopChipStreetFirst]}>
                    {stop.street_name.toUpperCase()}
                  </Text>
                  <Text style={[styles.stopChipEta, i === 0 && styles.stopChipEtaFirst]}>
                    {stop.eta}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Button
            label="🍦   View Menu & Pre-Order"
            onPress={() => {
              clearBasket();
              router.push({
                pathname: '/(customer)/menu/[vanId]',
                params: { vanId: selectedVan.id, vanName: selectedVan.van_name },
              });
            }}
            fullWidth
          />

          <TouchableOpacity onPress={handleDismiss} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  topBar: { backgroundColor: BLUE, zIndex: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: '#1a1a1a', fontSize: 15 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: { fontSize: 20 },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vanIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f0f5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vanIcon: { fontSize: 26 },
  vanInfo: { flex: 1 },
  vanName: { color: '#1a1a1a', fontSize: 18, fontWeight: '800' },
  vanSub: { color: '#6b7280', fontSize: 13 },
  liveBadge: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  stopChips: { flexDirection: 'row', gap: 8 },
  stopChip: {
    flex: 1,
    backgroundColor: '#e0eeff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  stopChipFirst: { backgroundColor: PINK },
  stopChipStreet: { color: BLUE, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  stopChipStreetFirst: { color: '#fff' },
  stopChipEta: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
  stopChipEtaFirst: { color: 'rgba(255,255,255,0.85)' },
  dismissBtn: { alignItems: 'center', paddingVertical: 4 },
  dismissText: { color: '#9ca3af', fontSize: 14 },
});
