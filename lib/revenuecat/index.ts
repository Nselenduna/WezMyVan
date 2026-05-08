import { useEffect, useState } from 'react';
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import { RC_ENTITLEMENT_VAN_PRO, RC_PRODUCT_VAN_PRO_MONTHLY } from '@/constants/config';

export function initRevenueCat(userId: string): void {
  const apiKey =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;

  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey, appUserID: userId });
}

export interface EntitlementsState {
  isVanPro: boolean;
  isLoading: boolean;
}

export function useEntitlements(): EntitlementsState {
  const [state, setState] = useState<EntitlementsState>({ isVanPro: false, isLoading: true });

  useEffect(() => {
    let mounted = true;

    Purchases.getCustomerInfo()
      .then((info) => {
        if (!mounted) return;
        setState({
          isVanPro: RC_ENTITLEMENT_VAN_PRO in info.entitlements.active,
          isLoading: false,
        });
      })
      .catch(() => {
        if (mounted) setState({ isVanPro: false, isLoading: false });
      });

    return () => { mounted = false; };
  }, []);

  return state;
}

export async function purchaseVanPro(): Promise<boolean> {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg: PurchasesPackage | undefined = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === RC_PRODUCT_VAN_PRO_MONTHLY,
    );

    if (!pkg) throw new Error('Van Pro package not found');

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return RC_ENTITLEMENT_VAN_PRO in customerInfo.entitlements.active;
  } catch {
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    return RC_ENTITLEMENT_VAN_PRO in info.entitlements.active;
  } catch {
    return false;
  }
}
