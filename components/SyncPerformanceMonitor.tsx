import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';

export const SyncPerformanceMonitor: React.FC = () => {
  const { state } = useApp();
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [lastSyncDuration, setLastSyncDuration] = useState<number | null>(null);
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    if (state.syncStatus === 'syncing' && !syncStartTime) {
      setSyncStartTime(Date.now());
    } else if (state.syncStatus === 'ok' && syncStartTime) {
      const duration = Date.now() - syncStartTime;
      setLastSyncDuration(duration);
      setSyncStartTime(null);
      setSyncCount(prev => prev + 1);
    } else if (state.syncStatus === 'error' && syncStartTime) {
      setSyncStartTime(null);
    }
  }, [state.syncStatus, syncStartTime]);

  if (!__DEV__) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sync Performance</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, {
          color: state.syncStatus === 'ok' ? '#34C759' : 
                state.syncStatus === 'error' ? '#FF3B30' : 
                state.syncStatus === 'syncing' ? '#007AFF' : '#8E8E93'
        }]}>
          {state.syncStatus}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Last Sync:</Text>
        <Text style={styles.value}>
          {lastSyncDuration ? `${lastSyncDuration}ms` : 'N/A'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Total Syncs:</Text>
        <Text style={styles.value}>{syncCount}</Text>
      </View>
      {syncStartTime && (
        <View style={styles.row}>
          <Text style={styles.label}>Current:</Text>
          <Text style={styles.value}>
            {Date.now() - syncStartTime}ms
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    minWidth: 120,
    zIndex: 1000,
  },
  title: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
  value: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
});
