import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, InputField } from '../../components';
import { useApp } from '../../context/AppContext';
import { Site } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import { formatDate } from '../../utils/dates';

export default function SitesScreen() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSites = state.sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeSites = filteredSites.filter(site => site.isActive);
  const inactiveSites = filteredSites.filter(site => !site.isActive);

  const renderSiteCard = (site: Site) => {
    // Calculate employee count for this site
    const employeeCount = state.attendanceRecords.filter(record => 
      record.siteId === site.id && record.isPresent
    ).length;

    const recentActivity = state.attendanceRecords
      .filter(record => record.siteId === site.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 1)[0];

    return (
      <TouchableOpacity
        key={site.id}
        onPress={() => router.push({ pathname: '/sites/[siteId]' as any, params: { siteId: site.id } })}
        activeOpacity={0.7}
      >
        <Card style={styles.siteCard}>
          <View style={styles.siteContent}>
            <View style={styles.siteInfo}>
              <View style={styles.siteHeader}>
                <Text style={styles.siteName}>{site.name}</Text>
                <View style={styles.headerActions}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: site.isActive ? '#34C759' : '#8E8E93' }
                  ]}>
                    <Text style={styles.statusText}>
                      {site.isActive ? 'Active' : 'Completed'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push({ pathname: '/sites/edit' as any, params: { siteId: site.id } });
                    }}
                    accessibilityLabel={`Edit ${site.name}`}
                  >
                    <Ionicons name="create-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.siteDate}>
                Started: {formatDate(new Date(site.startDate))}
              </Text>
              
              <View style={styles.siteStats}>
                <Text style={styles.statText}>
                  Total Withdrawn: {formatCurrency(site.totalWithdrawn)}
                </Text>
                <Text style={styles.statText}>
                  Workers Assigned: {employeeCount}
                </Text>
              </View>

              {recentActivity && (
                <Text style={styles.lastActivity}>
                  Last Activity: {formatDate(new Date(recentActivity.date))}
                </Text>
              )}

              <View style={styles.quickActions}>
                <Button 
                  title="Add Withdrawal" 
                  onPress={() => {
                    // Navigate to site detail with withdrawal focus
                    router.push({ pathname: '/sites/[siteId]' as any, params: { siteId: site.id } });
                  }}
                  style={styles.withdrawalButton}
                />
                <Text style={styles.tapHint}>Tap card for details</Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title} ({count})</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header with Add Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Construction Sites</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('../sites/add')}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <InputField
            label=""
            placeholder="Search sites..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Sites List */}
        <FlatList
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {activeSites.length > 0 && (
                <>
                  {renderSectionHeader('Active Sites', activeSites.length)}
                  {activeSites.map(site => renderSiteCard(site))}
                </>
              )}
              
              {inactiveSites.length > 0 && (
                <>
                  {renderSectionHeader('Completed Sites', inactiveSites.length)}
                  {inactiveSites.map(site => renderSiteCard(site))}
                </>
              )}
            </View>
          }
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={
            filteredSites.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={64} color="#C7C7CC" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No sites found' : 'No construction sites'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery 
                    ? 'Try adjusting your search' 
                    : 'Add your first construction site to get started'
                  }
                </Text>
                {!searchQuery && (
                  <Button
                    title="Add Site"
                    onPress={() => router.push('../sites/add')}
                    style={{ marginTop: 12 }}
                  />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  siteCard: {
    marginBottom: 12,
  },
  siteContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteInfo: {
    flex: 1,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  editButton: {
    padding: 4,
    marginLeft: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  siteDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  siteStats: {
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  lastActivity: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  quickActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawalButton: {
    flex: 1,
    marginRight: 8,
  },
  tapHint: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
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
  },
});
