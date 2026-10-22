import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function AdminAnalyticsScreen() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

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

  const calculateComfort = (space: any) => {
    let score = 100;
    if (space.current_co2 > 1000) score -= 30;
    else if (space.current_co2 > 800) score -= 15;
    if (space.status === "CRITICAL") score -= 20;
    else if (space.status === "OPEN SOON") score -= 10;
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

        <View style={styles.divider} />
        
        {loading ? (
          <ActivityIndicator size="large" color="#16A34A" style={{ marginTop: 40 }} />
        ) : filteredSpaces.length === 0 ? (
          <Text style={styles.infoText}>No spaces found matching criteria.</Text>
        ) : (
          filteredSpaces.map((space) => {
            const score = calculateComfort(space);
            const isCritical = score < 50;
            return (
              <TouchableOpacity 
                key={space.id} 
                style={[styles.spaceCard, isCritical && { borderColor: '#FECACA', borderWidth: 2 }]}
                // Error එක හැදීම: Dynamic Route එකක් යවන ආකාරය නිවැරදි කර ඇත (as any භාවිතා කර)
                onPress={() => router.push({ pathname: '/staff/admin/room/[id]', params: { id: space.id } } as any)}
              >
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
            )
          })
        )}
      </ScrollView>
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
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metricBox: { alignItems: 'center', flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 10, marginHorizontal: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  metricLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
});