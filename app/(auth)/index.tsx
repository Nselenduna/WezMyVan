import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { SKY } from '@/constants/Colors';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.sub}>Never miss the van again 🔔</Text>
        </View>

        <View style={styles.buttons}>
          <Button
            label="🍦   Find a Van Near Me"
            onPress={() => router.push('/(auth)/login')}
            fullWidth
          />
          <Button
            label="🚐   I Have a Van – Register"
            onPress={() => router.push('/(auth)/register')}
            variant="secondary"
            fullWidth
          />
          <TouchableOpacity style={styles.ghostBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.ghostText}>Already got an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SKY },
  inner: { flex: 1, paddingHorizontal: 28 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  logo: { width: 300, height: 300 },
  sub: { color: '#374151', fontSize: 16, fontWeight: '500' },
  buttons: { gap: 12, paddingBottom: 28 },
  ghostBtn: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  ghostText: { color: '#1E7BC4', fontWeight: '700', fontSize: 15 },
});
