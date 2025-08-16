import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/dates';

export default function EditSiteScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { state, actions } = useApp();
  const site = state.sites.find(s => s.id === siteId);
  
  const [formData, setFormData] = useState({
    name: '',
    startDate: new Date(),
    isActive: true,
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (site) {
      setFormData({
        name: site.name,
        startDate: new Date(site.startDate),
        isActive: site.isActive,
      });
    } else {
      // If site not found, go back
      router.back();
    }
  }, [site]);

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
    if (!validateForm() || !site) return;

    setIsLoading(true);
    try {
      await actions.updateSite(site.id, {
        name: formData.name.trim(),
        startDate: formData.startDate,
        isActive: formData.isActive,
      });

      Alert.alert('Success', 'Site updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update site');
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setFormData(prev => ({ ...prev, startDate: selectedDate }));
    }
  };

  const toggleSiteStatus = () => {
    setFormData(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  if (!site) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card title="Site Information">
            <InputField
              label="Site Name"
              value={formData.name}
              onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Enter site name"
              error={errors.name}
              required
            />

            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Start Date *</Text>
              <TouchableOpacity
                style={[styles.dateInput, errors.startDate && styles.dateInputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formatDate(formData.startDate)}
                </Text>
              </TouchableOpacity>
              {errors.startDate && (
                <Text style={styles.errorText}>{errors.startDate}</Text>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
              />
            )}

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Site Status</Text>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  { backgroundColor: formData.isActive ? '#34C759' : '#8E8E93' }
                ]}
                onPress={toggleSiteStatus}
              >
                <Text style={styles.statusButtonText}>
                  {formData.isActive ? 'Active' : 'Completed'}
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          <Card title="Site Guidelines">
            <Text style={styles.guidelineText}>
              • Site name should be unique and descriptive
            </Text>
            <Text style={styles.guidelineText}>
              • Start date helps track project duration
            </Text>
            <Text style={styles.guidelineText}>
              • Completed sites can still track withdrawals but won't appear in attendance
            </Text>
            <Text style={styles.guidelineText}>
              • All historical data is preserved regardless of status
            </Text>
          </Card>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isLoading ? 'Updating...' : 'Update Site'}
            onPress={handleSave}
            disabled={isLoading}
            style={styles.saveButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    justifyContent: 'center',
  },
  dateInputError: {
    borderColor: '#FF3B30',
  },
  dateText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 4,
  },
  guidelineText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: '#F2F2F7',
  },
  saveButton: {
    marginBottom: 0,
  },
});
