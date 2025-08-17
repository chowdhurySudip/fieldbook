import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/dates';

interface WorkHistoryRecord {
  date: Date;
  siteName: string;
  siteId: string;
  baseWage: number;
  workMultiplier: number;
  calculatedWage: number;
}

export default function EmployeeHistoryScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();
  const { state } = useApp();
  
  const employee = state.employees.find(e => e.id === employeeId);
  
  // Generate work history from attendance records
  const workHistory = useMemo(() => {
    if (!employee) return [];

    const records: WorkHistoryRecord[] = [];
    
    // Get all attendance records for this employee where they were present
    const employeeAttendance = state.attendanceRecords
      .filter(record => record.employeeId === employeeId && record.isPresent)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Recent first

    employeeAttendance.forEach(record => {
      const site = state.sites.find(s => s.id === record.siteId);

      records.push({
        date: new Date(record.date),
        siteName: site?.name || 'Unknown Site',
        siteId: record.siteId || '',
        baseWage: employee.baseWageRate,
        workMultiplier: record.workMultiplier,
        calculatedWage: record.calculatedWage,
      });
    });

    return records;
  }, [employee, state.attendanceRecords, state.sites, employeeId]);

  // Get unique sites worked at
  const uniqueSites = useMemo(() => {
    const siteSet = new Set(workHistory.map(record => record.siteId));
    return Array.from(siteSet).map(siteId => {
      const site = state.sites.find(s => s.id === siteId);
      const daysWorked = workHistory.filter(record => record.siteId === siteId).length;
      return {
        siteId,
        siteName: site?.name || 'Unknown Site',
        daysWorked,
      };
    }).sort((a, b) => b.daysWorked - a.daysWorked); // Sort by most days worked
  }, [workHistory, state.sites]);

  const renderWorkRecord = ({ item }: { item: WorkHistoryRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <View style={styles.recordDateSite}>
          <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
          <Text style={styles.recordSite}>{item.siteName}</Text>
        </View>
        <Text style={styles.recordTotal}>{formatCurrency(item.calculatedWage)}</Text>
      </View>
      
      <View style={styles.recordDetails}>
        <View style={styles.wageCalculation}>
          <Text style={styles.calculationText}>
            Base: {formatCurrency(item.baseWage)} × {item.workMultiplier}x = {formatCurrency(item.calculatedWage)}
          </Text>
        </View>
      </View>
    </Card>
  );

  if (!employee) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Employee not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Employee Header */}
        <Card style={styles.employeeHeader}>
          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeWage}>
            Base Wage: {formatCurrency(employee.baseWageRate)}/day
          </Text>
          {employee.contactInfo && (
            <Text style={styles.employeeContact}>{employee.contactInfo}</Text>
          )}
        </Card>

        {/* Work Locations */}
        {uniqueSites.length > 0 && (
          <Card title={`Work Locations (${workHistory.length} total days)`} style={styles.locationsCard}>
            {uniqueSites.map((location, index) => (
              <View key={location.siteId} style={[
                styles.locationRow,
                index === uniqueSites.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <Text style={styles.locationName}>{location.siteName}</Text>
                <Text style={styles.locationDays}>
                  {location.daysWorked} day{location.daysWorked !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Work History List */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>
            Work History ({workHistory.length} days)
          </Text>
          
          {workHistory.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No work history found for this employee</Text>
            </Card>
          ) : (
            <FlatList
              data={workHistory}
              renderItem={renderWorkRecord}
              keyExtractor={(item) => `${item.date.toISOString()}-${item.siteId}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },
  
  // Employee Header
  employeeHeader: { marginBottom: 16 },
  employeeName: { fontSize: 24, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  employeeWage: { fontSize: 16, color: '#007AFF', fontWeight: '600', marginBottom: 4 },
  employeeContact: { fontSize: 14, color: '#8E8E93' },
  
  // Work Locations Card
  locationsCard: { marginBottom: 16 },
  locationRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  locationName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  locationDays: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  
  // History Section
  historySection: { flex: 1 },
  historyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1C1C1E', 
    marginBottom: 12 
  },
  listContainer: { paddingBottom: 24 },
  
  // Work Record Card
  recordCard: { marginBottom: 12 },
  recordHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordDateSite: { flex: 1 },
  recordDate: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  recordSite: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  recordTotal: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  
  recordDetails: { },
  wageCalculation: { marginBottom: 8 },
  calculationText: { fontSize: 14, color: '#8E8E93' },
});
