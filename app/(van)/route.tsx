import { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVanStore } from '@/store/van.store';
import { reverseGeocode } from '@/lib/location/geocode';
import { BLUE, GREEN, PINK, AMBER } from '@/constants/Colors';
import { DEFAULT_MAP_REGION } from '@/constants/config';

let _uid = 0;
const nextId = () => String(++_uid);

type DraftStop = {
  id: string;
  lat: number;
  lng: number;
  streetName: string;
  postcode: string;
  eta: string;
  geocoding: boolean;
};

const SHEET_H = 500;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// ─── Swipeable stop card ─────────────────────────────────────────────────────

type CardProps = { stop: DraftStop; index: number; onDelete: () => void; onEdit: () => void };

function SwipeableStopCard({ stop, index, onDelete, onEdit }: CardProps) {
  const tx = useRef(new Animated.Value(0)).current;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderMove: (_, gs) => tx.setValue(Math.min(0, gs.dx)),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -70) {
          Animated.timing(tx, { toValue: -400, duration: 200, useNativeDriver: true }).start(onDelete);
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () =>
        Animated.spring(tx, { toValue: 0, useNativeDriver: true }).start(),
    })
  ).current;

  return (
    <View style={sc.wrapper}>
      <View style={sc.deleteBg}>
        <Text style={sc.deleteLabel}>Delete</Text>
      </View>
      <Animated.View style={[sc.card, { transform: [{ translateX: tx }] }]} {...pan.panHandlers}>
        <TouchableOpacity style={sc.inner} onPress={onEdit} activeOpacity={0.85}>
          <View style={[sc.badge, stop.geocoding && sc.badgeSpinning]}>
            {stop.geocoding
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={sc.badgeText}>{index + 1}</Text>
            }
          </View>
          <View style={sc.info}>
            <Text style={sc.street} numberOfLines={1}>{stop.streetName || 'Loading address…'}</Text>
            <Text style={sc.postcode} numberOfLines={1}>{stop.postcode || '—'}</Text>
          </View>
          <View style={sc.etaPill}>
            <Text style={sc.etaText}>{stop.eta}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const sc = StyleSheet.create({
  wrapper: { marginBottom: 8, overflow: 'hidden', borderRadius: 14 },
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ef4444',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
    borderRadius: 14,
  },
  deleteLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14 },
  inner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSpinning: { backgroundColor: AMBER },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  info: { flex: 1, gap: 2 },
  street: { color: '#1a1a1a', fontWeight: '700', fontSize: 14 },
  postcode: { color: '#6b7280', fontSize: 12 },
  etaPill: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  etaText: { color: BLUE, fontWeight: '800', fontSize: 13 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function RoutePlannerScreen() {
  const insets = useSafeAreaInsets();
  const { myVan, todayStops, fetchTodayStops, saveTodayStops, isLoading } = useVanStore();
  const mapRef = useRef<MapView>(null);

  const [stops, setStops] = useState<DraftStop[]>([]);
  const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);
  const initialized = useRef(false);

  // Sheet
  const sheetAnim = useRef(new Animated.Value(SHEET_H)).current;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'new' | 'edit'>('new');
  const [sheetGeocoding, setSheetGeocoding] = useState(false);
  const [sheetStreet, setSheetStreet] = useState('');
  const [sheetPostcode, setSheetPostcode] = useState('');
  const [sheetH, setSheetH] = useState(12);
  const [sheetM, setSheetM] = useState(0);
  const sheetTarget = useRef<{ lat: number; lng: number; editId: string | null } | null>(null);

  // Location permission + center map
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const region = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(region);
      mapRef.current?.animateToRegion(region, 800);
    })();
  }, []);

  // Load existing route on mount
  useEffect(() => {
    if (myVan?.id) fetchTodayStops(myVan.id);
  }, [myVan?.id]);

  useEffect(() => {
    if (!initialized.current && todayStops.length > 0) {
      initialized.current = true;
      setStops(
        todayStops.map(s => ({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          streetName: s.street_name,
          postcode: s.postcode,
          eta: s.eta,
          geocoding: false,
        }))
      );
    }
  }, [todayStops]);

  // Sheet helpers
  const openSheet = useCallback(() => {
    setSheetOpen(true);
    Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }, [sheetAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: SHEET_H, duration: 220, useNativeDriver: true }).start(
      () => setSheetOpen(false),
    );
    sheetTarget.current = null;
  }, [sheetAnim]);

  // Tap map → drop pin
  const handleMapPress = useCallback(
    async (e: MapPressEvent) => {
      if (sheetOpen) { closeSheet(); return; }
      const { latitude, longitude } = e.nativeEvent.coordinate;
      sheetTarget.current = { lat: latitude, lng: longitude, editId: null };
      setSheetMode('new');
      setSheetStreet('');
      setSheetPostcode('');
      setSheetH(12);
      setSheetM(0);
      setSheetGeocoding(true);
      openSheet();
      try {
        const addr = await reverseGeocode(latitude, longitude);
        setSheetStreet(addr.streetName);
        setSheetPostcode(addr.postcode);
      } catch {
        // user can type manually
      } finally {
        setSheetGeocoding(false);
      }
    },
    [sheetOpen, openSheet, closeSheet],
  );

  // Drag marker → re-geocode in place
  const handleMarkerDragEnd = useCallback(
    async (id: string, coord: { latitude: number; longitude: number }) => {
      setStops(prev =>
        prev.map(s => s.id === id ? { ...s, lat: coord.latitude, lng: coord.longitude, geocoding: true } : s)
      );
      try {
        const addr = await reverseGeocode(coord.latitude, coord.longitude);
        setStops(prev =>
          prev.map(s => s.id === id ? { ...s, streetName: addr.streetName, postcode: addr.postcode, geocoding: false } : s)
        );
      } catch {
        setStops(prev => prev.map(s => s.id === id ? { ...s, geocoding: false } : s));
      }
    },
    [],
  );

  // Tap stop card / marker → edit
  const handleEditStop = useCallback(
    (stop: DraftStop) => {
      sheetTarget.current = { lat: stop.lat, lng: stop.lng, editId: stop.id };
      setSheetMode('edit');
      setSheetStreet(stop.streetName);
      setSheetPostcode(stop.postcode);
      const [h, m] = stop.eta.split(':').map(Number);
      setSheetH(isNaN(h) ? 12 : h);
      setSheetM(isNaN(m) ? 0 : m);
      setSheetGeocoding(false);
      openSheet();
    },
    [openSheet],
  );

  // Confirm (add or update)
  const confirmStop = useCallback(() => {
    const target = sheetTarget.current;
    if (!target) return;
    const eta = `${pad(sheetH)}:${pad(sheetM)}`;
    if (target.editId) {
      setStops(prev =>
        prev.map(s =>
          s.id === target.editId
            ? { ...s, lat: target.lat, lng: target.lng, streetName: sheetStreet, postcode: sheetPostcode, eta }
            : s,
        )
      );
    } else {
      setStops(prev => [
        ...prev,
        { id: nextId(), lat: target.lat, lng: target.lng, streetName: sheetStreet, postcode: sheetPostcode, eta, geocoding: false },
      ]);
    }
    closeSheet();
  }, [sheetH, sheetM, sheetStreet, sheetPostcode, closeSheet]);

  const deleteStop = useCallback((id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
  }, []);

  const saveRoute = useCallback(async () => {
    if (!myVan?.id) return;
    if (stops.length === 0) {
      Alert.alert('No Stops', 'Tap the map to drop at least one stop.');
      return;
    }
    const payload = stops.map((s, i) => ({
      van_id: myVan.id,
      stop_order: i + 1,
      street_name: s.streetName,
      postcode: s.postcode,
      lat: s.lat,
      lng: s.lng,
      eta: s.eta,
      route_date: new Date().toISOString().split('T')[0],
    }));
    try {
      await saveTodayStops(myVan.id, payload);
      Alert.alert('Route Saved! 🎉', 'Customers will see your stops on the map.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save route');
    }
  }, [myVan?.id, stops, saveTodayStops]);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <View style={styles.root}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider="google"
        initialRegion={mapRegion}
        onPress={handleMapPress}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            identifier={stop.id}
            coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            draggable
            onPress={() => handleEditStop(stop)}
            onDragEnd={e => handleMarkerDragEnd(stop.id, e.nativeEvent.coordinate)}
          >
            <View style={styles.pin}>
              <Text style={styles.pinNum}>{index + 1}</Text>
            </View>
          </Marker>
        ))}

        {stops.length > 1 && (
          <Polyline
            coordinates={stops.map(s => ({ latitude: s.lat, longitude: s.lng }))}
            strokeColor={BLUE}
            strokeWidth={2.5}
            strokePattern={[10, 6]}
          />
        )}
      </MapView>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>📍 Today's Route</Text>
        <Text style={styles.headerSub}>{today}</Text>
      </View>

      {/* Hint shown until first stop is dropped */}
      {stops.length === 0 && (
        <View style={styles.hintBubble}>
          <Text style={styles.hintText}>Tap map to drop a stop</Text>
        </View>
      )}

      {/* Bottom panel — stop list + save button */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 8 }]}>
        {stops.length > 0 && (
          <FlatList
            data={stops}
            keyExtractor={s => s.id}
            style={styles.stopList}
            scrollEnabled={stops.length > 2}
            renderItem={({ item, index }) => (
              <SwipeableStopCard
                stop={item}
                index={index}
                onDelete={() => deleteStop(item.id)}
                onEdit={() => handleEditStop(item)}
              />
            )}
          />
        )}
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={saveRoute}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>🟢  Save & Go Live!</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Slide-up bottom sheet */}
      {sheetOpen && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }], paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{sheetMode === 'edit' ? 'Edit Stop' : 'New Stop'}</Text>

          {sheetGeocoding && (
            <View style={styles.geocodingRow}>
              <ActivityIndicator color={BLUE} />
              <Text style={styles.geocodingText}>Finding address…</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>STREET</Text>
            <TextInput
              style={styles.fieldInput}
              value={sheetStreet}
              onChangeText={setSheetStreet}
              placeholder="e.g. 12 High Street"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>POSTCODE</Text>
            <TextInput
              style={styles.fieldInput}
              value={sheetPostcode}
              onChangeText={setSheetPostcode}
              placeholder="e.g. BB3 3QD"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ARRIVAL TIME</Text>
            <View style={styles.timePicker}>
              <TouchableOpacity style={styles.timeBtn} onPress={() => setSheetH(h => (h + 23) % 24)}>
                <Text style={styles.timeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeNum}>{pad(sheetH)}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => setSheetH(h => (h + 1) % 24)}>
                <Text style={styles.timeBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.timeSep}>:</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => setSheetM(m => (m + 45) % 60)}>
                <Text style={styles.timeBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.timeNum}>{pad(sheetM)}</Text>
              <TouchableOpacity style={styles.timeBtn} onPress={() => setSheetM(m => (m + 15) % 60)}>
                <Text style={styles.timeBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timeHint}>Minutes adjust in 15-min steps</Text>
          </View>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeSheet}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={confirmStop}>
              <Text style={styles.confirmBtnText}>
                {sheetMode === 'edit' ? '✓ Update' : '+ Add Stop'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30,123,196,0.93)',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  hintBubble: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  hintText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  pinNum: { color: '#fff', fontWeight: '900', fontSize: 14 },

  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
  },
  stopList: { maxHeight: 185, marginBottom: 12 },
  saveBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#1a1a1a', marginBottom: 16 },

  geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  geocodingText: { color: '#6b7280', fontSize: 14 },

  field: { marginBottom: 14 },
  fieldLabel: { color: '#374151', fontWeight: '700', fontSize: 11, letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    height: 46,
    color: '#1a1a1a',
    fontSize: 15,
  },

  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: { color: BLUE, fontWeight: '800', fontSize: 18 },
  timeNum: { fontSize: 22, fontWeight: '900', color: '#1a1a1a', minWidth: 30, textAlign: 'center' },
  timeSep: { fontSize: 22, fontWeight: '900', color: '#6b7280' },
  timeHint: { color: '#9ca3af', fontSize: 11, marginTop: 5 },

  sheetActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 15 },
  confirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
