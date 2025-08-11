import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, InputField } from '../components';
import { useApp } from '../context/AppContext';

export default function LoginScreen() {
  const { actions, state } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const success = await actions.login(email.trim(), password);
    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Forgot Password', 'Enter your email to receive a reset link.');
      return;
    }
    const sent = await actions.resetPassword(email.trim());
    if (sent) {
      Alert.alert('Email sent', 'Check your inbox for a reset link.');
    } else {
      Alert.alert('Error', 'Could not send reset email.');
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
            <Text style={styles.title}>FieldBook</Text>
            <Text style={styles.subtitle}>Construction Workforce Management</Text>
          </View>

          <View style={styles.form}>
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
              placeholder="Enter your password"
              secureTextEntry
              required
            />

            <Button
              title={state.isLoading ? "Signing In..." : "Sign In"}
              onPress={handleLogin}
              disabled={state.isLoading}
              style={styles.loginButton}
            />

            <View style={styles.footerLinks}>
              <TouchableOpacity onPress={() => router.push('./register')}>
                <Text style={styles.linkText}>Create account</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.linkText}>Forgot password?</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButton: {
    marginTop: 24,
  },
  footerLinks: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
