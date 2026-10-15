import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';

export default function LecturerDashboardScreen() {
  const router = useRouter();
  // Fetch the email of the currently logged-in user
  const userEmail = auth.currentUser?.email || 'Lecturer';

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/' as any);
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

        <Text style={styles.sectionTitle}>Assigned Room Status</Text>
        
        <View style={styles.roomCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.roomName}>Lecture Hall A</Text>
            <Text style={styles.statusBadge}>Live</Text>
          </View>
          
          <Text style={styles.infoText}>Your classroom environment is currently optimal for teaching. The automated HVAC system is maintaining a comfortable temperature.</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>22°C</Text>
              <Text style={styles.statLabel}>Temp</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>520</Text>
              <Text style={styles.statLabel}>CO₂ ppm</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>45</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Adjust HVAC Settings</Text>
          </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  roomName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statusBadge: { backgroundColor: '#DCFCE7', color: '#16A34A', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  infoText: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  actionBtn: { backgroundColor: '#111827', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});