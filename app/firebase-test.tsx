import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components';
import { firebaseConnectionTester } from '../services/firebaseTest';

export default function FirebaseTestScreen() {
  const [testResults, setTestResults] = useState<{
    firestore: { success: boolean; message: string } | null;
    auth: { success: boolean; message: string } | null;
    overall: boolean | null;
  }>({
    firestore: null,
    auth: null,
    overall: null,
  });
  const [isTestingFirestore, setIsTestingFirestore] = useState(false);
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [isTestingAll, setIsTestingAll] = useState(false);

  const handleFirestoreTest = async () => {
    setIsTestingFirestore(true);
    try {
      const result = await firebaseConnectionTester.testFirestore();
      setTestResults(prev => ({ ...prev, firestore: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        firestore: {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }));
    } finally {
      setIsTestingFirestore(false);
    }
  };

  const handleAuthTest = async () => {
    setIsTestingAuth(true);
    try {
      const result = await firebaseConnectionTester.testAuth();
      setTestResults(prev => ({ ...prev, auth: result }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        auth: {
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }));
    } finally {
      setIsTestingAuth(false);
    }
  };

  const handleFullTest = async () => {
    setIsTestingAll(true);
    try {
      const result = await firebaseConnectionTester.runFullConnectionTest();
      setTestResults({
        firestore: result.firestore,
        auth: result.auth,
        overall: result.overall,
      });
    } catch (error) {
      Alert.alert(
        'Firebase Test Error',
        `Failed to run Firebase test: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsTestingAll(false);
    }
  };

  const getStatusIcon = (success: boolean | null) => {
    if (success === null) return { name: 'help-outline' as const, color: '#8E8E93' };
    return success 
      ? { name: 'checkmark-circle' as const, color: '#34C759' }
      : { name: 'close-circle' as const, color: '#FF3B30' };
  };

  const clearResults = () => {
    setTestResults({
      firestore: null,
      auth: null,
      overall: null,
    });
  };

  const showAuthSetupInstructions = () => {
    Alert.alert(
      '🔧 Auth Setup Required',
      'Anonymous Authentication is not enabled in Firebase Console.\n\n' +
      '✅ Quick Fix:\n' +
      '1. Go to console.firebase.google.com\n' +
      '2. Select project: fieldbook-sudip\n' +
      '3. Go to Authentication > Sign-in method\n' +
      '4. Enable "Anonymous" provider\n' +
      '5. Save and test again\n\n' +
      'This should take less than 2 minutes!',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Firebase Connection Test</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card title="Connection Status">
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Firestore Database</Text>
                  <Text style={styles.statusMessage}>
                    {testResults.firestore?.message || 'Not tested yet'}
                  </Text>
                </View>
                <Ionicons 
                  {...getStatusIcon(testResults.firestore?.success || null)} 
                  size={24} 
                />
              </View>

              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Authentication</Text>
                  <Text style={styles.statusMessage}>
                    {testResults.auth?.message || 'Not tested yet'}
                  </Text>
                </View>
                <Ionicons 
                  {...getStatusIcon(testResults.auth?.success || null)} 
                  size={24} 
                />
              </View>

              {/* Auth Setup Help Button */}
              {testResults.auth && !testResults.auth.success && testResults.auth.message.includes('admin-restricted-operation') && (
                <TouchableOpacity style={styles.setupButton} onPress={showAuthSetupInstructions}>
                  <Ionicons name="settings-outline" size={20} color="#007AFF" />
                  <Text style={styles.setupButtonText}>Show Setup Instructions</Text>
                </TouchableOpacity>
              )}

              {testResults.overall !== null && (
                <View style={[styles.overallStatus, { 
                  backgroundColor: testResults.overall ? '#E8F8F1' : '#FFEAEA' 
                }]}>
                  <Ionicons 
                    name={testResults.overall ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={testResults.overall ? '#34C759' : '#FF3B30'} 
                  />
                  <Text style={[styles.overallText, { 
                    color: testResults.overall ? '#1F8B4C' : '#D93025' 
                  }]}>
                    {testResults.overall ? 'All systems operational!' : 'Issues detected'}
                  </Text>
                </View>
              )}
            </View>
          </Card>

          <Card title="Test Actions">
            <View style={styles.actionContainer}>
              <Button
                title={isTestingFirestore ? "Testing Firestore..." : "Test Firestore"}
                onPress={handleFirestoreTest}
                variant="secondary"
                disabled={isTestingFirestore || isTestingAll}
                style={styles.actionButton}
              />

              <Button
                title={isTestingAuth ? "Testing Auth..." : "Test Authentication"}
                onPress={handleAuthTest}
                variant="secondary"
                disabled={isTestingAuth || isTestingAll}
                style={styles.actionButton}
              />

              <Button
                title={isTestingAll ? "Running Full Test..." : "Run Full Test"}
                onPress={handleFullTest}
                variant="primary"
                disabled={isTestingAll || isTestingFirestore || isTestingAuth}
                style={styles.actionButton}
              />

              <Button
                title="Clear Results"
                onPress={clearResults}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </Card>

          <Card title="Firebase Configuration">
            <View style={styles.configContainer}>
              <Text style={styles.configLabel}>Project ID:</Text>
              <Text style={styles.configValue}>fieldbook-sudip</Text>
              
              <Text style={styles.configLabel}>Auth Domain:</Text>
              <Text style={styles.configValue}>fieldbook-sudip.firebaseapp.com</Text>
              
              <Text style={styles.configLabel}>Storage Bucket:</Text>
              <Text style={styles.configValue}>fieldbook-sudip.firebasestorage.app</Text>
            </View>
          </Card>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F2F2F7' 
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statusContainer: {
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#8E8E93',
    flexWrap: 'wrap',
  },
  overallStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  overallText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    gap: 12,
  },
  actionButton: {
    // Default button styling from components
  },
  configContainer: {
    gap: 8,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  configValue: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  setupButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});
