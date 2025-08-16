import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';
import { formatDate, getLocalDateString } from '../../utils/dates';

// Employee work record for this site
interface EmployeeWorkRecord {
  date: Date;
  employeeName: string;
  employeeId: string;
  baseWage: number;
  workMultiplier: number;
  totalWage: number;
}

export default function SiteDetailScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { state, actions } = useApp();
  const site = state.sites.find(s => s.id === siteId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [activeTab, setActiveTab] = useState<'details' | 'withdrawals' | 'work'>('details');

  const withdrawals = useMemo(() => {
    return (state.paymentHistory || [])
      .filter((h: any) => h.type === 'site-withdrawal' && h.siteId === siteId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.paymentHistory, siteId, refresh]);

  // Get all work records for this site
  const workRecords = useMemo(() => {
    const records: EmployeeWorkRecord[] = [];
    
    state.attendanceRecords
      .filter(record => record.siteId === siteId && record.isPresent)
      .forEach(record => {
        const employee = state.employees.find(emp => emp.id === record.employeeId);
        if (employee) {
          records.push({
            date: new Date(record.date),
            employeeName: employee.name,
            employeeId: employee.id,
            baseWage: employee.baseWageRate,
            workMultiplier: record.workMultiplier,
            totalWage: record.calculatedWage,
          });
        }
      });

    // Sort by date (recent first)
    return records.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [state.attendanceRecords, state.employees, siteId]);

  // Calculate total amount spent on employees
  const totalEmployeeAmount = useMemo(() => {
    return workRecords.reduce((sum, record) => sum + record.totalWage, 0);
  }, [workRecords]);

  // Group work records by date for better display
  const workRecordsByDate = useMemo(() => {
    const grouped: { [key: string]: EmployeeWorkRecord[] } = {};
    workRecords.forEach(record => {
      // Use local date string to avoid timezone issues
      const dateKey = getLocalDateString(record.date);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });
    
    // Convert to array and sort by date (recent first)
    return Object.entries(grouped)
      .map(([date, records]) => ({
        date: new Date(date + 'T00:00:00'), // Parse as local date
        records: records.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workRecords]);

  useEffect(() => {
    if (!site) {
      // If site not found, go back
      router.back();
    }
  }, [site]);

  const onChangeDate = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const addWithdrawal = async () => {
    const amt = parseFloat(amount || '0');
    if (!site || isNaN(amt) || amt <= 0) return;

    await actions.addPaymentRecord({
      employeeId: '',
      date: selectedDate,
      amount: amt,
      type: 'site-withdrawal',
      description: note || `Withdrawal for ${site.name}`,
      isSettled: true,
      siteId: site.id,
    });

    // Update site's totalWithdrawn
    await actions.updateSite(site.id, { totalWithdrawn: (site.totalWithdrawn || 0) + amt });

    setAmount('');
    setNote('');
    setRefresh(x => x + 1);
  };

  const navigateToEdit = () => {
    router.push({ pathname: '/sites/edit' as any, params: { siteId: site?.id } });
  };

  if (!site) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Card title="Basic Information">
              <View style={styles.row}>
                <Text style={styles.label}>Site Name:</Text>
                <Text style={styles.value}>{site.name}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Start Date:</Text>
                <Text style={styles.value}>{formatDate(new Date(site.startDate))}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Status:</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: site.isActive ? '#34C759' : '#8E8E93' }
                ]}>
                  <Text style={styles.statusText}>
                    {site.isActive ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>
            </Card>

            <Card title="Financial Summary" style={{ marginTop: 12 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Total Withdrawn:</Text>
                <Text style={[styles.value, styles.amountText]}>{formatCurrency(site.totalWithdrawn || 0)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Total Employee Wages:</Text>
                <Text style={[styles.value, styles.amountText]}>{formatCurrency(totalEmployeeAmount)}</Text>
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Site Cost:</Text>
                <Text style={styles.totalValue}>{formatCurrency((site.totalWithdrawn || 0) + totalEmployeeAmount)}</Text>
              </View>
            </Card>

            <Card title="Work Statistics" style={{ marginTop: 12 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Total Work Days:</Text>
                <Text style={styles.value}>{workRecords.length}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Unique Workers:</Text>
                <Text style={styles.value}>{new Set(workRecords.map(r => r.employeeId)).size}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Average Daily Wage:</Text>
                <Text style={styles.value}>
                  {workRecords.length > 0 ? formatCurrency(totalEmployeeAmount / workRecords.length) : formatCurrency(0)}
                </Text>
              </View>
            </Card>
          </ScrollView>
        );

      case 'withdrawals':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Card title="Add New Withdrawal" style={{ marginBottom: 12 }}>
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.inputLabel}>Date</Text>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateInputLike} activeOpacity={0.7}>
                  <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                </TouchableOpacity>
              </View>
              {showPicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={onChangeDate}
                />
              )}
              <InputField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
              <InputField label="Note (optional)" value={note} onChangeText={setNote} />
              <Button title="Save Withdrawal" onPress={addWithdrawal} />
            </Card>

            <Card title="Withdrawal History">
              <FlatList
                data={withdrawals}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: any) => (
                  <View style={styles.withdrawalRow}>
                    <View style={styles.withdrawalInfo}>
                      <Text style={styles.withdrawalDate}>{formatDate(new Date(item.date))}</Text>
                      {item.description && (
                        <Text style={styles.withdrawalNote}>{item.description}</Text>
                      )}
                    </View>
                    <Text style={styles.withdrawalAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: '#8E8E93' }}>No withdrawals yet</Text>}
                scrollEnabled={false}
              />
            </Card>
          </ScrollView>
        );

      case 'work':
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Card title={`Employee Work Records (${workRecords.length} total)`}>
              {workRecordsByDate.length === 0 ? (
                <Text style={{ color: '#8E8E93' }}>No work records found for this site</Text>
              ) : (
                workRecordsByDate.map(({ date, records }) => (
                  <View key={date.toISOString()} style={styles.dateSection}>
                    <View style={styles.dateSectionHeader}>
                      <Text style={styles.dateSectionTitle}>{formatDate(date)}</Text>
                      <Text style={styles.dateSectionSummary}>
                        {records.length} worker{records.length !== 1 ? 's' : ''} • {formatCurrency(records.reduce((sum, r) => sum + r.totalWage, 0))}
                      </Text>
                    </View>
                    
                    {records.map((record, index) => (
                      <View key={`${record.employeeId}-${date.toISOString()}`} style={styles.workRecord}>
                        <View style={styles.workRecordHeader}>
                          <Text style={styles.employeeName}>{record.employeeName}</Text>
                          <Text style={styles.workRecordTotal}>{formatCurrency(record.totalWage)}</Text>
                        </View>
                        <View style={styles.workRecordDetails}>
                          <Text style={styles.workDetail}>
                            Base: {formatCurrency(record.baseWage)} × {record.workMultiplier}x = {formatCurrency(record.totalWage)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </Card>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header - consistent with other pages */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{site.name}</Text>
          <TouchableOpacity style={styles.addButton} onPress={navigateToEdit}>
            <Ionicons name="create-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'withdrawals' && styles.activeTab]}
            onPress={() => setActiveTab('withdrawals')}
          >
            <Text style={[styles.tabText, activeTab === 'withdrawals' && styles.activeTabText]}>Withdrawals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'work' && styles.activeTab]}
            onPress={() => setActiveTab('work')}
          >
            <Text style={[styles.tabText, activeTab === 'work' && styles.activeTabText]}>Work Records</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8 
  },
  label: { 
    fontSize: 14, 
    color: '#8E8E93',
    flex: 1,
  },
  value: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'right',
  },
  amountText: {
    color: '#007AFF',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#007AFF',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  withdrawalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  withdrawalInfo: {
    flex: 1,
  },
  withdrawalDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  withdrawalNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  withdrawalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  dateSection: {
    marginBottom: 20,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  dateSectionSummary: {
    fontSize: 12,
    color: '#8E8E93',
  },
  workRecord: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  workRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  workRecordTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  workRecordDetails: {
    marginTop: 4,
  },
  workDetail: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // Input-like date field to match InputField styles
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  dateInputLike: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    justifyContent: 'center',
  },
  dateText: { color: '#1C1C1E', fontSize: 16 },
});
