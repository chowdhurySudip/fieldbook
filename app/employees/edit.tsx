import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField, NumberInput } from '../../components';
import { useApp } from '../../context/AppContext';

export default function EditEmployeeScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { state, actions } = useApp();
  const employee = useMemo(() => state.employees.find(e => e.id === employeeId), [state.employees, employeeId]);

  const [formData, setFormData] = useState({
    name: '',
    baseWageRate: '',
    contactInfo: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!employee) return;
    setFormData({
      name: employee.name || '',
      baseWageRate: employee.baseWageRate?.toString() || '',
      contactInfo: employee.contactInfo || '',
      isActive: !!employee.isActive,
    });
  }, [employee]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    if (!formData.name.trim()) newErrors.name = 'Employee name is required';
    if (!formData.baseWageRate || parseFloat(formData.baseWageRate) <= 0) newErrors.baseWageRate = 'Valid base wage rate is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!employee) return;
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await actions.updateEmployee(employee.id, {
        name: formData.name.trim(),
        baseWageRate: parseFloat(formData.baseWageRate),
        contactInfo: formData.contactInfo.trim(),
        isActive: formData.isActive,
      });
      Alert.alert('Success', 'Employee updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update employee');
    } finally {
      setIsLoading(false);
    }
  };

  if (!employee) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Employee not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card title="Edit Employee">
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

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={formData.isActive}
                onValueChange={(val) => setFormData(prev => ({ ...prev, isActive: val }))}
              />
            </View>
          </Card>

          <View style={styles.actions}>
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              style={styles.cancelButton}
            />
            <Button
              title={isLoading ? 'Saving...' : 'Save Changes'}
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
  muted: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 24,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
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
