import { StyleSheet, View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BLUE, CREAM } from '@/constants/Colors';

export default function MapScreenWeb() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Live Van Map</Text>
        <Text style={styles.sub}>
          The live map requires the Wez Me Van mobile app.{'\n'}
          Download it on the App Store or Google Play.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>📱 Mobile Only Feature</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  logo: { width: 200, height: 150, marginBottom: 8 },
  title: { color: '#1a1a1a', fontSize: 22, fontWeight: '700' },
  sub: { color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  badge: {
    marginTop: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: BLUE,
  },
  badgeText: { color: BLUE, fontWeight: '600' },
});
