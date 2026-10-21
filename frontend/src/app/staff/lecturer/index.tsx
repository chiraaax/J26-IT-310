import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';

// 1. Import your modular components and services
import { alertService } from '../../../services/AlertManager';
import CO2Trend from './CO2Trend';

const getBackendURL = () => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  if (Platform.OS === 'web') return 'http://localhost:8000';
  return 'http://10.74.30.198:8000'; 
};

export default function LecturerDashboardScreen() {
  const router = useRouter();
  const userEmail = auth.currentUser?.email || 'Lecturer';
  
  const assignedRoom = "F301 Lecture hall"; 

  const [telemetry, setTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hvacActive, setHvacActive] = useState(false);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const backendUrl = getBackendURL();
        const response = await fetch(`${backendUrl}/api/telemetry?space_id=${encodeURIComponent(assignedRoom)}`);
        
        if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
          
          // 2. Pass live data to the separated Alert module to trigger audio/visual warnings
          alertService.evaluateMicroClimate(data);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/' as any);
  };

  const handleHVACControl = () => {
    const newState = !hvacActive;
    setHvacActive(newState);
    
    Alert.alert(
      newState ? "HVAC Activated" : "HVAC Deactivated",
      newState 
        ? "Cooling system engaged. The room temperature will begin decreasing shortly." 
        : "Cooling system paused to save energy.",
      [{ text: "Understood" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>LECTURER PORTAL</Text>
          <Text style={styles.title}>My Classroom</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.emailText}>{userEmail}</Text>
        </View>

        <Text style={styles.sectionTitle}>Assigned Room: {assignedRoom}</Text>
        
        <View style={styles.roomCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.roomName}>Live Environment</Text>
            {telemetry && (
              <Text style={[styles.statusBadge, { backgroundColor: telemetry.status === 'Optimal' ? '#DCFCE7' : '#FEE2E2', color: telemetry.status === 'Optimal' ? '#16A34A' : '#DC2626' }]}>
                {telemetry.status}
              </Text>
            )}
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
          ) : !telemetry ? (
            <Text style={styles.infoText}>Unable to connect to room sensors.</Text>
          ) : (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{telemetry.temperature}°C</Text>
                  <Text style={styles.statLabel}>Temp</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{telemetry.co2_ppm}</Text>
                  <Text style={styles.statLabel}>CO₂ ppm</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{telemetry.occupancy}</Text>
                  <Text style={styles.statLabel}>Students</Text>
                </View>
              </View>

              {/* 3. Render the separated Trend UI Component */}
              <CO2Trend />

              <View style={styles.divider} />

              <Text style={styles.controlTitle}>Classroom Controls</Text>
              <TouchableOpacity 
                style={[styles.actionBtn, hvacActive ? styles.actionBtnActive : styles.actionBtnInactive]} 
                onPress={handleHVACControl}
              >
                <Text style={styles.actionBtnText}>
                  {hvacActive ? "⏸ Pause HVAC System" : "❄️ Activate Max Cooling"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  topHeader: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#2563EB', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  content: { padding: 20 },
  welcomeCard: { marginBottom: 24 },
  welcomeText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  emailText: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  roomCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  roomName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  infoText: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  controlTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  actionBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  actionBtnInactive: { backgroundColor: '#FFFFFF', borderColor: '#111827' },
  actionBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  actionBtnText: { color: '#111827', fontSize: 14, fontWeight: '700' },
});