export const PLATFORM_COMMISSION = 0.12;

export const GPS_BROADCAST_INTERVAL_MS = 10_000; // 10 seconds
export const PROXIMITY_ALERT_METRES = 800;
export const ORDER_REJECTION_WINDOW_MS = 3 * 60 * 1_000; // 3 minutes

export const LOCATION_TASK_NAME = 'wez-me-van-location-broadcast';

// RevenueCat
export const RC_ENTITLEMENT_VAN_PRO = 'van_pro';
export const RC_PRODUCT_VAN_PRO_MONTHLY = 'van_pro_monthly';

// Supabase Realtime channel names
export const REALTIME_VANS_CHANNEL = 'vans';
export const REALTIME_ORDERS_CHANNEL = 'orders';

// Map defaults (Lancashire, England)
export const DEFAULT_MAP_REGION = {
  latitude: 53.7632,
  longitude: -2.7044,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};
