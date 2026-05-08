import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
}

export function useLocation(): LocationState {
  const [state, setState] = useState<LocationState>({ lat: null, lng: null, error: null });

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mounted) setState((s) => ({ ...s, error: 'Location permission denied' }));
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) {
          setState({ lat: location.coords.latitude, lng: location.coords.longitude, error: null });
        }
      } catch {
        if (mounted) setState((s) => ({ ...s, error: 'Failed to get location' }));
      }
    })();

    return () => { mounted = false; };
  }, []);

  return state;
}
