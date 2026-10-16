import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function AdminDashboardScreen() {
  const router = useRouter();

  // Tab switcher inside Admin panel: 'spaces' or 'lecturers'
  const [activeTab, setActiveTab] = useState<'spaces' | 'lecturers'>('spaces');

  // Space Form State
  const [spaceName, setSpaceName] = useState('');
  const [spaceType, setSpaceType] = useState('Classroom');
  const [capacity, setCapacity] = useState('');

  // Lecturer Form State
  const [lecturerName, setLecturerName] = useState('');
  const [lecturerEmail, setLecturerEmail] = useState('');
  const [lecturerPass, setLecturerPass] = useState('');
  const [assignedRoom, setAssignedRoom] = useState('');

  // In-memory lists for UI testing
  const [spacesList, setSpacesList] = useState([
    { name: 'Lecture Hall A', type: 'Classroom', capacity: '120' },
    { name: 'Lab 02', type: 'Lab', capacity: '40' },
  ]);

  const [lecturerList, setLecturerList] = useState([
    { name: 'Dr. Perera', email: 'perera@campus.lk', room: 'Lecture Hall A' },
  ]);

  const handleAddSpace = () => {
    if (!spaceName.trim() || !capacity.trim()) {
      alert('Please fill in both space name and capacity.');
      return;
    }
    setSpacesList([...spacesList, { name: spaceName, type: spaceType, capacity }]);
    setSpaceName('');
    setCapacity('');
    alert(`Success: "${spaceName}" added to campus directory.`);
  };

  const handleCreateLecturer = () => {
    if (!lecturerName.trim() || !lecturerEmail.trim() || !lecturerPass.trim()) {
      alert('Please provide lecturer name, email, and password.');
      return;
    }
    setLecturerList([
      ...lecturerList,
      { name: lecturerName, email: lecturerEmail, room: assignedRoom || 'Unassigned' },
    ]);
    setLecturerName('');
    setLecturerEmail('');
    setLecturerPass('');
    setAssignedRoom('');
    alert(`Account created for ${lecturerName}.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>ADMINISTRATION</Text>
          <Text style={styles.title}>System Control</Text>
        </View>
        <TouchableOpacity onPress={() => router.replace('/' as any)} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'spaces' && styles.tabItemActive]}
          onPress={() => setActiveTab('spaces')}
        >
          <Text style={[styles.tabLabel, activeTab === 'spaces' && styles.tabLabelActive]}>
            🏫 Physical Spaces
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'lecturers' && styles.tabItemActive]}
          onPress={() => setActiveTab('lecturers')}
        >
          <Text style={[styles.tabLabel, activeTab === 'lecturers' && styles.tabLabelActive]}>
            👨‍🏫 Lecturer Accounts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'spaces' ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Add New Physical Space</Text>

              <Text style={styles.inputLabel}>Space Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Science Block Room 301"
                value={spaceName}
                onChangeText={setSpaceName}
              />

              <Text style={styles.inputLabel}>Space Type</Text>
              <View style={styles.typeRow}>
                {['Classroom', 'Lab', 'Common Area'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typePill, spaceType === t && styles.typePillActive]}
                    onPress={() => setSpaceType(t)}
                  >
                    <Text style={[styles.typeText, spaceType === t && styles.typeTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Max Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 60"
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />

              <TouchableOpacity style={styles.actionBtn} onPress={handleAddSpace}>
                <Text style={styles.actionBtnText}>+ Register Space</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subHeading}>Registered Spaces ({spacesList.length})</Text>
            {spacesList.map((item, idx) => (
              <View key={idx} style={styles.listItem}>
                <View>
                  <Text style={styles.itemTitle}>{item.name}</Text>
                  <Text style={styles.itemSub}>{item.type} • Capacity: {item.capacity}</Text>
                </View>
                <Text style={styles.itemTag}>Active</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Provision Lecturer Account</Text>

              <Text style={styles.inputLabel}>Lecturer Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Dr. K. Silva"
                value={lecturerName}
                onChangeText={setLecturerName}
              />

              <Text style={styles.inputLabel}>Email / Login Username</Text>
              <TextInput
                style={styles.input}
                placeholder="silva@campus.lk"
                autoCapitalize="none"
                value={lecturerEmail}
                onChangeText={setLecturerEmail}
              />

              <Text style={styles.inputLabel}>Initial Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={lecturerPass}
                onChangeText={setLecturerPass}
              />

              <Text style={styles.inputLabel}>Assigned Room (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Lab 02"
                value={assignedRoom}
                onChangeText={setAssignedRoom}
              />

              <TouchableOpacity style={styles.actionBtn} onPress={handleCreateLecturer}>
                <Text style={styles.actionBtnText}>+ Create Lecturer Credentials</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.subHeading}>Active Lecturers ({lecturerList.length})</Text>
            {lecturerList.map((lec, idx) => (
              <View key={idx} style={styles.listItem}>
                <View>
                  <Text style={styles.itemTitle}>{lec.name}</Text>
                  <Text style={styles.itemSub}>{lec.email} • {lec.room}</Text>
                </View>
                <Text style={styles.itemTag}>Provisioned</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  badge: { fontSize: 10, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '900', color: '#111827' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#111827' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabLabelActive: { color: '#111827', fontWeight: '700' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typePill: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8 },
  typePillActive: { backgroundColor: '#111827' },
  typeText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  typeTextActive: { color: '#FFFFFF' },
  actionBtn: { backgroundColor: '#111827', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  subHeading: { fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
  listItem: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemTag: { fontSize: 11, fontWeight: '700', color: '#16A34A', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
});