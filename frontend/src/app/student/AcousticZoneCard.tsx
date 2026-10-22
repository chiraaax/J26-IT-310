import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface AcousticZoneProps {
  zone_id: string;
  label: string; // 'silence', 'ambient', 'disruptive'
  confidence: number;
  disruption_score: number;
  isBest: boolean;
}

export default function AcousticZoneCard({ zone_id, label, confidence, disruption_score, isBest }: AcousticZoneProps) {
  // Map the ML labels to colors and icons
  const getStatus = () => {
    switch (label) {
      case 'silence': return { bg: '#DCFCE7', text: '#15803D', bar: '#22C55E', icon: '🤫' };
      case 'ambient': return { bg: '#FEF3C7', text: '#B45309', bar: '#F59E0B', icon: '💬' };
      case 'disruptive': return { bg: '#FEE2E2', text: '#B91C1C', bar: '#EF4444', icon: '📢' };
      default: return { bg: '#F3F4F6', text: '#4B5563', bar: '#9CA3AF', icon: '❓' };
    }
  };

  const status = getStatus();
  const displayName = zone_id.replace('_', ' ').toUpperCase();

  return (
    <View style={[styles.card, isBest && styles.cardBest]}>
      {isBest && <Text style={styles.bestBadge}>🏆 QUIETEST</Text>}
      
      <View style={styles.topRow}>
        <Text style={styles.zoneName}>{displayName}</Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.text }]}>
            {status.icon} {label.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreValue}>{disruption_score}</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      
      {/* Visual Progress Bar */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${disruption_score}%`, backgroundColor: status.bar }]} />
      </View>

      <Text style={styles.confidence}>ML Confidence: {(confidence * 100).toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    width: 170,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    justifyContent: 'space-between',
  },
  cardBest: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: '#EFF6FF',
  },
  bestBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  zoneName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  scoreValue: { fontSize: 28, fontWeight: '900', color: '#111827' },
  scoreLabel: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 },
  barBackground: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidence: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
});