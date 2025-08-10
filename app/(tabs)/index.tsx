import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, StatCard } from '../../components';
import { useApp } from '../../context/AppContext';
import { StorageService } from '../../services/storage';
import { formatCurrency, getCurrentSettlementWeek, getNextSettlementDate } from '../../utils/calculations';
import { formatDate, getToday } from '../../utils/dates';
import { initializeSampleData } from '../../utils/sampleData';

export default function DashboardScreen() {
  const { state, actions } = useApp();

  const todayWorkedCount = useMemo(() => {
    const today = getToday();
    return state.attendanceRecords.filter(r => {
      const d = new Date(r.date);
      d.setHours(0,0,0,0);
      return r.isPresent && d.getTime() === today.getTime();
    }).length;
  }, [state.attendanceRecords]);

  const dashboardData = useMemo(() => {
    const currentWeekStart = getCurrentSettlementWeek();
    const currentWeekISO = currentWeekStart.toISOString();
    const nextSettlementDate = getNextSettlementDate();
    
    const currentWeekRecords = state.attendanceRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= currentWeekStart && record.isPresent;
    });
    
    const totalPendingWages = currentWeekRecords.reduce((sum, record) => {
      const extraPayments = record.extraPayments.reduce((extraSum, payment) => extraSum + payment.amount, 0);
      return sum + record.calculatedWage + extraPayments - record.advancePayment;
    }, 0);

    // If this cycle is settled, show the settled total instead of estimate
    const settledAmount = (state.paymentHistory || [])
      .filter(h => h.type === 'settlement' && h.settlementWeek === currentWeekISO)
      .reduce((sum, h) => sum + (h.amount || 0), 0);

    return {
      totalAmountToShow: settledAmount > 0 ? settledAmount : totalPendingWages,
      isSettled: settledAmount > 0,
      nextSettlementDate
    };
  }, [state.attendanceRecords, state.paymentHistory]);

  const handleLogout = async () => {
    await actions.logout();
    router.replace('../login');
  };

  const handleLoadSampleData = async () => {
    if (state.employees.length === 0 && state.sites.length === 0) {
      await initializeSampleData(actions);
    }
  };

  const handleReloadSampleData = async () => {
    await StorageService.clearDataButKeepUser();
    await actions.loadData();
    await initializeSampleData(actions);
    await actions.loadData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day!</Text>
            <Text style={styles.date}>{formatDate(new Date())}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Next Settlement at top and clickable */}
          <TouchableOpacity onPress={() => router.push('./settlements')}>
            <Card title="Next Settlement">
              <View style={styles.settlementInfo}>
                <Text style={styles.settlementDate}>
                  {formatDate(dashboardData.nextSettlementDate)}
                </Text>
                <Text style={[styles.settlementAmount, { color: dashboardData.isSettled ? '#34C759' : '#007AFF' }]}>
                  {formatCurrency(dashboardData.totalAmountToShow)}
                </Text>
                <Text style={styles.settlementSubtext}>
                  {dashboardData.isSettled ? 'Settled total payout' : 'Estimated total payout'}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>

          {/* Today stats */}
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <StatCard title="Worked Today" value={todayWorkedCount} subtitle="attendance marked" color="#34C759" />
          </View>

          {/* Quick Actions */}
          <Card title="Quick Actions">
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('../attendance/entry')}
              >
                <Ionicons name="time" size={24} color="#007AFF" />
                <Text style={styles.actionText}>Mark Attendance</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('../employees/add')}
              >
                <Ionicons name="person-add" size={24} color="#34C759" />
                <Text style={styles.actionText}>Add Employee</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('../sites/add')}
              >
                <Ionicons name="location" size={24} color="#FF9500" />
                <Text style={styles.actionText}>Add Site</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('./settlements')}
              >
                <Ionicons name="calculator" size={24} color="#5856D6" />
                <Text style={styles.actionText}>Settlements</Text>
              </TouchableOpacity>
            </View>
            
            {/* Sample Data Buttons */}
            {state.employees.length === 0 && state.sites.length === 0 ? (
              <Button
                title="Load Sample Data"
                onPress={handleLoadSampleData}
                variant="secondary"
                style={styles.sampleDataButton}
              />
            ) : (
              <Button
                title="Reload Sample Data (Override)"
                onPress={handleReloadSampleData}
                variant="secondary"
                style={styles.sampleDataButton}
              />
            )}
          </Card>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  date: {
    fontSize: 14,
    color: '#8E8E93',
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
    textAlign: 'center',
  },
  settlementInfo: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  settlementDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  settlementAmount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  settlementSubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  sampleDataButton: {
    marginTop: 16,
  },
});
