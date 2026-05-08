import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateVanLocation } from '@/lib/supabase/queries/vans';
import { LOCATION_TASK_NAME } from '@/constants/config';

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// Background task — runs every ~10s while van is_available = true
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    // Log but never crash — driver must stay live
    if (__DEV__) console.warn('Location task error:', error);
    return;
  }

  const { locations } = data as LocationTaskData;
  const latest = locations[0];
  if (!latest) return;

  const vanId = await getStoredVanId();
  if (!vanId) return;

  try {
    await updateVanLocation(vanId, latest.coords.latitude, latest.coords.longitude);
  } catch {
    // Non-fatal — next tick will retry
  }
});

export async function startBroadcast(vanId: string): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== 'granted') return false;

  await storeVanId(vanId);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10_000,
    distanceInterval: 0,
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
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

// Simple in-memory store — van ID is set when broadcast starts.
// In production this could persist to expo-secure-store if the task outlives the JS context.
let _vanId: string | null = null;

async function storeVanId(id: string): Promise<void> {
  _vanId = id;
}

async function getStoredVanId(): Promise<string | null> {
  return _vanId;
}
