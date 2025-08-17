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
type WorkSession = {
  id: string;
  siteId: string;
  workMultiplier: number;
  hoursWorked: number;
};

type EmployeeAttendanceData = {
  isPresent: boolean;
  workSessions: WorkSession[];
  advancePayment: number;
  extraPayments: ExtraPayment[];
};

type AttendanceDataMap = Record<string, EmployeeAttendanceData>;

export default function AttendanceEntryScreen() {
  const { state, actions } = useApp();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceDataMap>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

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
      const existing = recordsForDay.filter(r => r.employeeId === emp.id);
      if (existing.length > 0) {
        // Convert existing attendance records to work sessions
        const workSessions: WorkSession[] = existing.map(record => ({
          id: record.id,
          siteId: record.siteId || '',
          workMultiplier: record.workMultiplier ?? 1,
          hoursWorked: record.hoursWorked ?? 8,
        }));

        initial[emp.id] = {
          isPresent: existing.some(r => r.isPresent),
          workSessions,
          advancePayment: existing[0]?.advancePayment ?? 0,
          extraPayments: existing[0]?.extraPayments || []
        };
      } else {
        initial[emp.id] = {
          isPresent: false,
          workSessions: [],
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
    if (!data?.isPresent || !data.workSessions.length) return 0;
    
    return data.workSessions.reduce((total, session) => {
      const sessionWage = calculateDailyWage(employee.baseWageRate, session.workMultiplier);
      // Calculate proportional wage based on hours worked (assuming 8 hours = full day)
      return total + (sessionWage * session.hoursWorked / 8);
    }, 0);
  };

  const handleSaveAttendance = async () => {
    try {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      for (const employee of activeEmployees) {
        const data = attendanceData[employee.id];
        if (!data) continue;

        // If present, at least one work session must exist
        if (data.isPresent && data.workSessions.length === 0) {
          Alert.alert('Missing work session', `Please add at least one work session for ${employee.name}.`);
          return;
        }

        // Validate that all work sessions have sites selected
        for (const session of data.workSessions) {
          if (!session.siteId) {
            Alert.alert('Missing site', `Please select a site for all work sessions of ${employee.name}.`);
            return;
          }
        }

        const calculatedWage = calculateEmployeeWage(employee, data);

        // Find existing records for this employee on this date
        const existingRecords = state.attendanceRecords.filter(r => {
          const d = new Date(r.date);
          d.setHours(0, 0, 0, 0);
          return r.employeeId === employee.id && d.getTime() === startOfDay.getTime();
        });

        // Update existing records to mark them as deleted (or we'll recreate them)
        // For now, we'll just create new records and let the old ones remain
        // TODO: Add proper delete functionality to context
        
        for (const existingRecord of existingRecords) {
          await actions.updateAttendanceRecord(existingRecord.id, { isPresent: false, calculatedWage: 0 });
        }

        // Create new records for each work session
        if (data.isPresent && data.workSessions.length > 0) {
          for (const session of data.workSessions) {
            const sessionWage = calculateDailyWage(employee.baseWageRate, session.workMultiplier);
            const proportionalWage = sessionWage * session.hoursWorked / 8;

            const recordData = {
              employeeId: employee.id,
              siteId: session.siteId,
              date: startOfDay,
              isPresent: true,
              workMultiplier: session.workMultiplier,
              hoursWorked: session.hoursWorked,
              advancePayment: data.workSessions.indexOf(session) === 0 ? data.advancePayment : 0, // Only add advance to first session
              extraPayments: data.workSessions.indexOf(session) === 0 ? (data.extraPayments || []).filter(p => p.description.trim() && p.amount > 0) : [], // Only add extras to first session
              calculatedWage: proportionalWage,
            };

            await actions.addAttendanceRecord(recordData);
          }
        } else if (!data.isPresent) {
          // Create a single absent record
          const recordData = {
            employeeId: employee.id,
            siteId: null,
            date: startOfDay,
            isPresent: false,
            workMultiplier: 1,
            hoursWorked: 0,
            advancePayment: data.advancePayment,
            extraPayments: (data.extraPayments || []).filter(p => p.description.trim() && p.amount > 0),
            calculatedWage: 0,
          };

          await actions.addAttendanceRecord(recordData);
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
    const data = attendanceData[employee.id] || { isPresent: false, workSessions: [], advancePayment: 0, extraPayments: [] };
    const isExpanded = expandedCards[employee.id] || false;
    
    const toggleCardExpansion = (employeeId: string) => {
      setExpandedCards(prev => ({
        ...prev,
        [employeeId]: !prev[employeeId]
      }));
    };
    
    const updateEmployeeData = (employeeId: string, field: keyof EmployeeAttendanceData, value: any) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: { ...prev[employeeId], [field]: value }
      }));
      
      // Auto-expand card when employee is marked as present
      if (field === 'isPresent' && value === true && !expandedCards[employeeId]) {
        setExpandedCards(prevExpanded => ({
          ...prevExpanded,
          [employeeId]: true
        }));
      }
    };

    const addWorkSession = (employeeId: string) => {
      const newSession: WorkSession = {
        id: generateId(),
        siteId: '',
        workMultiplier: 1,
        hoursWorked: 4
      };
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: { 
          ...prev[employeeId], 
          workSessions: [...(prev[employeeId]?.workSessions || []), newSession] 
        }
      }));
    };

    const updateWorkSession = (employeeId: string, sessionId: string, field: keyof WorkSession, value: any) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          workSessions: (prev[employeeId]?.workSessions || []).map(s => 
            s.id === sessionId ? { ...s, [field]: value } : s
          )
        }
      }));
    };

    const removeWorkSession = (employeeId: string, sessionId: string) => {
      setAttendanceData(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          workSessions: (prev[employeeId]?.workSessions || []).filter(s => s.id !== sessionId)
        }
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
    const totalHours = data.workSessions.reduce((sum, session) => sum + session.hoursWorked, 0);
    const netPay = calculatedWage + totalExtraPayments - (data.advancePayment || 0);

    return (
      <Card key={employee.id} style={styles.employeeCard}>
        <View style={styles.employeeHeader}>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            {data?.isPresent && (
              <View style={styles.employeeSubtextContainer}>
                <Text style={styles.employeeSubtext}>
                  {data.workSessions.length} session{data.workSessions.length !== 1 ? 's' : ''} • 
                  {totalHours}h total • Net: {formatCurrency(netPay)}
                </Text>
                <View style={styles.statusIndicators}>
                  {data.workSessions.length > 0 && (
                    <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
                  )}
                  {(data.advancePayment || 0) > 0 && (
                    <View style={[styles.statusDot, { backgroundColor: '#FF9500' }]} />
                  )}
                  {(data.extraPayments || []).length > 0 && (
                    <View style={[styles.statusDot, { backgroundColor: '#007AFF' }]} />
                  )}
                </View>
              </View>
            )}
          </View>
          <View style={styles.headerControls}>
            {data?.isPresent && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => toggleCardExpansion(employee.id)}
              >
                <Ionicons 
                  name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color="#8E8E93" 
                />
              </TouchableOpacity>
            )}
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
        </View>

        {data?.isPresent && isExpanded && (
          <View style={styles.attendanceDetails}>
            {/* Work Sessions */}
            <View style={styles.workSessionsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Work Sessions</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addWorkSession(employee.id)}
                >
                  <Ionicons name="add" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {data.workSessions.map((session, index) => (
                <View key={session.id} style={styles.workSessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>Session {index + 1}</Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeWorkSession(employee.id, session.id)}
                    >
                      <Ionicons name="trash" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <SelectField
                    label="Site"
                    options={siteOptions}
                    value={session.siteId}
                    onValueChange={(value) => updateWorkSession(employee.id, session.id, 'siteId', value)}
                    placeholder="Select site..."
                  />

                  <View style={styles.sessionRow}>
                    <View style={styles.halfWidth}>
                      <SelectField
                        label="Work Multiplier"
                        options={[{ label: '0.5x', value: '0.5' }, { label: '1.0x', value: '1' }, { label: '1.5x', value: '1.5' }, { label: '2.0x', value: '2' }]}
                        value={String(session.workMultiplier)}
                        onValueChange={(value) => updateWorkSession(employee.id, session.id, 'workMultiplier', parseFloat(value))}
                        placeholder="Select multiplier..."
                      />
                    </View>

                    <View style={styles.halfWidth}>
                      <NumberInput
                        label="Hours Worked"
                        value={session.hoursWorked.toString()}
                        onChangeText={(value) => updateWorkSession(employee.id, session.id, 'hoursWorked', parseFloat(value) || 0)}
                        min={0}
                        max={12}
                      />
                    </View>
                  </View>
                </View>
              ))}

              {data.workSessions.length === 0 && (
                <Text style={styles.noSessionsText}>No work sessions added. Tap + to add a session.</Text>
              )}
            </View>

            <NumberInput
              label="Advance Payment"
              value={data.advancePayment?.toString() || '0'}
              onChangeText={(value) => updateEmployeeData(employee.id, 'advancePayment', parseFloat(value) || 0)}
              min={0}
              prefix="₹"
            />

            {/* Bike */}
            <View style={styles.bikePaymentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Bike</Text>
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
                <Text style={styles.summaryLabel}>Total Hours:</Text>
                <Text style={styles.summaryValue}>{totalHours}h</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Calculated Wage:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(calculatedWage)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bike:</Text>
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

          {/* Summary Card for Present Employees */}
          {activeEmployees.filter(emp => attendanceData[emp.id]?.isPresent).length > 0 && (
            <Card style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Text style={styles.summaryTitle}>
                  {activeEmployees.filter(emp => attendanceData[emp.id]?.isPresent).length} employees present
                </Text>
                <TouchableOpacity
                  style={styles.toggleAllButton}
                  onPress={() => {
                    const allExpanded = activeEmployees
                      .filter(emp => attendanceData[emp.id]?.isPresent)
                      .every(emp => expandedCards[emp.id]);
                    
                    const newExpanded = { ...expandedCards };
                    activeEmployees
                      .filter(emp => attendanceData[emp.id]?.isPresent)
                      .forEach(emp => {
                        newExpanded[emp.id] = !allExpanded;
                      });
                    setExpandedCards(newExpanded);
                  }}
                >
                  <Text style={styles.toggleAllText}>
                    {activeEmployees
                      .filter(emp => attendanceData[emp.id]?.isPresent)
                      .every(emp => expandedCards[emp.id]) 
                      ? 'Collapse All' 
                      : 'Expand All'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}

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
  summaryCard: { 
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  toggleAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  toggleAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeInfo: {
    flex: 1,
    marginRight: 12,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  employeeSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  employeeSubtextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicators: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 8,
    marginRight: 8,
  },
  presentToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
  bikePaymentSection: {
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
  workSessionsSection: {
    marginTop: 16,
  },
  workSessionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  sessionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  noSessionsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 16,
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
