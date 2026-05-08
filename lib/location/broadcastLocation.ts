import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateVanLocation } from '@/lib/supabase/queries/vans';
import { LOCATION_TASK_NAME } from '@/constants/config';

// FIX #1: Only write to Supabase when van has moved > 10m (saves battery + DB writes)
const MIN_DISTANCE_METRES = 10;

let _vanId: string | null = null;
let _lastLat: number | null = null;
let _lastLng: number | null = null;

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasMovedEnough(lat: number, lng: number): boolean {
  if (_lastLat === null || _lastLng === null) return true;
  return haversineMetres(_lastLat, _lastLng, lat, lng) > MIN_DISTANCE_METRES;
}

interface LocationTaskData {
  locations: Location.LocationObject[];
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    if (__DEV__) console.warn('Location task error:', error);
    return;
  }

  const { locations } = data as LocationTaskData;
  const latest = locations[0];
  if (!latest) return;

  const { latitude, longitude } = latest.coords;

  // Skip write if van hasn't moved meaningfully — prevents battery drain when stationary
  if (!hasMovedEnough(latitude, longitude)) return;

  if (!_vanId) return;

  try {
    await updateVanLocation(_vanId, latitude, longitude);
    _lastLat = latitude;
    _lastLng = longitude;
  } catch {
    // Non-fatal — next tick will retry
  }
});

export async function startBroadcast(vanId: string): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  // Idempotent — safe to call multiple times
  const isRunning = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRunning) return true;

  _vanId = vanId;
  _lastLat = null;
  _lastLng = null;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10_000,
    distanceInterval: MIN_DISTANCE_METRES, // OS-level filter — task won't even fire if < 10m moved
    foregroundService: {
      notificationTitle: 'Wez Me Van — You are LIVE',
      notificationBody: 'Broadcasting your location to nearby customers.',
      notificationColor: '#4AF0C8',
    },
    pausesUpdatesAutomatically: false,
  });

  return true;
}

export async function stopBroadcast(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) return;

  await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  _vanId = null;
  _lastLat = null;
  _lastLng = null;
}
