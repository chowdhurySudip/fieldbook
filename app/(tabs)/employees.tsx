import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, FlatList, ListRenderItem, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';
import { Employee } from '../../types';
import { formatCurrency } from '../../utils/calculations';

export default function EmployeesScreen() {
  const { state, actions } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [cfAdvances, setCfAdvances] = useState<Record<string, number>>({});
  const [totalDues, setTotalDues] = useState<Record<string, number>>({});

  React.useEffect(() => {
    (async () => {
      const a = await StorageService.getCarryForwardAdvances();
      setCfAdvances(a || {});
      
      // Calculate total dues (CF advances + current unsettled advances)
      const duesTotals: Record<string, number> = {};
      
      // Start with carry-forward advances
      for (const [empId, cfAmount] of Object.entries(a || {})) {
        duesTotals[empId] = cfAmount;
      }
      
      // Build settled keys from both flags and payment history for accuracy
      const settledWeeks = await StorageService.getSettledWeeks();
      // Use global state history, and if it's not ready yet, fall back to local storage
      let hist = state.paymentHistory || [];
      if (!hist.length) {
        try {
          hist = await StorageService.getPaymentHistory();
        } catch {}
      }
      const settledByHistory = new Set(
        (hist || [])
          .filter(h => h?.type === 'settlement' && !!h?.settlementWeek && !!h?.employeeId)
          .map(h => `${h.employeeId}|${h.settlementWeek}`)
      );

      // Add advances from unsettled attendance records
      for (const record of state.attendanceRecords) {
        if (record.advancePayment > 0) {
          const recordDate = new Date(record.date);
          const weekStart = getWednesdayWeekStart(recordDate);
          const weekKey = `${record.employeeId}|${weekStart.toISOString()}`;
          
          // Only include if this week hasn't been settled (by flags or history)
          if (!settledWeeks[weekKey] && !settledByHistory.has(weekKey)) {
            duesTotals[record.employeeId] = (duesTotals[record.employeeId] || 0) + record.advancePayment;
          }
        }
      }
      
      setTotalDues(duesTotals);
    })();
  }, [state.attendanceRecords, state.paymentHistory, state.user, state.metaVersion]);

  // Helper function to get Wednesday week start
  const getWednesdayWeekStart = (date: Date): Date => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    let daysToSubtract = dayOfWeek - 3; // 3 = Wednesday
    if (daysToSubtract < 0) {
      daysToSubtract += 7; // Go to previous Wednesday
    }
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const filteredEmployees = state.employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'active' && employee.isActive) ||
      (filterStatus === 'inactive' && !employee.isActive);
    
    return matchesSearch && matchesFilter;
  });

  const toggleEmployeeStatus = async (employeeId: string) => {
    const employee = state.employees.find(emp => emp.id === employeeId);
    if (employee) {
      Alert.alert(
        'Confirm',
        `${employee.isActive ? 'Deactivate' : 'Activate'} ${employee.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: employee.isActive ? 'Deactivate' : 'Activate',
            onPress: () => actions.toggleEmployeeStatus(employeeId)
          }
        ]
      );
    }
  };

  const renderEmployee: ListRenderItem<Employee> = ({ item: employee }) => (
    <Card style={styles.employeeCard}>
      {/* Make card content non-clickable */}
      <View style={styles.employeeContent}>
        <View style={styles.employeeInfo}>
          <View style={styles.employeeHeader}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: employee.isActive ? '#34C759' : '#8E8E93' }
            ]}>
              <Text style={styles.statusText}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={styles.employeeWage}>
            Base Wage: {formatCurrency(employee.baseWageRate)}/day
          </Text>
          {/* Always show Total Dues so users can see it even when 0 */}
          <Text style={{ fontSize: 14, fontWeight: '500', color: (totalDues[employee.id] || 0) > 0 ? '#FF3B30' : '#8E8E93' }}>
            Total Dues: -{formatCurrency(totalDues[employee.id] || 0)}
          </Text>
          {employee.contactInfo && (
            <Text style={styles.employeeContact}>{employee.contactInfo}</Text>
          )}
        </View>

        <View style={styles.employeeActions}>
          {/* Edit employee details button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`../employees/edit?employeeId=${employee.id}`)}
            accessibilityLabel={`Edit details for ${employee.name}`}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => toggleEmployeeStatus(employee.id)}
          >
            <Ionicons 
              name={employee.isActive ? "pause" : "play"} 
              size={20} 
              color={employee.isActive ? "#FF9500" : "#34C759"} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Add Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Employees ({filteredEmployees.length})</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('../employees/add')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.controls}>
          <InputField
            label=""
            placeholder="Search employees..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInput}
          />
          
          <View style={styles.filterButtons}>
            {(['all', 'active', 'inactive'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filterStatus === status && styles.filterButtonActive
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterStatus === status && styles.filterButtonTextActive
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Employee List */}
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployee}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No employees found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'Add your first employee to get started'}
              </Text>
              {!searchQuery && (
                <Button
                  title="Add Employee"
                  onPress={() => router.push('../employees/add')}
                  style={styles.emptyButton}
                />
              )}
            </View>
          }
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  employeeCard: {
    marginBottom: 12,
  },
  employeeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  employeeWage: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  employeeContact: {
    fontSize: 14,
    color: '#8E8E93',
  },
  employeeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 32,
  },
});
