import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField, NumberInput, SelectField } from '../../components';
import { useApp } from '../../context/AppContext';
import { ExtraPayment } from '../../types';
import { calculateDailyWage, formatCurrency, generateId } from '../../utils/calculations';
import { formatDate, getToday } from '../../utils/dates';

// Define attendance data shape to avoid TSX generic parsing issues
type EmployeeAttendanceData = {
  isPresent: boolean;
  siteId: string;
  workMultiplier: number;
  advancePayment: number;
  extraPayments: ExtraPayment[];
};

type AttendanceDataMap = Record<string, EmployeeAttendanceData>;

export default function AttendanceEntryScreen() {
  const { state, actions } = useApp();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceDataMap>({});

  // Build lookups
  const activeEmployees = useMemo(() => state.employees.filter(emp => emp.isActive), [state.employees]);
  const siteOptions = useMemo(() => (
    [
      // Removed 'No site assigned' option to enforce selection
      ...state.sites
        .filter(site => site.isActive)
        .map(site => ({ label: site.name, value: site.id }))
    ]
  ), [state.sites]);

  // Load existing attendance for the selected date and prefill
  useEffect(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const recordsForDay = state.attendanceRecords.filter(r => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === startOfDay.getTime();
    });

    const initial: AttendanceDataMap = {};
    for (const emp of activeEmployees) {
      const existing = recordsForDay.find(r => r.employeeId === emp.id);
      if (existing) {
        initial[emp.id] = {
          isPresent: existing.isPresent,
          siteId: existing.siteId || '',
          workMultiplier: existing.workMultiplier ?? 1,
          advancePayment: existing.advancePayment ?? 0,
          extraPayments: existing.extraPayments || []
        };
      } else {
        initial[emp.id] = {
          isPresent: false,
          siteId: '',
          workMultiplier: 1,
          advancePayment: 0,
          extraPayments: []
        };
      }
    }
    setAttendanceData(initial);
  }, [selectedDate, state.attendanceRecords, activeEmployees]);

  const onPickDate = (_: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      setSelectedDate(d);
    }
  };

  const calculateEmployeeWage = (employee: any, data: EmployeeAttendanceData | undefined) => {
    if (!data?.isPresent) return 0;
    return calculateDailyWage(employee.baseWageRate, data.workMultiplier);
  };

  const handleSaveAttendance = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      for (const employee of activeEmployees) {
        const data = attendanceData[employee.id];
        if (!data) continue;

        // If present, a site must be selected
        if (data.isPresent && !data.siteId) {
          Alert.alert('Missing site', `Please select a site for ${employee.name}.`);
          return;
        }

        const calculatedWage = calculateEmployeeWage(employee, data);

        // Find existing record for this employee on the selected date
        const existing = state.attendanceRecords.find(r => {
          const d = new Date(r.date);
          d.setHours(0, 0, 0, 0);
          return r.employeeId === employee.id && d.getTime() === startOfDay.getTime();
        });

        const common = {
          employeeId: employee.id,
          siteId: data.siteId || null,
          date: startOfDay,
          isPresent: data.isPresent,
          workMultiplier: data.workMultiplier,
          hoursWorked: 8,
          advancePayment: data.advancePayment,
          extraPayments: (data.extraPayments || []).filter(p => p.description.trim() && p.amount > 0),
          calculatedWage,
        };

        if (existing) {
          await actions.updateAttendanceRecord(existing.id, common);
        } else {
          await actions.addAttendanceRecord({ ...common });
        }
      }

      Alert.alert('Success', 'Attendance saved', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save attendance records');
    }
  };

  const renderEmployeeCard = (employee: any) => {
    const data = attendanceData[employee.id] || { isPresent: false, siteId: '', workMultiplier: 1, advancePayment: 0, extraPayments: [] };
    const updateEmployeeData = (employeeId: string, field: keyof EmployeeAttendanceData, value: any) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], [field]: value }
      }));
    };
    const addExtraPayment = (employeeId: string) => {
      const newPayment: ExtraPayment = { id: generateId(), description: '', amount: 0, category: 'other' };
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], extraPayments: [ ...(prev[employeeId]?.extraPayments || []), newPayment ] }
      }));
    };
    const updateExtraPayment = (employeeId: string, paymentId: string, field: keyof ExtraPayment, value: any) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          extraPayments: (prev[employeeId]?.extraPayments || []).map(p => p.id === paymentId ? { ...p, [field]: value } : p)
        }
      }));
    };
    const removeExtraPayment = (employeeId: string, paymentId: string) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          extraPayments: (prev[employeeId]?.extraPayments || []).filter(p => p.id !== paymentId)
        }
      }));
    };

    const calculatedWage = calculateEmployeeWage(employee, data);
    const totalExtraPayments = (data.extraPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const netPay = calculatedWage + totalExtraPayments - (data.advancePayment || 0);

    return (
      <Card key={employee.id} style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <TouchableOpacity
            style={[
              styles.presentToggle,
              { backgroundColor: data?.isPresent ? '#34C759' : '#8E8E93' }
            ]}
            onPress={() => updateEmployeeData(employee.id, 'isPresent', !data?.isPresent)}
          >
            <Text style={styles.presentToggleText}>
              {data?.isPresent ? 'Present' : 'Absent'}
            </Text>
          </TouchableOpacity>
        </View>

        {data?.isPresent && (
          <View style={styles.attendanceDetails}>
            <SelectField
              label="Site Assignment"
              options={siteOptions}
              value={data.siteId}
              onValueChange={(value) => updateEmployeeData(employee.id, 'siteId', value)}
              placeholder="Select site..."
            />

            <SelectField
              label="Work Multiplier"
              options={[{ label: '0.5x', value: '0.5' }, { label: '1.0x', value: '1' }, { label: '1.5x', value: '1.5' }, { label: '2.0x', value: '2' }]}
              value={String(data.workMultiplier ?? '1')}
              onValueChange={(value) => updateEmployeeData(employee.id, 'workMultiplier', parseFloat(value))}
              placeholder="Select multiplier..."
            />

            <NumberInput
              label="Advance Payment"
              value={data.advancePayment?.toString() || '0'}
              onChangeText={(value) => updateEmployeeData(employee.id, 'advancePayment', parseFloat(value) || 0)}
              min={0}
              prefix="₹"
            />

            {/* Extra Payments */}
            <View style={styles.extraPaymentsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Extra Payments</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addExtraPayment(employee.id)}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {(data.extraPayments || []).map((payment) => (
                <View key={payment.id} style={styles.extraPaymentRow}>
                  <InputField
                    label=""
                    placeholder="Description"
                    value={payment.description}
                    onChangeText={(value) => updateExtraPayment(employee.id, payment.id, 'description', value)}
                    containerStyle={styles.paymentDescription}
                  />
                  <NumberInput
                    label=""
                    placeholder="0"
                    value={payment.amount?.toString() || '0'}
                    onChangeText={(value) => updateExtraPayment(employee.id, payment.id, 'amount', parseFloat(value) || 0)}
                    prefix="₹"
                    containerStyle={styles.paymentAmount}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeExtraPayment(employee.id, payment.id)}
                  >
                    <Ionicons name="trash" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Wage Summary */}
            <View style={styles.wageSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Wage:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(employee.baseWageRate)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Calculated Wage:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(calculatedWage)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Extra Payments:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalExtraPayments)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Advance:</Text>
                <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                  -{formatCurrency(data.advancePayment || 0)}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Net Pay:</Text>
                <Text style={styles.totalValue}>{formatCurrency(netPay)}</Text>
              </View>
            </View>
          </View>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card style={styles.dateCard}>
            <Text style={styles.sectionTitle}>Date</Text>
            <TouchableOpacity style={styles.datePickerInput} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar" size={18} color="#007AFF" />
              <Text style={styles.datePickerText}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onPickDate}
              />
            )}
          </Card>

          <View style={styles.employeesList}>
            {activeEmployees.map(renderEmployeeCard)}
          </View>

          <View style={styles.footer}>
            <Button
              title="Save Attendance"
              onPress={handleSaveAttendance}
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
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  dateCard: { marginBottom: 16 },
  datePickerInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  datePickerText: { marginLeft: 8, fontSize: 16, color: '#1C1C1E' },
  employeesList: { marginBottom: 16 },
  employeeCard: { marginBottom: 16 },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  presentToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  presentToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  attendanceDetails: {
    paddingTop: 8,
  },
  workDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fullWidth: {
    flex: 1,
  },
  extraPaymentsSection: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  addButton: {
    padding: 4,
  },
  extraPaymentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  paymentDescription: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  paymentAmount: {
    width: 100,
    marginRight: 8,
    marginBottom: 0,
  },
  removeButton: {
    padding: 8,
    marginBottom: 16,
  },
  wageSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  footer: {
    paddingVertical: 24,
  },
  saveButton: {
    marginBottom: 32,
  },
});
