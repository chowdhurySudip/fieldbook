import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function DeprecatedFirebaseTestScreen() {
  useEffect(() => {
    // Immediately navigate back if this screen is accidentally opened
    const t = setTimeout(() => {
      try { router.back(); } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This screen has been removed.</Text>
      <Text style={styles.subtitle}>Firebase test utilities are no longer part of the app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { marginTop: 8, color: '#666' },
});
