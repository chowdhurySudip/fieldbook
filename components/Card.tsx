// Card component for displaying content in sections

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle;
  padding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  style,
  padding = true
}) => {
  return (
    <View style={[styles.card, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={padding ? styles.content : undefined}>
        {children}
      </View>
    </View>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  color = '#007AFF',
  style
}) => {
  return (
    <Card style={StyleSheet.flatten([styles.statCard, style])} padding={false}>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  content: {
    padding: 16,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statContent: {
    padding: 16,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
