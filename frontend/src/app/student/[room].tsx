import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Helper to handle local IP addresses for physical phones vs emulators
const getBackendURL = () => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000'; // Android Emulator
  if (Platform.OS === 'web') return 'http://localhost:8000'; // Web Browser
  return 'http://10.74.30.198:8000'; // YOUR EXACT WI-FI IPV4 ADDRESS
};

export default function RoomTelemetryScreen() {
  const { room, type } = useLocalSearchParams();
  const router = useRouter();
  
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch live data from your Python FastAPI Backend
    const fetchTelemetry = async () => {
      try {
        const backendUrl = getBackendURL();
        const response = await fetch(`${backendUrl}/api/telemetry?space_id=${encodeURIComponent(room as string)}`);
        
        if (!response.ok) throw new Error('Failed to fetch telemetry');
        
        const data = await response.json();
        setTelemetry(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Cannot connect to ComfortSense Python Backend.');
        setLoading(false);
      }
    };

    fetchTelemetry();
    
    // Poll the Python server every 5 seconds for live updates
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [room]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Spaces</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.badge}>{type}</Text>
        <Text style={styles.title}>{room}</Text>
      </View>

      {loading ? (
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.statusText}>Connecting to Python Analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerArea}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.statusText}>Ensure FastAPI is running on port 8000</Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Environment Status</Text>
            <Text style={[styles.statusValue, { color: telemetry.status === 'Optimal' ? '#16A34A' : '#DC2626' }]}>
              {telemetry.status}
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>🌡️</Text>
              <Text style={styles.gridValue}>{telemetry.temperature}°C</Text>
              <Text style={styles.gridLabel}>Temperature</Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>💨</Text>
              <Text style={styles.gridValue}>{telemetry.co2_ppm}</Text>
              <Text style={styles.gridLabel}>CO₂ (ppm)</Text>
            </View>

            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>👥</Text>
              <Text style={styles.gridValue}>{telemetry.occupancy}</Text>
              <Text style={styles.gridLabel}>Est. Occupancy</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backBtn: { paddingVertical: 5 },
  backBtnText: { color: '#4B5563', fontSize: 15, fontWeight: '700' },
  header: { paddingHorizontal: 20, marginBottom: 20 },
  badge: { fontSize: 11, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  errorText: { color: '#DC2626', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  content: { padding: 20 },
  statusCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  statusTitle: { fontSize: 13, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  statusValue: { fontSize: 24, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  gridBox: { width: '48%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  gridIcon: { fontSize: 24, marginBottom: 8 },
  gridValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  gridLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 4 }
});