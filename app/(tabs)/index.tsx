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

  const handleResetData = async () => {
    try {
      // Clear local per-user namespaced data
      await StorageService.clearAllData();
      // Optionally, also clear remote data if user is signed in
      const uid = state.user?.id;
      if (uid) {
        try {
          // Best-effort remote wipe: delete docs in payments, attendance, employees, sites
          // Note: This is a temporary dev-only helper; not optimized
          const { db } = await import('../../services/firebase');
          const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
          const subcollections = ['payments', 'attendance', 'employees', 'sites'];
          for (const sub of subcollections) {
            const colRef = collection(db, `users/${uid}/${sub}`);
            const snap = await getDocs(colRef);
            for (const d of snap.docs) {
              await deleteDoc(doc(db, `users/${uid}/${sub}/${d.id}`));
            }
          }
        } catch {}
      }
      // Reload app state
      await actions.loadData();
    } catch (e) {}
  };

  const renderSyncStatus = () => {
    const status = state.syncStatus || 'idle';
    const map: Record<string, { color: string; icon: any; label: string }> = {
      idle: { color: '#8E8E93', icon: 'cloud-outline', label: 'Idle' },
      syncing: { color: '#007AFF', icon: 'cloud-upload-outline', label: 'Syncing' },
      ok: { color: '#34C759', icon: 'cloud-done-outline' as any, label: 'Synced' },
      error: { color: '#FF3B30', icon: 'cloud-offline-outline' as any, label: 'Sync Error' },
    };
    const meta = map[status];
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={(meta.icon as any)} size={18} color={meta.color} />
        <Text style={{ color: meta.color, fontWeight: '600', fontSize: 12 }}>{meta.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day!</Text>
            <Text style={styles.date}>{formatDate(new Date())}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {renderSyncStatus()}
            <TouchableOpacity onPress={() => actions.syncNow?.()} style={styles.logoutButton}>
              <Ionicons name="refresh-outline" size={22} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {/* Temporary Reset Data button (DEV ONLY) */}
          <Card>
            <Button title="Reset Data (Temp)" onPress={handleResetData} variant="secondary" />
          </Card>

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

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('../firebase-test')}
              >
                <Ionicons 
                  name="cloud-outline" 
                  size={24} 
                  color="#FF3B30" 
                />
                <Text style={styles.actionText}>
                  Firebase Test
                </Text>
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
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionTextDisabled: {
    color: '#8E8E93',
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
