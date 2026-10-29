import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function StudentProfileScreen() {
  const router = useRouter();
  
  // පරිශීලකයෙක් ලොග් වී ඇත්දැයි පරීක්ෂා කිරීම
  const user = auth.currentUser;
  const studentEmail = user?.email || 'Guest Student';
  const isLoggedIn = !!user; // user කෙනෙක් ඉන්නවා නම් true

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to securely log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => {
          await signOut(auth);
          router.replace('/' as any);
      }}
    ]);
  };

  const handleLogin = () => {
    // Login තිරය වෙත යොමු කිරීම (Login page එකේ route එක මෙහි දෙන්න)
    router.replace('/' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account Center</Text>
      </View>

      <View style={styles.content}>
        
        {/* User Identity Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, !isLoggedIn && { backgroundColor: '#64748B' }]}>
            <Text style={styles.avatarText}>
              {isLoggedIn ? studentEmail.charAt(0).toUpperCase() : <Ionicons name="person" size={32} color="#FFFFFF" />}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roleText, !isLoggedIn && { color: '#64748B' }]}>
              {isLoggedIn ? 'Undergraduate Student' : 'Unregistered User'}
            </Text>
            <Text style={styles.emailText}>{studentEmail}</Text>
            
            {/* Status Badge */}
            <View style={[styles.activeBadge, !isLoggedIn && { backgroundColor: '#F1F5F9' }]}>
              <View style={[styles.activeDot, !isLoggedIn && { backgroundColor: '#94A3B8' }]} />
              <Text style={[styles.activeText, !isLoggedIn && { color: '#475569' }]}>
                {isLoggedIn ? 'Active Session' : 'Guest Mode'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingItem} disabled={!isLoggedIn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: isLoggedIn ? 1 : 0.5 }}>
              <Ionicons name="bookmark" size={20} color="#64748B" style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Saved Study Spaces</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]} disabled={!isLoggedIn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: isLoggedIn ? 1 : 0.5 }}>
              <Ionicons name="notifications" size={20} color="#64748B" style={{ marginRight: 12 }} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Authentication Actions (Dynamic) */}
        <Text style={styles.sectionTitle}>Authentication</Text>
        
        {isLoggedIn ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.logoutText}>Sign Out Securely</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Ionicons name="log-in" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.loginText}>Sign In / Register</Text>
          </TouchableOpacity>
        )}
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  content: { padding: 24 },
  
  profileCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, alignItems: 'center', shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 28, color: '#FFFFFF', fontWeight: '900' },
  roleText: { fontSize: 11, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  emailText: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  activeText: { fontSize: 10, fontWeight: '700', color: '#065F46' },
  
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5, paddingLeft: 4 },
  
  settingsGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 32, borderWidth: 1, borderColor: '#F1F5F9' },
  settingItem: { padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingText: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  
  logoutBtn: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },

  loginBtn: { backgroundColor: '#2563EB', paddingVertical: 18, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }
});