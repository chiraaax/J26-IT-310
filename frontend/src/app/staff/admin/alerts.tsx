import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default function AdminAlertsScreen() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local states to track read and deleted alerts during the session
  const [readAlerts, setReadAlerts] = useState<string[]>([]);
  const [deletedAlerts, setDeletedAlerts] = useState<string[]>([]);

  useEffect(() => {
    const spacesRef = collection(db, 'spaces');
    const unsubscribe = onSnapshot(spacesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpaces(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getGlobalAlerts = () => {
    let alerts: any[] = [];
    spaces.forEach(space => {
      const ttt = parseInt(space.ttt_minutes);
      
      // CO2 Danger Alert
      if (!isNaN(ttt) && ttt <= 15) {
        alerts.push({ id: space.id + '_co2', room: space.id, type: 'danger', title: 'Critical CO₂ Threshold', desc: `CO₂ levels rising rapidly. Threshold in ${ttt} mins.`, icon: 'warning' });
      } else if (space.status === 'CRITICAL') {
        alerts.push({ id: space.id + '_crit', room: space.id, type: 'danger', title: 'Status: CRITICAL', desc: `Environment unsafe. Immediate action required.`, icon: 'alert-circle' });
      }

      // Noise Alert
      if (space.acoustic_status === 'disruptive') {
        alerts.push({ id: space.id + '_noise', room: space.id, type: 'warning', title: 'High Noise Disturbance', desc: 'Acoustic levels are highly disruptive.', icon: 'volume-high' });
      }
    });

    // Filter out deleted alerts
    return alerts.filter(alert => !deletedAlerts.includes(alert.id));
  };

  const handleMarkAsRead = (id: string) => {
    if (!readAlerts.includes(id)) {
      setReadAlerts([...readAlerts, id]);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Dismiss Alert", "Are you sure you want to dismiss this alert?", [
      { text: "Cancel", style: "cancel" },
      { text: "Dismiss", style: "destructive", onPress: () => {
          setDeletedAlerts([...deletedAlerts, id]);
      }}
    ]);
  };

  const markAllAsRead = () => {
    const activeIds = getGlobalAlerts().map(a => a.id);
    setReadAlerts([...new Set([...readAlerts, ...activeIds])]);
  };

  const activeAlerts = getGlobalAlerts();
  const unreadCount = activeAlerts.filter(a => !readAlerts.includes(a.id)).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>GLOBAL MONITORING</Text>
          <Text style={styles.title}>System Alerts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Campus-Wide Warnings <Text style={styles.countBadge}>({unreadCount} Unread)</Text></Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : activeAlerts.length > 0 ? (
          activeAlerts.map(alert => {
            const isRead = readAlerts.includes(alert.id);
            return (
              <View 
                key={alert.id} 
                style={[
                  styles.alertCard, 
                  alert.type === 'danger' ? styles.cardDanger : styles.cardWarning,
                  isRead && styles.cardRead // Dim opacity if read
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name={alert.icon as any} size={20} color={alert.type === 'danger' ? '#DC2626' : '#D97706'} style={{ marginRight: 8 }} />
                    <Text style={[styles.alertTitle, alert.type === 'danger' ? styles.textDanger : styles.textWarning]}>
                      {alert.title}
                    </Text>
                  </View>
                  
                  {/* Action Icons (Read & Delete) */}
                  <View style={styles.actionRow}>
                    <Text style={styles.roomBadge}>{alert.room}</Text>
                    {!isRead && (
                      <TouchableOpacity onPress={() => handleMarkAsRead(alert.id)} style={styles.iconBtn}>
                        <Ionicons name="checkmark-done-circle" size={24} color="#16A34A" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(alert.id)} style={styles.iconBtn}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.alertDesc}>{alert.desc}</Text>
              </View>
            )
          })
        ) : (
          <View style={styles.safeCard}>
            <Ionicons name="shield-checkmark" size={40} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.safeTitle}>All Campus Zones Safe</Text>
            <Text style={styles.safeDesc}>No critical environmental warnings detected across any monitored rooms.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  badge: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  content: { padding: 24, paddingBottom: 50 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { color: '#0F172A' },
  markAllText: { fontSize: 12, fontWeight: '700', color: '#3B82F6' },
  
  alertCard: { padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  cardWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  cardRead: { opacity: 0.6, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  alertTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  textDanger: { color: '#B91C1C' },
  textWarning: { color: '#B45309' },
  
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  roomBadge: { fontSize: 11, fontWeight: '800', backgroundColor: '#0F172A', color: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
  iconBtn: { padding: 2, marginLeft: 4 },
  
  alertDesc: { fontSize: 14, color: '#334155', lineHeight: 22, marginTop: 4, paddingLeft: 28 },

  safeCard: { backgroundColor: '#ECFDF5', padding: 30, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0', marginTop: 20 },
  safeTitle: { fontSize: 18, fontWeight: '800', color: '#065F46', marginBottom: 6 },
  safeDesc: { fontSize: 14, color: '#047857', textAlign: 'center', fontWeight: '500', lineHeight: 22 },
});