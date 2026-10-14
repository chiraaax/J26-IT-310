import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

// Mock database until Firebase is connected
const MOCK_ROOMS = [
  { id: '1', name: 'Lecture Hall A', type: 'Classroom', status: 'Crowded', occupancy: '85%' },
  { id: '2', name: 'Lab 02', type: 'Lab', status: 'Free', occupancy: '20%' },
  { id: '3', name: 'Main Auditorium', type: 'Classroom', status: 'Crowded', occupancy: '95%' },
  { id: '4', name: 'Library 1st Floor', type: 'Common Area', status: 'Free', occupancy: '35%' },
];

export default function SpaceFinder() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [activeStatus, setActiveStatus] = useState('All');

  const filteredRooms = MOCK_ROOMS.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = activeType === 'All' || room.type === activeType;
    const matchesStatus = activeStatus === 'All' || room.status === activeStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Campus Spaces</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by room name..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Space Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {['All', 'Classroom', 'Lab', 'Common Area'].map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.pill, activeType === type && styles.pillActive]}
              onPress={() => setActiveType(type)}
            >
              <Text style={[styles.pillText, activeType === type && styles.pillTextActive]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Occupancy Status</Text>
        <View style={styles.row}>
          {['All', 'Free', 'Crowded'].map(status => (
            <TouchableOpacity
              key={status}
              style={[
                styles.statusPill, 
                activeStatus === status && styles.pillActive,
                status === 'Free' && activeStatus === status && { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
                status === 'Crowded' && activeStatus === status && { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }
              ]}
              onPress={() => setActiveStatus(status)}
            >
              <Text style={[
                styles.pillText, 
                activeStatus === status && styles.pillTextActive,
                status === 'Free' && activeStatus === status && { color: '#16A34A' },
                status === 'Crowded' && activeStatus === status && { color: '#DC2626' }
              ]}>
                {status === 'Free' ? '🟢 Free Area' : status === 'Crowded' ? '🔴 Crowded Area' : 'All Status'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.list}>
        {filteredRooms.map(room => (
          <TouchableOpacity 
            key={room.id} 
            style={styles.roomCard}
            // Temporarily goes back; we will connect this to the Live Dashboard next
            onPress={() => router.push(`/student/${encodeURIComponent(room.name)}?type=${encodeURIComponent(room.type)}` as any)}
          >
            <View>
              <Text style={styles.roomName}>{room.name}</Text>
              <Text style={styles.roomType}>{room.type}</Text>
            </View>
            <View style={styles.roomStats}>
              <View style={[styles.statusBadge, { backgroundColor: room.status === 'Free' ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[styles.statusText, { color: room.status === 'Free' ? '#16A34A' : '#DC2626' }]}>
                  {room.occupancy} {room.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        {filteredRooms.length === 0 && (
          <Text style={styles.emptyText}>No spaces match your filters.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { marginRight: 16 },
  backBtnText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  searchContainer: { padding: 20, backgroundColor: '#FFF' },
  searchInput: { backgroundColor: '#F3F4F6', padding: 14, borderRadius: 12, fontSize: 16 },
  filterSection: { padding: 20, paddingTop: 0, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  filterLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
  row: { flexDirection: 'row', gap: 10 },
  pillScroll: { flexDirection: 'row', overflow: 'visible' },
  pill: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  statusPill: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  pillActive: { backgroundColor: '#111827' },
  pillText: { color: '#4B5563', fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#FFF' },
  list: { padding: 20 },
  roomCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  roomName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  roomType: { fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  roomStats: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontWeight: '600' }
});