import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function LecturerProfileScreen() {
  const router = useRouter();
  const lecturerEmail = auth.currentUser?.email || 'Lecturer';

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{lecturerEmail.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.roleText}>Faculty Member</Text>
          <Text style={styles.emailText}>{lecturerEmail}</Text>
        </View>

        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={20} color="#475569" style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Update Alert Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="lock-closed-outline" size={20} color="#475569" style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out Securely</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  content: { padding: 24 },
  
  profileCard: { backgroundColor: '#FFFFFF', padding: 32, borderRadius: 20, alignItems: 'center', shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, marginBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, color: '#FFFFFF', fontWeight: '900' },
  roleText: { fontSize: 12, fontWeight: '800', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  emailText: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5, paddingLeft: 4 },
  
  settingsGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 32 },
  settingItem: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  
  logoutBtn: { backgroundColor: '#FEF2F2', paddingVertical: 16, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#DC2626' }
});