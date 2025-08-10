import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { formatDateForInput } from '../../utils/dates';

export default function AddSiteScreen() {
  const { actions } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    startDate: formatDateForInput(new Date()),
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Site name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await actions.addSite({
        name: formData.name.trim(),
        startDate: new Date(formData.startDate),
        isActive: true,
        totalWithdrawn: 0
      });

      Alert.alert('Success', 'Construction site added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add construction site');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card title="Site Information">
            <InputField
              label="Site Name"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Enter construction site name"
              error={errors.name}
              required
            />

            <InputField
              label="Start Date"
              value={formData.startDate}
              onChangeText={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
              keyboardType="default"
              error={errors.startDate}
              required
            />
          </Card>

          <Card title="Site Management Guidelines">
            <Text style={styles.guidelineText}>
              • Site name should be descriptive and easy to recognize
            </Text>
            <Text style={styles.guidelineText}>
              • Start date helps track project timeline and duration
            </Text>
            <Text style={styles.guidelineText}>
              • Employees can be assigned to sites during daily attendance
            </Text>
            <Text style={styles.guidelineText}>
              • Site can be marked as completed when project finishes
            </Text>
            <Text style={styles.guidelineText}>
              • All financial data (wages, advances) is tracked per site
            </Text>
          </Card>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              style={styles.cancelButton}
            />
            <Button
              title={isLoading ? "Adding..." : "Add Site"}
              onPress={handleSave}
              disabled={isLoading}
              style={styles.saveButton}
            />
          </View>
        </ScrollView>
      </View>
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  guidelineText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingVertical: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});
