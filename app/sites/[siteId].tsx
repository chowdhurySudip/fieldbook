import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/dates';

// Simple local type for site withdrawals stored in payment history
// type: 'site-withdrawal', employeeId will be empty, settlementWeek unused

export default function SiteDetailScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const { state, actions } = useApp();
  const site = state.sites.find(s => s.id === siteId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const withdrawals = useMemo(() => {
    return (state.paymentHistory || [])
      .filter((h: any) => h.type === 'site-withdrawal' && h.siteId === siteId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [state.paymentHistory, siteId, refresh]);

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

  if (!site) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Card title={site.name}>
          <Text style={styles.subtitle}>Total Withdrawn: {formatCurrency(site.totalWithdrawn || 0)}</Text>
        </Card>

        <Card title="Add Withdrawal" style={{ marginTop: 12 }}>
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

        <Card title="Past Withdrawals" style={{ marginTop: 12 }}>
          <FlatList
            data={withdrawals}
            keyExtractor={(item: any) => item.id}
            renderItem={({ item }: any) => (
              <View style={styles.row}>
                <Text style={styles.rowLeft}>{formatDate(new Date(item.date))}</Text>
                <Text style={styles.rowRight}>{formatCurrency(item.amount)}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: '#8E8E93' }}>No withdrawals yet</Text>}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F2F2F7' },
  container: { flex: 1, backgroundColor: '#F2F2F7', padding: 16 },
  subtitle: { marginTop: 4, color: '#8E8E93' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLeft: { color: '#1C1C1E' },
  rowRight: { color: '#1C1C1E', fontWeight: '600' },
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
