import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { BLUE, CREAM } from '@/constants/Colors';

export default function CustomerProfileScreen() {
  const { profile, signOut } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>👤 Profile</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>🧍 Customer</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button label="Sign Out" onPress={signOut} variant="ghost" fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  heading: { color: '#1a1a1a', fontSize: 22, fontWeight: '800' },
  body: { flex: 1, padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '900' },
  name: { color: '#1a1a1a', fontSize: 20, fontWeight: '800' },
  roleBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: { color: BLUE, fontWeight: '700', fontSize: 13 },
  footer: { marginTop: 'auto' },
});
