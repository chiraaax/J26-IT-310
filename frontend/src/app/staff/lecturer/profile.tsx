import React from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '../../../config/firebase';

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
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>L</Text></View>
          <Text style={styles.roleText}>Faculty Member</Text>
          <Text style={styles.emailText}>{lecturerEmail}</Text>
        </View>

        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Update Alert Preferences</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, styles.logoutItem]} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E5E7EB' },
  backBtn: { fontSize: 16, color: '#4B5563', fontWeight: '600', marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { padding: 20 },
  profileCard: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, color: '#FFFFFF', fontWeight: '800' },
  roleText: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
  emailText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  settingsGroup: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  settingItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  settingText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  logoutItem: { borderBottomWidth: 0, backgroundColor: '#FEF2F2' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#DC2626' }
});