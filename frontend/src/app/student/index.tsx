import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

// Firebase Imports
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Acoustic Component Import
import AcousticZoneCard from './AcousticZoneCard';

export default function StudentSpaceFinder() {
  const router = useRouter();
  
  // --- FIREBASE STATE ---
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  // --- ACOUSTIC API STATE ---
  const [acousticZones, setAcousticZones] = useState<any[]>([]);
  const [bestZone, setBestZone] = useState<string | null>(null);

  // 1. Fetch rooms from Firebase
  useEffect(() => {
    const spacesRef = collection(db, 'spaces');
    
    const unsubscribe = onSnapshot(spacesRef, (snapshot) => {
      const liveSpaces = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSpaces(liveSpaces);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live spaces:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Poll the Python Acoustic API every 2 seconds
  useEffect(() => {
    const fetchAcousticData = async () => {
      try {
        // UPDATED IP ADDRESS HERE
        const response = await fetch('http://192.168.1.174:5000/api/zones');
        const data = await response.json();
        
        if (data.zones) {
          setAcousticZones(data.zones);
          setBestZone(data.quietest_zone);
        }
      } catch (error) {
        // Silently fail if the Python server is offline to not break the app
        console.log("Acoustic API offline or unreachable"); 
      }
    };

    fetchAcousticData(); // Initial fetch
    const interval = setInterval(fetchAcousticData, 2000); // Poll every 2s
    return () => clearInterval(interval);
  }, []);

  const filteredSpaces = filter === 'All' 
    ? spaces 
    : spaces.filter(space => space.type === filter);

  const renderSpaceCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/student/${encodeURIComponent(item.name)}?type=${encodeURIComponent(item.type)}` as any)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={[
          styles.statusBadge, 
          item.status === 'Free' ? styles.statusFree : styles.statusCrowded
        ]}>
          {item.status || 'Free'}
        </Text>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.cardDetail}>🏢 Type: {item.type}</Text>
        <Text style={styles.cardDetail}>👥 Capacity: {item.capacity}</Text>
        <Text style={styles.cardDetail}>📊 Occupancy: {item.occupancy || '0%'}</Text>
      </View>
      
      <Text style={styles.cardAction}>Tap for live comfort telemetry →</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Navigation */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Gateway</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerArea}>
          <Text style={styles.badge}>STUDENT VIEW</Text>
          <Text style={styles.title}>Campus Spaces</Text>
          <Text style={styles.subtitle}>Select a room to view environmental conditions.</Text>
        </View>

        {/* --- LIVE ACOUSTIC MODULE --- */}
        {acousticZones.length > 0 && (
          <View style={styles.acousticSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Live Acoustic Ranking</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            
            {bestZone && (
              <View style={styles.bestSpotBanner}>
                <Text style={styles.bestSpotLabel}>🏆 BEST SPOT RIGHT NOW</Text>
                <Text style={styles.bestSpotZone}>{bestZone.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.bestSpotSub}>Currently the quietest space on campus</Text>
              </View>
            )}
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
              {acousticZones.map((zone) => (
                <AcousticZoneCard 
                  key={zone.zone_id}
                  zone_id={zone.zone_id}
                  label={zone.label}
                  confidence={zone.confidence}
                  disruption_score={zone.disruption_score}
                  isBest={zone.zone_id === bestZone}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* --- FIREBASE ROOM LIST --- */}
        <View style={styles.filterRow}>
          {['All', 'Classroom', 'Lab', 'Common Area'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Connecting to Campus Sensors...</Text>
          </View>
        ) : spaces.length === 0 ? (
          <View style={styles.emptyArea}>
            <Text style={styles.emptyText}>No spaces registered yet.</Text>
          </View>
        ) : (
          <View style={styles.listContent}>
            {filteredSpaces.map(item => (
               <View key={item.id}>{renderSpaceCard({item})}</View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  backBtn: { paddingVertical: 5 },
  backBtnText: { color: '#4B5563', fontSize: 15, fontWeight: '700' },
  headerArea: { paddingHorizontal: 20, marginBottom: 15 },
  badge: { fontSize: 11, fontWeight: '800', color: '#2563EB', letterSpacing: 0.5, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  
  // New Acoustic Styles
  acousticSection: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  bestSpotBanner: { backgroundColor: '#2563EB', marginHorizontal: 20, padding: 20, borderRadius: 16, marginBottom: 16, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bestSpotLabel: { color: '#DBEAFE', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  bestSpotZone: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  bestSpotSub: { color: '#BFDBFE', fontSize: 13, fontWeight: '500' },
  horizontalScroll: { paddingHorizontal: 20, paddingBottom: 10 },

  // Existing Styles
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 8 },
  filterBtn: { backgroundColor: '#E5E7EB', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  filterBtnActive: { backgroundColor: '#111827' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  roomName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  statusBadge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  statusFree: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  statusCrowded: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  cardBody: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, gap: 4, marginBottom: 12 },
  cardDetail: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  cardAction: { fontSize: 13, fontWeight: '700', color: '#2563EB', textAlign: 'right' },
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  emptyArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
});