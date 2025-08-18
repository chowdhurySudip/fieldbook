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

interface DailyWorkRecord {
  date: Date;
  totalWage: number;
  locations: {
    siteName: string;
    siteId: string;
    wage: number;
    multiplier: number;
  }[];
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

  // Group work history by date for multi-location support
  const dailyWorkHistory = useMemo(() => {
    const grouped = workHistory.reduce((acc, record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(record);
      return acc;
    }, {} as Record<string, WorkHistoryRecord[]>);

    return Object.entries(grouped)
      .map(([dateStr, records]) => ({
        date: new Date(dateStr),
        totalWage: records.reduce((sum, r) => sum + r.calculatedWage, 0),
        locations: records.map(r => ({
          siteName: r.siteName,
          siteId: r.siteId,
          wage: r.calculatedWage,
          multiplier: r.workMultiplier
        }))
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first
  }, [workHistory]);

  // Get unique sites worked at (now based on locations, not individual records)
  const uniqueSites = useMemo(() => {
    const siteData = new Map<string, { siteName: string; totalSessions: number }>();
    
    dailyWorkHistory.forEach(day => {
      day.locations.forEach(location => {
        const existing = siteData.get(location.siteId) || { 
          siteName: location.siteName, 
          totalSessions: 0 
        };
        siteData.set(location.siteId, {
          siteName: location.siteName,
          totalSessions: existing.totalSessions + 1
        });
      });
    });

    return Array.from(siteData.entries()).map(([siteId, data]) => ({
      siteId,
      siteName: data.siteName,
      sessionsWorked: data.totalSessions,
    })).sort((a, b) => b.sessionsWorked - a.sessionsWorked); // Sort by most sessions worked
  }, [dailyWorkHistory]);

  const renderDailyWorkRecord = ({ item }: { item: DailyWorkRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
        <Text style={styles.recordTotal}>{formatCurrency(item.totalWage)}</Text>
      </View>
      
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, styles.workplaceColumn]}>Workplace</Text>
        <Text style={[styles.tableHeaderText, styles.multiplierColumn]}>Multiplier</Text>
        <Text style={[styles.tableHeaderText, styles.wageColumn]}>Daily Wage</Text>
      </View>
      
      {/* Table Rows */}
      <View style={styles.tableBody}>
        {item.locations.map((location, index) => (
          <View key={`${location.siteId}-${index}`} style={styles.tableRow}>
            <Text style={[styles.tableCellText, styles.workplaceColumn]}>{location.siteName}</Text>
            <Text style={[styles.tableCellText, styles.multiplierColumn]}>{location.multiplier}x</Text>
            <Text style={[styles.tableCellText, styles.wageColumn]}>{formatCurrency(location.wage)}</Text>
          </View>
        ))}
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
          <Card title={`Work Locations (${dailyWorkHistory.length} total days)`} style={styles.locationsCard}>
            {uniqueSites.map((location, index) => (
              <View key={location.siteId} style={[
                styles.locationRow,
                index === uniqueSites.length - 1 && { borderBottomWidth: 0 }
              ]}>
                <Text style={styles.locationName}>{location.siteName}</Text>
                <Text style={styles.locationDays}>
                  {location.sessionsWorked} session{location.sessionsWorked !== 1 ? 's' : ''}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {/* Work History List */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>
            Work History ({dailyWorkHistory.length} days)
          </Text>
          
          {dailyWorkHistory.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>No work history found for this employee</Text>
            </Card>
          ) : (
            <FlatList
              data={dailyWorkHistory}
              renderItem={renderDailyWorkRecord}
              keyExtractor={(item) => item.date.toISOString()}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  recordDateSite: { flex: 1 },
  recordDate: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  recordSite: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  recordTotal: { fontSize: 18, fontWeight: '700', color: '#007AFF' },
  
  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableBody: {
    // Container for table rows
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6D6D80',
    textAlign: 'center',
  },
  tableCellText: {
    fontSize: 14,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  
  // Column Widths
  workplaceColumn: {
    flex: 2,
    textAlign: 'left',
  },
  multiplierColumn: {
    flex: 1,
  },
  wageColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  
  recordDetails: { },
  sessionRow: { 
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 4,
  },
  sessionInfo: { flex: 1 },
  sessionSite: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  sessionDetails: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  wageCalculation: { marginBottom: 8 },
  calculationText: { fontSize: 14, color: '#8E8E93' },
});
