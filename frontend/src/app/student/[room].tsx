import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import StudentDashboard from './StudentDashboard';

export default function RoomDetailScreen() {
  const { room, type } = useLocalSearchParams<{ room: string; type: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.topBarArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← All Spaces</Text>
          </TouchableOpacity>
          <Text style={styles.roomHeaderTitle} numberOfLines={1}>
            {room || 'Selected Room'}
          </Text>
          <View style={{ width: 60 }} />
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <StudentDashboard />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  topBarArea: { backgroundColor: '#FFFFFF', zIndex: 10 },
  navBar: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backBtnText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  roomHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  content: { flex: 1 },
});