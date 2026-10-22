import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default function AlertsNotificationsScreen() {
  const assignedRoom = "Lab 2.2";
  const [telemetry, setTelemetry] = useState<any>(null);
  const [noiseData, setNoiseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CO2 දත්ත ලබාගැනීම
    const docRef = doc(db, 'spaces', assignedRoom);
    const unsubscribeCO2 = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setTelemetry(docSnap.data());
      setLoading(false);
    });

    // Noise දත්ත ලබාගැනීම
    const acousticQuery = query(collection(db, 'acoustic_snapshots'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeNoise = onSnapshot(acousticQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        setNoiseData(latestData["zone_a"] || null);
      }
    });

    return () => {
      unsubscribeCO2();
      unsubscribeNoise();
    };
  }, []);

  // Live Alerts සෑදීම
  const getActiveAlerts = () => {
    let alerts = [];
    if (telemetry) {
      const ttt = parseInt(telemetry.ttt_minutes);
      if (!isNaN(ttt) && ttt <= 15) {
        alerts.push({
          id: 'co2_critical',
          type: 'danger',
          title: `Critical CO₂ Threshold in ${ttt} mins`,
          time: 'Just now',
          desc: 'CO₂ levels are rising rapidly. Immediate HVAC activation required.',
          icon: 'warning'
        });
      }
    }
    if (noiseData?.label === 'disruptive' || telemetry?.acoustic_status === 'disruptive') {
      alerts.push({
        id: 'noise_warning',
        type: 'warning',
        title: 'High Acoustic Disturbance',
        time: 'Just now',
        desc: 'Classroom noise level has reached disruptive limits.',
        icon: 'volume-high'
      });
    }
    return alerts;
  };

  const activeAlerts = getActiveAlerts();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Notification Center</Text>
        <Text style={styles.subtitle}>System Alerts & Warnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Active Alerts</Text>
        
        {loading ? (
          <ActivityIndicator size="small" color="#0F172A" style={{ marginVertical: 20 }} />
        ) : activeAlerts.length > 0 ? (
          activeAlerts.map(alert => (
            <View key={alert.id} style={[styles.alertCard, alert.type === 'danger' ? styles.cardDanger : styles.cardWarning]}>
              <View style={styles.alertHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={alert.icon as any} size={20} color={alert.type === 'danger' ? '#DC2626' : '#D97706'} style={{ marginRight: 8 }} />
                  <Text style={[styles.alertTitle, alert.type === 'danger' ? styles.textDanger : styles.textWarning]}>
                    {alert.title}
                  </Text>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>
              <Text style={styles.alertDesc}>{alert.desc}</Text>
              <TouchableOpacity style={[styles.actionBtn, alert.type === 'danger' ? styles.btnDanger : styles.btnWarning]}>
                <Text style={[styles.btnText, alert.type === 'danger' ? styles.btnTextDanger : styles.btnTextWarning]}>Take Action</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.safeCard}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" style={{ marginBottom: 8 }} />
            <Text style={styles.safeTitle}>All Systems Nominal</Text>
            <Text style={styles.safeDesc}>There are no active environmental alerts for {assignedRoom}.</Text>
          </View>
        )}

        <View style={styles.divider} />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={styles.sectionTitle}>Recent Activity Log</Text>
          <Text style={styles.clearText}>Clear All</Text>
        </View>

        {/* Presentation එකට අලංකාරයක් එක් කිරීමට සාදන ලද Log History එකක් */}
        <View style={styles.historyCard}>
          <View style={styles.historyRow}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>HVAC System Paused</Text>
              <Text style={styles.historyDesc}>Temperature stabilized at 24.1°C</Text>
            </View>
            <Text style={styles.historyTime}>2 hrs ago</Text>
          </View>
          
          <View style={styles.historyRow}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>System Calibration</Text>
              <Text style={styles.historyDesc}>Acoustic sensors calibrated successfully</Text>
            </View>
            <Text style={styles.historyTime}>Yesterday</Text>
          </View>

          <View style={[styles.historyRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.historyTitle}>Moderate CO₂ Warning</Text>
              <Text style={styles.historyDesc}>Resolved after automated ventilation</Text>
            </View>
            <Text style={styles.historyTime}>Yesterday</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
  content: { padding: 24, paddingBottom: 50 },
  
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  clearText: { fontSize: 13, fontWeight: '700', color: '#3B82F6', marginBottom: 16 },
  
  alertCard: { padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cardWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '800' },
  textDanger: { color: '#B91C1C' },
  textWarning: { color: '#B45309' },
  alertTime: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  alertDesc: { fontSize: 14, color: '#334155', lineHeight: 22, marginBottom: 16, paddingLeft: 28 },
  
  actionBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start', marginLeft: 28, paddingHorizontal: 16 },
  btnDanger: { backgroundColor: '#FEE2E2' },
  btnWarning: { backgroundColor: '#FEF3C7' },
  btnText: { fontSize: 13, fontWeight: '800' },
  btnTextDanger: { color: '#DC2626' },
  btnTextWarning: { color: '#D97706' },

  safeCard: { backgroundColor: '#ECFDF5', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 16 },
  safeTitle: { fontSize: 16, fontWeight: '800', color: '#065F46', marginBottom: 4 },
  safeDesc: { fontSize: 13, color: '#047857', textAlign: 'center', fontWeight: '500' },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },

  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 12 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  historyDesc: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  historyTime: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 10 }
});