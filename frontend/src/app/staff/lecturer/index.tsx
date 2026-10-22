import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { alertService } from '../../../services/AlertManager';
import { Ionicons } from '@expo/vector-icons';

export default function LecturerDashboardScreen() {
  const router = useRouter();
  const assignedRoom = "Lab 2.2"; 

  const [telemetry, setTelemetry] = useState<any>(null);
  const [noiseData, setNoiseData] = useState<any>(null);
  const [loadingCO2, setLoadingCO2] = useState(true);
  const [loadingNoise, setLoadingNoise] = useState(true);
  const [hvacActive, setHvacActive] = useState(false);
  const [error, setError] = useState('');

  // 1. Firebase Live Data (CO2, Temp, Humidity)
  useEffect(() => {
    const docRef = doc(db, 'spaces', assignedRoom);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTelemetry(data);
        
        try {
          if (alertService && data) alertService.evaluateMicroClimate(data);
        } catch (e) {
          console.warn("AlertManager evaluation skipped.");
        }
        setLoadingCO2(false);
      } else {
        setError("Waiting for sensor data...");
        setLoadingCO2(false);
      }
    }, (err) => {
      console.error(err);
      setError("Cannot connect to Firebase");
      setLoadingCO2(false);
    });

    return () => unsubscribe();
  }, [assignedRoom]);

  // 2. Firebase Live Data (Acoustics / Noise)
  useEffect(() => {
    const acousticQuery = query(
      collection(db, 'acoustic_snapshots'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubscribeNoise = onSnapshot(acousticQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        const acousticZoneID = "zone_a"; // Backend එකේ යවන නම
        const roomAcoustic = latestData[acousticZoneID];

        if (roomAcoustic) {
          setNoiseData(roomAcoustic); 
        } else {
          setNoiseData(null);
        }
        setLoadingNoise(false);
      } else {
        setLoadingNoise(false);
      }
    }, (err) => {
      console.error("Acoustic Firebase Error:", err);
      setLoadingNoise(false);
    });

    return () => unsubscribeNoise();
  }, [assignedRoom]);

  const handleHVACControl = () => {
    const newState = !hvacActive;
    setHvacActive(newState);
    Alert.alert(
      newState ? "HVAC Activated" : "HVAC Deactivated",
      newState ? "Cooling system engaged to reduce temperature and CO₂." : "Cooling system paused to save energy.",
      [{ text: "Understood" }]
    );
  };

  const getActiveAlert = () => {
    if (!telemetry) return null;
    const ttt = parseInt(telemetry.ttt_minutes);
    
    if (!isNaN(ttt) && ttt <= 15) {
      return {
        type: 'danger',
        title: `CRITICAL: Threshold in ${ttt} mins`,
        suggestion: "Turn on HVAC Max Cooling or open windows immediately."
      };
    }
    if (noiseData?.label === 'disruptive' || telemetry.acoustic_status === 'disruptive') {
      return {
        type: 'warning',
        title: "High Acoustic Disturbance",
        suggestion: "Please manage classroom noise levels to maintain focus."
      };
    }
    return null;
  };

  const activeAlert = getActiveAlert();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header with Profile Icon */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>LECTURER PORTAL</Text>
          <Text style={styles.title}>Command Center</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/staff/lecturer/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={42} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {activeAlert && (
          <View style={[styles.alertBox, activeAlert.type === 'danger' ? styles.alertDanger : styles.alertWarning]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="warning" size={20} color={activeAlert.type === 'danger' ? '#B91C1C' : '#B45309'} style={{ marginRight: 8 }} />
              <Text style={[styles.alertTitle, activeAlert.type === 'danger' ? styles.textDanger : styles.textWarning]}>
                {activeAlert.title}
              </Text>
            </View>
            <Text style={styles.alertSuggestion}>{activeAlert.suggestion}</Text>
          </View>
        )}

        <View style={styles.roomHeaderRow}>
          <Text style={styles.sectionTitle}>Monitoring: {assignedRoom}</Text>
          {telemetry && (
            <Text style={[styles.statusBadge, { 
              backgroundColor: telemetry.status === 'SAFE' ? '#DCFCE7' : '#FEE2E2', 
              color: telemetry.status === 'SAFE' ? '#16A34A' : '#DC2626' 
            }]}>
              {telemetry.status}
            </Text>
          )}
        </View>
        
        <View style={styles.roomCard}>
          {loadingCO2 ? (
            <ActivityIndicator size="small" color="#0F172A" style={{ marginVertical: 20 }} />
          ) : error && !telemetry ? (
            <Text style={styles.infoText}>{error}</Text>
          ) : telemetry ? (
            <>
              {/* Detailed Metrics Grid for Lecturer */}
              <View style={styles.grid}>
                
                {/* CO2 */}
                <View style={styles.gridBox}>
                  <Ionicons name="cloud" size={20} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.gridValue}>{telemetry.current_co2 ? Math.round(telemetry.current_co2) : "--"}</Text>
                  <Text style={styles.gridLabel}>CO₂ (ppm)</Text>
                </View>

                {/* Temperature */}
                <View style={styles.gridBox}>
                  <Ionicons name="thermometer" size={20} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.gridValue}>{telemetry.current_temp ? telemetry.current_temp.toFixed(1) : "--"}°C</Text>
                  <Text style={styles.gridLabel}>Temp</Text>
                </View>

                {/* Humidity */}
                <View style={styles.gridBox}>
                  <Ionicons name="water" size={20} color="#64748B" style={{ marginBottom: 4 }} />
                  <Text style={styles.gridValue}>{telemetry.humidity || telemetry.current_hum ? Math.round(telemetry.humidity || telemetry.current_hum) : "--"}%</Text>
                  <Text style={styles.gridLabel}>Humidity</Text>
                </View>

                {/* Danger ETA */}
                <View style={styles.gridBox}>
                  <Ionicons name="time" size={20} color={telemetry.ttt_minutes !== "> 30" ? '#EF4444' : '#64748B'} style={{ marginBottom: 4 }} />
                  <Text style={[styles.gridValue, {color: telemetry.ttt_minutes !== "> 30" ? '#EF4444' : '#0F172A'}]}>
                    {telemetry.ttt_minutes}
                  </Text>
                  <Text style={styles.gridLabel}>Danger ETA</Text>
                </View>
              </View>

              {/* Acoustic Status Row */}
              <View style={styles.acousticRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="volume-high" size={24} color="#0F172A" style={{ marginRight: 12 }} />
                  <View>
                    <Text style={styles.acousticTitle}>Acoustic Status</Text>
                    <Text style={styles.acousticSubtitle}>Classroom Noise Level</Text>
                  </View>
                </View>
                {loadingNoise ? (
                  <ActivityIndicator size="small" color="#64748B" />
                ) : (
                  <Text style={[styles.acousticValue, { 
                    color: noiseData?.label === 'disruptive' ? '#EF4444' : '#10B981' 
                  }]}>
                    {noiseData ? noiseData.label : "Offline"}
                  </Text>
                )}
              </View>

              <View style={styles.divider} />

              <Text style={styles.controlTitle}>Environment Override</Text>
              <TouchableOpacity 
                style={[styles.actionBtn, hvacActive ? styles.actionBtnActive : styles.actionBtnInactive]} 
                onPress={handleHVACControl}
              >
                <Ionicons name="snow" size={20} color={hvacActive ? "#2563EB" : "#0F172A"} style={{ marginRight: 8 }} />
                <Text style={[styles.actionBtnText, { color: hvacActive ? "#2563EB" : "#0F172A" }]}>
                  {hvacActive ? "Pause HVAC System" : "Activate Max Cooling"}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#2563EB', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  profileBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 50 },
  
  alertBox: { padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  alertDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  alertWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  alertTitle: { fontSize: 15, fontWeight: '800' },
  textDanger: { color: '#B91C1C' },
  textWarning: { color: '#B45309' },
  alertSuggestion: { fontSize: 14, color: '#475569', fontWeight: '500', lineHeight: 22, marginTop: 4 },

  roomHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: 'hidden', textTransform: 'uppercase' },
  
  roomCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  infoText: { fontSize: 14, color: '#64748B', textAlign: 'center', padding: 20 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  gridBox: { width: '48%', backgroundColor: '#F8FAFC', paddingVertical: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 8 },
  gridValue: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  acousticRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  acousticTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  acousticSubtitle: { fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 2 },
  acousticValue: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 24 },
  
  controlTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 0.5 },
  actionBtn: { paddingVertical: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  actionBtnInactive: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  actionBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  actionBtnText: { fontSize: 15, fontWeight: '800' },
});