import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SensorProps {
  title: string;
  value: number | string;
  unit: string;
  icon: string;
  status: 'Good' | 'Fair' | 'Poor';
}

export default function StudentSensorCard({ title, value, unit, icon, status }: SensorProps) {
  const badgeColor =
    status === 'Good' ? '#DCFCE7' : status === 'Fair' ? '#FEF3C7' : '#FEE2E2';
  const textColor =
    status === 'Good' ? '#15803D' : status === 'Fair' ? '#B45309' : '#B91C1C';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>{status}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>
        {value} <Text style={styles.unit}>{unit}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 22 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '800', color: '#111827' },
  unit: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
});