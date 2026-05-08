import { StripeProvider } from '@stripe/stripe-react-native';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { BLUE } from '@/constants/Colors';

const STRIPE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function CustomerLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_KEY} merchantIdentifier="merchant.co.uk.wezmevan">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#f3f4f6',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: BLUE,
          tabBarInactiveTintColor: '#9ca3af',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Map',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🗺️</Text>,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📋</Text>,
          }}
        />
        <Tabs.Screen
          name="alerts"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🔔</Text>,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👤</Text>,
          }}
        />
        {/* Order flow — hidden from tab bar */}
        <Tabs.Screen name="menu/[vanId]" options={{ href: null }} />
        <Tabs.Screen name="basket" options={{ href: null }} />
        <Tabs.Screen name="checkout" options={{ href: null }} />
      </Tabs>
    </StripeProvider>
  );
}
