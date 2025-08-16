import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, InputField } from '../components';
import { useApp } from '../context/AppContext';

export default function RegisterScreen() {
  const { actions, state } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    const ok = await actions.register(email.trim(), password, name.trim() || undefined);
    if (ok) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Registration Failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Sign up with your email</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Name (optional)"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              required
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a password"
              secureTextEntry
              required
            />
            <InputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              required
            />

            <Button
              title={state.isLoading ? "Creating..." : "Create account"}
              onPress={handleRegister}
              disabled={state.isLoading || !email.trim() || !password.trim() || !confirmPassword.trim()}
              style={styles.registerButton}
            />

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.replace('/login')}>
                <Text style={styles.linkText}>Have an account? Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 24 },
  header: { alignItems: 'center', marginBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },
  form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  registerButton: { marginTop: 24 },
  footerLinks: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#007AFF', fontSize: 14 },
});
