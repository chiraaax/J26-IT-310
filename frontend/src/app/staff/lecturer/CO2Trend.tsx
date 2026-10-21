import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CO2Trend() {
  // Temporary mock data representing the last 5 readings. 
  // This will be replaced by your Firebase/Python historical data array later.
  const mockTrendData = [410, 450, 520, 680, 750];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CO₂ Trend (Last 30 mins)</Text>
      
      <View style={styles.chartContainer}>
        {mockTrendData.map((value, index) => {
          // Calculate height relative to a 1000ppm maximum threshold
          const heightPercent = Math.min((value / 1000) * 100, 100);
          // Turn the bar red if CO2 is getting dangerously high
          const isWarning = value >= 700;

          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={styles.barLabel}>{value}</Text>
              <View 
                style={[
                  styles.bar, 
                  { height: `${heightPercent}%`, backgroundColor: isWarning ? '#F87171' : '#60A5FA' }
                ]} 
              />
            </View>
          );
        })}
      </View>
      
      <Text style={styles.footerText}>*Simulated trend data. Pending backend integration.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', marginBottom: 16 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, paddingHorizontal: 10 },
  barWrapper: { alignItems: 'center', width: 40, height: '100%', justifyContent: 'flex-end' },
  barLabel: { fontSize: 10, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  bar: { width: 24, borderRadius: 4, minHeight: 4 },
  footerText: { fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginTop: 16, textAlign: 'center' }
});