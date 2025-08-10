import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField, NumberInput } from '../../components';
import { useApp } from '../../context/AppContext';

export default function AddEmployeeScreen() {
  const { actions } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    baseWageRate: '',
    contactInfo: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Employee name is required';
    }

    if (!formData.baseWageRate || parseFloat(formData.baseWageRate) <= 0) {
      newErrors.baseWageRate = 'Valid base wage rate is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await actions.addEmployee({
        name: formData.name.trim(),
        baseWageRate: parseFloat(formData.baseWageRate),
        contactInfo: formData.contactInfo.trim(),
        isActive: true
      });

      Alert.alert('Success', 'Employee added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add employee');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card title="Employee Information">
            <InputField
              label="Full Name"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Enter employee's full name"
              error={errors.name}
              required
            />

            <NumberInput
              label="Base Wage Rate"
              value={formData.baseWageRate}
              onChangeText={(value) => setFormData(prev => ({ ...prev, baseWageRate: value }))}
              placeholder="0.00"
              prefix="₹"
              suffix="/day"
              error={errors.baseWageRate}
              required
            />

            <InputField
              label="Contact Information"
              value={formData.contactInfo}
              onChangeText={(value) => setFormData(prev => ({ ...prev, contactInfo: value }))}
              placeholder="Phone number, email, or address"
              keyboardType="default"
            />
          </Card>

          <Card title="Employee Guidelines">
            <Text style={styles.guidelineText}>
              • Base wage rate is the daily rate before multipliers
            </Text>
            <Text style={styles.guidelineText}>
              • Work multipliers can range from 0.5× to 2.0× based on work type
            </Text>
            <Text style={styles.guidelineText}>
              • Contact information helps with communication and emergency situations
            </Text>
            <Text style={styles.guidelineText}>
              • Employee can be deactivated later without losing historical data
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
              title={isLoading ? "Adding..." : "Add Employee"}
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
