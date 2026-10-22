import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';

export default function AdminManagementScreen() {
  const router = useRouter();
  
  // States for sending Alerts
  const [selectedRoom, setSelectedRoom] = useState('Lab 2.2');
  const [alertMessage, setAlertMessage] = useState('');

  // States for Lecturers CRUD
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRoom, setFormRoom] = useState('Unassigned');

  // Fetch Lecturers from Firebase
  useEffect(() => {
    const lecturersRef = collection(db, 'lecturers');
    const unsubscribe = onSnapshot(lecturersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLecturers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 1. Send Manual Alert to Firebase 'custom_alerts' collection
  const handleSendAlert = async () => {
    if (!alertMessage.trim()) return Alert.alert("Error", "Please type a suggestion/alert message.");
    try {
      await setDoc(doc(db, 'custom_alerts', new Date().getTime().toString()), {
        room: selectedRoom,
        message: alertMessage,
        timestamp: new Date().toISOString(),
        sender: 'Admin'
      });
      Alert.alert("Success", `Alert sent successfully to ${selectedRoom}`);
      setAlertMessage('');
    } catch (e) {
      Alert.alert("Error", "Failed to send alert.");
    }
  };

  // 2. Open Modal for Adding
  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setFormRoom('Unassigned');
    setModalVisible(true);
  };

  // 3. Open Modal for Editing
  const openEditModal = (lecturer: any) => {
    setEditingId(lecturer.id);
    setFormName(lecturer.name);
    setFormEmail(lecturer.email);
    setFormRoom(lecturer.room || 'Unassigned');
    setModalVisible(true);
  };

  // 4. Save Lecturer (Create or Update) in Firebase
  const handleSaveLecturer = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      Alert.alert("Error", "Name and Email are required.");
      return;
    }
    
    try {
      const lecturerData = {
        name: formName,
        email: formEmail,
        room: formRoom,
      };

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'lecturers', editingId), lecturerData);
        Alert.alert("Updated", "Lecturer details updated successfully.");
      } else {
        // Create new
        await addDoc(collection(db, 'lecturers'), {
          ...lecturerData,
          createdAt: new Date().toISOString()
        });
        Alert.alert("Added", "New lecturer added successfully.");
      }
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Error", "Failed to save lecturer data.");
      console.error(e);
    }
  };

  // 5. Delete Lecturer from Firebase
  const handleDeleteLecturer = (id: string, name: string) => {
    Alert.alert("Confirm Delete", `Are you sure you want to permanently remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, 'lecturers', id));
          } catch (e) {
            Alert.alert("Error", "Failed to delete lecturer.");
          }
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>ADMIN PORTAL</Text>
          <Text style={styles.title}>System Management</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/staff/admin/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={42} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Send Alert */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="send" size={20} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Send Manual Alert / Suggestion</Text>
          </View>
          <Text style={styles.label}>Target Room:</Text>
          <TextInput 
            style={styles.input} 
            value={selectedRoom} 
            onChangeText={setSelectedRoom}
            placeholder="e.g. Lab 2.2"
          />
          <Text style={styles.label}>Suggestion Message:</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            multiline
            value={alertMessage} 
            onChangeText={setAlertMessage}
            placeholder="Type suggestion to the lecturer here..."
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSendAlert}>
            <Text style={styles.primaryBtnText}>Broadcast Alert</Text>
          </TouchableOpacity>
        </View>

        {/* Section 2: Manage Lecturers */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={20} color="#16A34A" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Manage Lecturers</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Add New</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
             <ActivityIndicator size="small" color="#16A34A" style={{ marginVertical: 20 }} />
          ) : lecturers.length === 0 ? (
             <Text style={{ textAlign: 'center', color: '#64748B', marginVertical: 20 }}>No lecturers found.</Text>
          ) : (
            lecturers.map(lecturer => (
              <View key={lecturer.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{lecturer.name}</Text>
                  <Text style={styles.listEmail}>{lecturer.email}</Text>
                  {lecturer.room && lecturer.room !== 'Unassigned' && (
                    <Text style={styles.listRoom}>Assigned: {lecturer.room}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(lecturer)}>
                    <Ionicons name="create-outline" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteLecturer(lecturer.id, lecturer.name)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Lecturer Add/Edit Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit Lecturer' : 'Add New Lecturer'}</Text>
            
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="e.g. Dr. Prageeth" />
            
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.input} value={formEmail} onChangeText={setFormEmail} placeholder="e.g. prageeth@sliit.lk" keyboardType="email-address" autoCapitalize="none" />
            
            <Text style={styles.label}>Assigned Room</Text>
            <TextInput style={styles.input} value={formRoom} onChangeText={setFormRoom} placeholder="e.g. Lab 2.2" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveLecturer}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', flex: 1 },
  
  label: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, fontSize: 15, color: '#0F172A', marginBottom: 16 },
  
  primaryBtn: { backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  
  addBtn: { flexDirection: 'row', backgroundColor: '#16A34A', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  listName: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  listEmail: { fontSize: 13, color: '#64748B', marginBottom: 4 },
  listRoom: { fontSize: 11, fontWeight: '700', color: '#16A34A', backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  iconBtn: { padding: 10, marginLeft: 8, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 20, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
  cancelBtn: { backgroundColor: '#F1F5F9' },
  cancelBtnText: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  saveBtn: { backgroundColor: '#16A34A' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }
});