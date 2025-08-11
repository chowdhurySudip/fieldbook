import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ListRenderItem, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, NumberInput } from '../../components';
import { useApp } from '../../context/AppContext';
import { MetaRepo } from '../../services/repositories/metaRepo';
import { StorageService } from '../../services/storage';
import { WeeklySettlement } from '../../types';
import { calculateWeeklySettlement, formatCurrency, getCurrentSettlementWeek } from '../../utils/calculations';
import { formatDate } from '../../utils/dates';

const toISODate = (d: Date) => d.toISOString().split('T')[0];
const startOfWednesdayWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun .. 6 Sat
  let diff = day - 3; // Wednesday=3
  if (diff < 0) diff += 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getWednesdaysForMonth = (year: number, month: number) => {
  // month is 1-based from calendar
  const res: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 3) res.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return res;
};

export default function SettlementsScreen() {
  const { state, actions } = useApp();
  const [selectedWeek, setSelectedWeek] = useState(getCurrentSettlementWeek());
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deductMap, setDeductMap] = useState<Record<string, string>>({}); // employeeId -> string value (Deductions)
  const [payMap, setPayMap] = useState<Record<string, string>>({}); // employeeId -> string value
  const [cfAdvances, setCfAdvances] = useState<Record<string, number>>({});
  const [cfPayables, setCfPayables] = useState<Record<string, number>>({});
  const [cfAdvByWeek, setCfAdvByWeek] = useState<Record<string, number>>({}); // `${empId}|${weekStartISO}` -> amount
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [settledFlags, setSettledFlags] = useState<Record<string, boolean>>({}); // `${empId}|${weekStartISO}` -> true
  const [isEditing, setIsEditing] = useState(true);
  // New: cache payment history so Settled Amount uses actual paid total
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Keep local paymentHistory in sync with global state
  useEffect(() => {
    setPaymentHistory(state.paymentHistory || []);
  }, [state.paymentHistory]);

  // Load carry-forward balances and history WHEN the user is available (namespace set)
  useEffect(() => {
    if (!state.user) return; // wait until auth sets the storage namespace
    (async () => {
      try {
        const uid = state.user?.id;
        if (uid) {
          const cloudState = await MetaRepo.getState(uid);
          // Always read local for merge
          const [localCfAdv, localCfPay, localSettled, localCfByWeek, localHist] = await Promise.all([
            StorageService.getCarryForwardAdvances(),
            StorageService.getCarryForwardExtras && StorageService.getCarryForwardExtras(),
            StorageService.getSettledWeeks ? StorageService.getSettledWeeks() : Promise.resolve({}),
            StorageService.getCarryForwardAdvancesByWeek ? StorageService.getCarryForwardAdvancesByWeek() : Promise.resolve({}),
            StorageService.getPaymentHistory ? StorageService.getPaymentHistory() : Promise.resolve([]),
          ]);
          if (cloudState) {
            // Merge cloud over local to avoid losing values not yet synced
            setCfAdvances({ ...(localCfAdv || {}), ...(cloudState.cfAdvances || {}) });
            setCfPayables({ ...((localCfPay as any) || {}), ...((cloudState.cfPayables as any) || {}) });
            setSettledFlags({ ...((localSettled as any) || {}), ...((cloudState.settledWeeks as any) || {}) });
            setCfAdvByWeek({ ...((localCfByWeek as any) || {}), ...((cloudState.cfAdvByWeek as any) || {}) });
            // Keep payment history from global if present, else local
            setPaymentHistory((state.paymentHistory && state.paymentHistory.length ? state.paymentHistory : (localHist as any)) || []);
            return;
          }
          // No cloud state; use local entirely
          setCfAdvances(localCfAdv || {});
          setCfPayables((localCfPay as any) || {});
          setSettledFlags((localSettled as any) || {});
          setCfAdvByWeek((localCfByWeek as any) || {});
          setPaymentHistory((state.paymentHistory && state.paymentHistory.length ? state.paymentHistory : (localHist as any)) || []);
          return;
        }
      } catch {}
      // Fallback local path if any error
      const [a, p, settled, cfByWeek, history] = await Promise.all([
        StorageService.getCarryForwardAdvances(),
        StorageService.getCarryForwardExtras && StorageService.getCarryForwardExtras(),
        StorageService.getSettledWeeks ? StorageService.getSettledWeeks() : Promise.resolve({}),
        StorageService.getCarryForwardAdvancesByWeek ? StorageService.getCarryForwardAdvancesByWeek() : Promise.resolve({}),
        StorageService.getPaymentHistory ? StorageService.getPaymentHistory() : Promise.resolve([]),
      ]);
      setCfAdvances(a || {});
      setCfPayables((p as any) || {});
      setSettledFlags((settled as any) || {});
      setCfAdvByWeek((cfByWeek as any) || {});
      setPaymentHistory((state.paymentHistory && state.paymentHistory.length ? state.paymentHistory : (history as any)) || []);
    })();
  }, [state.user]);

  // Mark Wednesdays for current month
  useEffect(() => {
    const marks: Record<string, any> = {};
    const weds = getWednesdaysForMonth(currentMonth.year, currentMonth.month);
    weds.forEach(dateStr => {
      marks[dateStr] = { dots: [{ color: '#007AFF' }], marked: true };
    });
    // Mark selected week start as selected
    marks[toISODate(selectedWeek)] = { selected: true, selectedColor: '#007AFF' };
    setMarkedDates(marks);
  }, [currentMonth, selectedWeek]);

  const activeEmployees = useMemo(() => state.employees.filter(e => e.isActive), [state.employees]);

  const weeklySettlements = useMemo(() => {
    return activeEmployees
      .map(employee =>
        calculateWeeklySettlement(
          employee.id,
          employee.name,
          state.attendanceRecords,
          selectedWeek
        )
      )
      .filter(s => s.attendanceRecords.length > 0);
  }, [activeEmployees, state.attendanceRecords, selectedWeek]);

  // When switching weeks, set edit mode based on whether all employees are already settled for that week
  useEffect(() => {
    const weekStartISO = selectedWeek.toISOString();
    const allSettled = weeklySettlements.length > 0 && weeklySettlements.every(s => settledFlags[`${s.employeeId}|${weekStartISO}`]);
    setIsEditing(!allSettled);
    // Clear per-employee deduction overrides when week changes to avoid stale values
    setDeductMap({});
  }, [selectedWeek, weeklySettlements, settledFlags]);

  // Helper to get current deduction value for an employee
  const getDeductionValue = (s: WeeklySettlement) => {
    const priorAdv = cfAdvances[s.employeeId] || 0;
    const availableAdv = priorAdv + s.totalAdvances;
    const v = deductMap[s.employeeId];
    const parsed = v !== undefined ? parseFloat(v || '0') : availableAdv; // prefill with prev + this week advances
    if (Number.isNaN(parsed) || parsed < 0) return 0;
    // Cap at available (prior + weekly)
    return Math.min(parsed, availableAdv);
  };

  // Compute total to pay across employees based on current deductions and prior payable CF
  const totalToPay = useMemo(() => {
    return weeklySettlements.reduce((sum, s) => {
      const priorPay = cfPayables[s.employeeId] || 0;
      const deduction = getDeductionValue(s);
      const grossPayable = Math.max(0, s.totalWagesEarned + s.totalExtraPayments - deduction);
      return sum + (priorPay + grossPayable);
    }, 0);
  }, [weeklySettlements, cfPayables, deductMap, cfAdvances]);

  // New: settled total should come from payment history
  const weekStartISO = useMemo(() => selectedWeek.toISOString(), [selectedWeek]);
  const settledTotalForWeek = useMemo(() => {
    const hist = state.paymentHistory && state.paymentHistory.length ? state.paymentHistory : paymentHistory;
    if (!hist || hist.length === 0) return 0;
    return hist
      .filter((h: any) => h?.type === 'settlement' && h?.settlementWeek === weekStartISO)
      .reduce((sum: number, h: any) => sum + (h?.amount || 0), 0);
  }, [state.paymentHistory, paymentHistory, weekStartISO]);

  // New: helper to show applied deductions for previous (settled) weeks
  const getAppliedDeductionForDisplay = (s: WeeklySettlement) => {
    const hist = state.paymentHistory && state.paymentHistory.length ? state.paymentHistory : paymentHistory;
    const entry = hist?.find(
      (h: any) => h?.type === 'settlement' && h?.settlementWeek === weekStartISO && h?.employeeId === s.employeeId
    );
    if (entry && typeof entry.appliedDeduction === 'number') return Math.max(0, entry.appliedDeduction);
    if (entry) {
      const priorPaySnap = typeof entry.priorPayableSnapshot === 'number' ? entry.priorPayableSnapshot : 0;
      const x = Math.max(0, s.totalWagesEarned + s.totalExtraPayments);
      const paid = Math.max(0, entry.amount || 0);
      const grossPaidPortion = Math.max(0, paid - priorPaySnap);
      const approx = Math.max(0, x - grossPaidPortion);
      const priorAdvSnap = cfAdvByWeek?.[`${s.employeeId}|${weekStartISO}`] || 0;
      const availableAdvAtWeek = priorAdvSnap + s.totalAdvances;
      return Math.min(approx, Math.max(0, availableAdvAtWeek));
    }
    // No entry found (older data) -> conservative fallback
    const priorAdvSnap = cfAdvByWeek?.[`${s.employeeId}|${weekStartISO}`] || 0;
    const availableAdvAtWeek = priorAdvSnap + s.totalAdvances;
    return Math.min(availableAdvAtWeek, Math.max(0, s.totalWagesEarned + s.totalExtraPayments));
  };

  const weekEndDate = new Date(selectedWeek);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const onDayPress = (day: any) => {
    const date = new Date(day.dateString);
    const weekStart = startOfWednesdayWeek(date);
    setSelectedWeek(weekStart);
    setShowCalendar(false);
  };

  const toggleExpanded = (employeeId: string) => {
    setExpanded(prev => ({ ...prev, [employeeId]: !prev[employeeId] }));
  };

  const handleSettleAll = async () => {
    // Compute new carry-forwards based on user inputs and pay all outstanding
    const newCfAdv: Record<string, number> = { ...cfAdvances };
    const newCfPay: Record<string, number> = { ...cfPayables };
    const weekStartISO = selectedWeek.toISOString();
    const settledMap: Record<string, boolean> = { ...(settledFlags || {}) };
    const cfByWeek: Record<string, number> = { ...(cfAdvByWeek || {}) };

    // Remove any existing settlement records for this week (re-settle scenario)
    const existingHistory = await StorageService.getPaymentHistory();
    const employeeIdsThisWeek = new Set(weeklySettlements.map(s => s.employeeId));
    const filteredHistory = existingHistory.filter(h => !(h.type === 'settlement' && h.settlementWeek === weekStartISO && employeeIdsThisWeek.has(h.employeeId)));
    const newHistory = [...filteredHistory];

    for (const s of weeklySettlements) {
      const empId = s.employeeId;
      const priorAdv = cfAdvances[empId] || 0;
      const priorPay = cfPayables[empId] || 0;

      // Snapshot the prev advances used for this week so historical view stays correct
      cfByWeek[`${empId}|${weekStartISO}`] = priorAdv;

      const deduction = getDeductionValue(s);
      const availableAdv = priorAdv + s.totalAdvances;
      const appliedDeduction = Math.max(0, Math.min(availableAdv, deduction));
      const remainingAdv = Math.max(0, availableAdv - appliedDeduction);

      const grossPayable = Math.max(0, s.totalWagesEarned + s.totalExtraPayments - appliedDeduction);
      const toPayThisWeek = priorPay + grossPayable; // pay all due

      newCfAdv[empId] = remainingAdv; // carry forward leftover advances
      newCfPay[empId] = 0; // no payable carry forward since paying all

      // Record payment history (include appliedDeduction and snapshots for accurate history display)
      newHistory.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        employeeId: empId,
        date: new Date(),
        amount: toPayThisWeek,
        type: 'settlement',
        description: `Weekly settlement for ${formatDate(selectedWeek)} - ${formatDate(new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), selectedWeek.getDate() + 6))}`,
        isSettled: true,
        settlementWeek: weekStartISO,
        createdAt: new Date(),
        // Added for historical accuracy
        appliedDeduction,
        priorAdvanceSnapshot: priorAdv,
        weeklyAdvances: s.totalAdvances,
        wages: s.totalWagesEarned,
        extras: s.totalExtraPayments,
        priorPayableSnapshot: priorPay,
        netThisWeek: grossPayable,
      });

      settledMap[`${empId}|${weekStartISO}`] = true;
    }

    await Promise.all([
      StorageService.setCarryForwardAdvances(newCfAdv),
      StorageService.setCarryForwardExtras ? StorageService.setCarryForwardExtras(newCfPay as any) : Promise.resolve(),
      StorageService.savePaymentHistory(newHistory),
      StorageService.setSettledWeeks ? StorageService.setSettledWeeks(settledMap) : Promise.resolve(),
      StorageService.setCarryForwardAdvancesByWeek ? StorageService.setCarryForwardAdvancesByWeek(cfByWeek) : Promise.resolve(),
    ]);

    // Push to cloud meta for sync
    try {
      if (state.user?.id) {
        await MetaRepo.setState(state.user.id, {
          cfAdvances: newCfAdv,
          cfPayables: newCfPay,
          settledWeeks: settledMap,
          cfAdvByWeek: cfByWeek,
        });
      }
    } catch {}

    setCfAdvances(newCfAdv);
    setCfPayables(newCfPay);
    setSettledFlags(settledMap);
    setCfAdvByWeek(cfByWeek);
    // Update local payment history cache so Settled Amount reflects what was paid
    setPaymentHistory(newHistory as any);
    setIsEditing(false);
    // Refresh global state so Dashboard and other tabs reflect the settlement
    try { await actions.loadData(); } catch {}
  };

  const getPrevAdvanceForDisplay = (s: WeeklySettlement) => {
    const key = `${s.employeeId}|${selectedWeek.toISOString()}`;
    if (cfAdvByWeek && cfAdvByWeek[key] !== undefined) return cfAdvByWeek[key];
    return cfAdvances[s.employeeId] || 0;
  };

  const renderSettlement: ListRenderItem<WeeklySettlement> = ({ item: settlement }) => {
    const emp = state.employees.find(e => e.id === settlement.employeeId);
    const baseWage = emp?.baseWageRate ?? 0;

    const deduction = getDeductionValue(settlement);
    const priorPay = cfPayables[settlement.employeeId] || 0;
    const netThisWeek = Math.max(0, settlement.totalWagesEarned + settlement.totalExtraPayments - deduction);
    const toPay = priorPay + netThisWeek;

    const availableAdv = (cfAdvances[settlement.employeeId] || 0) + settlement.totalAdvances;
    const defaultDeduct = isEditing
      ? (deductMap[settlement.employeeId] ?? String(availableAdv))
      : String(getAppliedDeductionForDisplay(settlement));

    return (
      <Card style={styles.settlementCard}>
        <View style={styles.settlementContent}>
          <View style={styles.settlementInfo}>
            <View style={styles.settlementHeader}>
              <Text
                style={styles.employeeName}
                onPress={() =>
                  router.push({
                    pathname: '/settlements/[employeeId]',
                    params: { employeeId: settlement.employeeId, weekStart: selectedWeek.toISOString() },
                  })
                }
              >
                {settlement.employeeName}
              </Text>
              {(() => {
                const isSettledEmp = !!settledFlags[`${settlement.employeeId}|${weekStartISO}`];
                const hist = paymentHistory.find(
                  (h: any) => h?.type === 'settlement' && h?.settlementWeek === weekStartISO && h?.employeeId === settlement.employeeId
                );
                const displayAmt = !isEditing && isSettledEmp ? (hist?.amount ?? 0) : toPay;
                return (
                  <Text style={[styles.netAmount, { color: displayAmt >= 0 ? '#34C759' : '#FF3B30' }]}>
                    {formatCurrency(displayAmt)}
                  </Text>
                );
              })()}
            </View>

            <View style={styles.settlementDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Base Wage:</Text>
                <Text style={styles.detailValue}>{formatCurrency(baseWage)}/day</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Wages:</Text>
                <Text style={styles.detailValue}>{formatCurrency(settlement.totalWagesEarned)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Advances (week):</Text>
                <Text style={[styles.detailValue, { color: '#FF3B30' }]}>-{formatCurrency(settlement.totalAdvances)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Prev Advances (CF):</Text>
                <Text style={[styles.detailValue, { color: '#FF3B30' }]}>-{formatCurrency(getPrevAdvanceForDisplay(settlement))}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Extras:</Text>
                <Text style={[styles.detailValue, { color: '#34C759' }]}>+{formatCurrency(settlement.totalExtraPayments)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Days Worked:</Text>
                <Text style={styles.detailValue}>{settlement.attendanceRecords.length}</Text>
              </View>
            </View>

            {/* Deductions field */}
            <View style={[styles.revisionRow, !isEditing && { opacity: 0.6 }] } pointerEvents={isEditing ? 'auto' : 'none'}>
              <NumberInput
                label={isEditing ? "Deductions" : "Deductions Applied"}
                value={defaultDeduct}
                onChangeText={(v) => setDeductMap(prev => ({ ...prev, [settlement.employeeId]: v }))}
                min={0}
                prefix="₹"
                editable={isEditing}
              />
              <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>
                {isEditing
                  ? 'Prefilled with previous + weekly advances. Remaining advances will carry forward.'
                  : 'Shown from settlement history for this week.'}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Settlements</Text>
        </View>

        {/* Week summary and collapsible calendar */}
        <Card style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.weekDate}>
                {formatDate(selectedWeek)} - {formatDate(new Date(selectedWeek.getFullYear(), selectedWeek.getMonth(), selectedWeek.getDate() + 6))}
              </Text>
              <Text style={styles.weekTotal}>Total: {formatCurrency(isEditing ? totalToPay : settledTotalForWeek)}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowCalendar(v => !v)}>
              <Text style={{ color: '#007AFF', fontWeight: '600' }}>{showCalendar ? 'Hide Calendar' : 'Change Week'}</Text>
            </TouchableOpacity>
          </View>
          {showCalendar && (
            <View style={{ marginTop: 12 }}>
              <Calendar
                onDayPress={onDayPress}
                onMonthChange={(m) => setCurrentMonth({ year: m.year, month: m.month })}
                markedDates={markedDates}
                enableSwipeMonths
              />
              <Text style={styles.weekHint}>Tip: Select any date; the settlement week runs Wed–Tue.</Text>
            </View>
          )}
        </Card>

        {/* Settlements List */}
        <FlatList
          data={weeklySettlements}
          renderItem={renderSettlement}
          keyExtractor={(item) => `${item.employeeId}-${selectedWeek.getTime()}`}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calculator-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No settlements for this week</Text>
              <Text style={styles.emptySubtitle}>No attendance records found for the selected week</Text>
            </View>
          }
          ListFooterComponent={
            weeklySettlements.length > 0 ? (
              <View style={styles.footer}>
                {isEditing ? (
                  <Button title={`Pay Amount: ${formatCurrency(totalToPay)}`} onPress={handleSettleAll} style={styles.settleButton} />
                ) : (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E' }}>Settled Amount: {formatCurrency(settledTotalForWeek)}</Text>
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F2F2F7', borderRadius: 8 }}>
                      <Text style={{ color: '#007AFF', fontWeight: '600' }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#C7C7CC',
  },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1C1C1E' },
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  settlementCard: { marginBottom: 12 },
  settlementContent: { flexDirection: 'row', alignItems: 'center' },
  settlementInfo: { flex: 1 },
  settlementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  employeeName: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  netAmount: { fontSize: 20, fontWeight: '700', marginLeft: 12 },
  settlementDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detailLabel: { fontSize: 14, color: '#8E8E93' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  actionButton: { padding: 8, marginLeft: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1C1C1E', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
  footer: { paddingVertical: 24 },
  settleButton: { marginHorizontal: 16 },
  weekHint: { marginTop: 8, fontSize: 12, color: '#8E8E93', textAlign: 'center' },
  weekDate: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 },
  weekTotal: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  expandedSection: { marginTop: 8 },
  table: { borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingTop: 8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  th: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  td: { fontSize: 12, color: '#1C1C1E' },
  revisionRow: { marginTop: 8 },
  previewRow: { marginTop: 8 },
  previewText: { fontSize: 12, color: '#8E8E93', marginBottom: 2 },
});
