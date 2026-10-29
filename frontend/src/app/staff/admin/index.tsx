import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // --- Management Modal States ---
  const [isModalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    const spacesRef = collection(db, 'spaces');
    const unsubscribe = onSnapshot(spacesRef, (snapshot) => {
      const spacesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpaces(spacesData); 
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getCategory = (id: string) => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('lab')) return 'Lab';
    if (lowerId.includes('hall') || lowerId.includes('class')) return 'Classroom';
    return 'Study Area';
  };

  // --- Statistics Calculations ---
  const totalSpaces = spaces.length;
  const labCount = spaces.filter(s => getCategory(s.id) === 'Lab').length;
  const classCount = spaces.filter(s => getCategory(s.id) === 'Classroom').length;
  const studyCount = spaces.filter(s => getCategory(s.id) === 'Study Area').length;

  const calculateComfort = (space: any) => {
    let score = 100;
    if (space.current_co2 > 1500) score -= 30;
    else if (space.current_co2 > 1200) score -= 15;
    else if (space.current_co2 > 1000) score -= 5;
    
    if (space.status === "CRITICAL") score -= 15;
    else if (space.status === "OPEN SOON") score -= 5;

    if (space.acoustic_status === 'disruptive') score -= 25;
    else if (space.acoustic_status === 'ambient') score -= 10;
    
    return Math.max(0, score);
  };

  const filteredSpaces = spaces.filter(space => {
    const typeMatch = typeFilter === 'All' || getCategory(space.id) === typeFilter;
    const score = calculateComfort(space);
    let statusMatch = true;
    if (statusFilter === 'Good') statusMatch = score >= 80;
    if (statusFilter === 'Warning') statusMatch = score < 80 && score >= 50;
    if (statusFilter === 'Critical') statusMatch = score < 50;
    return typeMatch && statusMatch;
  });

  // --- CRUD Operations ---
  const handleSaveSpace = async () => {
    if (!roomName.trim()) {
      Alert.alert("Error", "Room name cannot be empty.");
      return;
    }
    try {
      if (editingId) {
        // අලුත් ID එකක් නම් පරණ එක මකා අලුත් එක සෑදිය යුතුය (Firestore Document ID වෙනස් කළ නොහැකි බැවින්)
        if (editingId !== roomName.trim()) {
          const oldData = spaces.find(s => s.id === editingId);
          await deleteDoc(doc(db, 'spaces', editingId));
          await setDoc(doc(db, 'spaces', roomName.trim()), { ...oldData, id: roomName.trim() });
        }
        Alert.alert("Success", "Space updated successfully.");
      } else {
        // Add New Space (Default Values)
        await setDoc(doc(db, 'spaces', roomName.trim()), {
          current_co2: 400,
          current_temp: 24.0,
          status: "SAFE",
          ttt_minutes: "> 30",
          acoustic_status: "ambient"
        });
        Alert.alert("Success", "New space added successfully.");
      }
      setModalVisible(false);
      setRoomName('');
      setEditingId(null);
    } catch (error) {
      Alert.alert("Error", "Could not save the space.");
    }
  };

  const handleDeleteSpace = (id: string) => {
    Alert.alert("Delete Space", `Are you sure you want to delete ${id}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await deleteDoc(doc(db, 'spaces', id));
      }}
    ]);
  };

  const openEditModal = (id: string) => {
    setEditingId(id);
    setRoomName(id);
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setRoomName('');
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>ADMIN PORTAL</Text>
          <Text style={styles.title}>Campus Analytics</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/staff/admin/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={42} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* --- SUMMARY STATISTICS --- */}
        <View style={styles.statsContainer}>
          <View style={styles.statBoxMain}>
            <Text style={styles.statNumMain}>{totalSpaces}</Text>
            <Text style={styles.statLabelMain}>Total Spaces</Text>
          </View>
          <View style={styles.statBoxRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{classCount}</Text>
              <Text style={styles.statLabel}>Classrooms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{labCount}</Text>
              <Text style={styles.statLabel}>Labs</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{studyCount}</Text>
              <Text style={styles.statLabel}>Study Areas</Text>
            </View>
          </View>
        </View>

        {/* --- MANAGEMENT BUTTON --- */}
        <TouchableOpacity style={styles.manageBtn} onPress={openAddModal}>
          <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.manageBtnText}>Add New Campus Space</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Filter by Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['All', 'Classroom', 'Lab', 'Study Area'].map((cat) => (
            <TouchableOpacity key={cat} style={[styles.filterBtn, typeFilter === cat && styles.filterBtnActive]} onPress={() => setTypeFilter(cat)}>
              <Text style={[styles.filterText, typeFilter === cat && styles.filterTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Filter by Status</Text>
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          {['All', 'Good', 'Warning', 'Critical'].map((stat) => (
            <TouchableOpacity key={stat} style={[styles.statusBtn, statusFilter === stat && styles.statusBtnActive]} onPress={() => setStatusFilter(stat)}>
              <Text style={[styles.statusText, statusFilter === stat && styles.statusTextActive]}>{stat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : filteredSpaces.length === 0 ? (
          <Text style={styles.infoText}>No spaces found matching criteria.</Text>
        ) : (
          filteredSpaces.map((space) => {
            const score = calculateComfort(space);
            const isCritical = score < 50;
            return (
              <View key={space.id} style={[styles.spaceCard, isCritical && { borderColor: '#FECACA', borderWidth: 2 }]}>
                
                {/* Clickable Area for Navigation */}
                <TouchableOpacity onPress={() => router.push({ pathname: '/staff/admin/room/[id]', params: { id: space.id } } as any)}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.spaceName}>{space.id}</Text>
                      <Text style={styles.spaceType}>{getCategory(space.id)}</Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#ECFDF5' : score >= 50 ? '#FFFBEB' : '#FEF2F2' }]}>
                      <Text style={[styles.scoreText, { color: score >= 80 ? '#10B981' : score >= 50 ? '#D97706' : '#EF4444' }]}>
                        {score}/100
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricValue}>{space.current_co2 ? Math.round(space.current_co2) : '--'}</Text>
                      <Text style={styles.metricLabel}>CO₂ (ppm)</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={styles.metricValue}>{space.current_temp ? space.current_temp.toFixed(1) : '--'}°C</Text>
                      <Text style={styles.metricLabel}>Temp</Text>
                    </View>
                    <View style={styles.metricBox}>
                      <Text style={[styles.metricValue, {color: space.ttt_minutes !== '> 30' ? '#EF4444' : '#0F172A'}]}>{space.ttt_minutes || '--'}</Text>
                      <Text style={styles.metricLabel}>Danger ETA</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Edit & Delete Action Row */}
                <View style={styles.adminActionRow}>
                  <TouchableOpacity style={styles.actionBtnEdit} onPress={() => openEditModal(space.id)}>
                    <Ionicons name="create-outline" size={16} color="#3B82F6" style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnTextEdit}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnDel} onPress={() => handleDeleteSpace(space.id)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.actionBtnTextDel}>Delete</Text>
                  </TouchableOpacity>
                </View>
                
              </View>
            )
          })
        )}
      </ScrollView>

      {/* --- ADD / EDIT MODAL --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Campus Space' : 'Add New Space'}</Text>
            
            <Text style={styles.inputLabel}>Space Name / ID (e.g., Lab 2.2)</Text>
            <TextInput 
              style={styles.textInput}
              value={roomName}
              onChangeText={setRoomName}
              placeholder="Enter space identifier..."
              placeholderTextColor="#94A3B8"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveSpace}>
                <Text style={styles.modalBtnTextSave}>Save Space</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  badge: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  profileBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 50 },
  
  // Stats Styles
  statsContainer: { marginBottom: 16 },
  statBoxMain: { backgroundColor: '#0F172A', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  statNumMain: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  statLabelMain: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
  statBoxRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#16A34A' },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginTop: 2 },

  // Manage Button
  manageBtn: { backgroundColor: '#16A34A', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12, marginBottom: 20 },
  manageBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  filterScroll: { flexDirection: 'row', marginBottom: 20 },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#16A34A', borderColor: '#15803D' },
  filterText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTextActive: { color: '#FFFFFF' },
  statusBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginHorizontal: 4, borderRadius: 8 },
  statusBtnActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  statusText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  statusTextActive: { color: '#FFFFFF' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 24 },
  infoText: { color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  
  spaceCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  spaceName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  spaceType: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  scoreText: { fontSize: 14, fontWeight: '900' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metricBox: { alignItems: 'center', flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 10, marginHorizontal: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },

  // Admin Actions
  adminActionRow: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  actionBtnEdit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  actionBtnTextEdit: { color: '#3B82F6', fontSize: 12, fontWeight: '700' },
  actionBtnDel: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionBtnTextDel: { color: '#EF4444', fontSize: 12, fontWeight: '700' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 20, textAlign: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  textInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, fontSize: 16, color: '#0F172A', fontWeight: '600', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtnCancel: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  modalBtnTextCancel: { color: '#64748B', fontSize: 14, fontWeight: '800' },
  modalBtnSave: { flex: 1, backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginLeft: 8 },
  modalBtnTextSave: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }
});