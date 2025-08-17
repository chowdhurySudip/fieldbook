import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components';
import { useApp } from '../../context/AppContext';
import { calculateWeeklySettlement, formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/dates';

export default function SettlementDetailScreen() {
  const { employeeId, weekStart } = useLocalSearchParams<{ employeeId: string; weekStart: string }>();
  const { state } = useApp();

  const weekStartDate = useMemo(() => {
    const d = new Date(weekStart || new Date().toISOString());
    d.setHours(0,0,0,0);
    return d;
  }, [weekStart]);

  const employee = state.employees.find(e => e.id === employeeId);
  const settlement = useMemo(() => employee ? calculateWeeklySettlement(employee.id, employee.name, state.attendanceRecords, weekStartDate) : null, [employee, state.attendanceRecords, weekStartDate]);

  if (!employee || !settlement) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>No data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const weekEnd = new Date(weekStartDate);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.title}>{employee.name}</Text>
          <Text style={styles.subTitle}>Week: {formatDate(weekStartDate)} - {formatDate(weekEnd)}</Text>
        </Card>

        <Card>
          <View style={styles.row}><Text style={styles.label}>Base Wage</Text><Text style={styles.value}>{formatCurrency(employee.baseWageRate)}/day</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total Wages</Text><Text style={styles.value}>{formatCurrency(settlement.totalWagesEarned)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Advances</Text><Text style={[styles.value, { color: '#FF3B30' }]}>-{formatCurrency(settlement.totalAdvances)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Bike</Text><Text style={[styles.value, { color: '#34C759' }]}>+{formatCurrency(settlement.totalExtraPayments)}</Text></View>
          <View style={[styles.row, styles.total]}><Text style={styles.totalLabel}>Net</Text><Text style={styles.totalValue}>{formatCurrency(settlement.netPaymentDue)}</Text></View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Day-wise details</Text>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.th, { flex: 1.6 }]}>Site</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Mult</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Wage</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Advance</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>Extras</Text>
          </View>
          {[...settlement.attendanceRecords]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(rec => {
              const siteName = rec.siteId ? (state.sites.find(s => s.id === rec.siteId)?.name || '-') : '-';
              const extras = rec.extraPayments.reduce((sum, p) => sum + p.amount, 0);
              return (
                <View key={rec.id} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 1.2 }]}>{formatDate(new Date(rec.date))}</Text>
                  <Text style={[styles.td, { flex: 1.6 }]}>{siteName}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>{rec.workMultiplier.toFixed(1)}x</Text>
                  <Text style={[styles.td, { flex: 1.2 }]}>{formatCurrency(rec.calculatedWage)}</Text>
                  <Text style={[styles.td, { flex: 1.2 }]}>{formatCurrency(rec.advancePayment)}</Text>
                  <Text style={[styles.td, { flex: 1.2 }]}>{formatCurrency(extras)}</Text>
                </View>
              );
            })}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  subTitle: { fontSize: 14, color: '#8E8E93', marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 14, color: '#8E8E93' },
  value: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  total: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#007AFF' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  th: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  td: { fontSize: 12, color: '#1C1C1E' },
});
