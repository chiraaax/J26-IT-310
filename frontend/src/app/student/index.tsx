import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function StudentSpacesScreen() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [availFilter, setAvailFilter] = useState('All');
  const [catFilter, setCatFilter] = useState('All');

  useEffect(() => {
    const spacesRef = collection(db, 'spaces');
    const unsubscribe = onSnapshot(spacesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSpaces(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const calculateComfort = (space: any) => {
    let score = 100;
    if (space.current_co2 > 1000) score -= 30;
    else if (space.current_co2 > 800) score -= 15;
    if (space.status === "CRITICAL") score -= 20;
    return Math.max(0, score);
  };

  const getCategory = (id: string) => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('lab')) return 'Lab';
    if (lowerId.includes('hall') || lowerId.includes('class')) return 'Classroom';
    return 'Study Area';
  };

  // Applying both filters
  const filteredSpaces = spaces.filter(space => {
    const score = calculateComfort(space);
    const category = getCategory(space.id);
    
    // Availability Filter Logic
    let availMatch = true;
    if (availFilter === 'Available') availMatch = score >= 80;
    if (availFilter === 'Crowded') availMatch = score < 80;

    // Category Filter Logic
    let catMatch = true;
    if (catFilter !== 'All') catMatch = category === catFilter;

    return availMatch && catMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badge}>STUDENT PORTAL</Text>
          <Text style={styles.title}>Campus Spaces</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/student/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={42} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>FIND A STUDY ZONE</Text>
        
        {/* Row 1: Availability Filters */}
        <View style={styles.filterContainer}>
          {['All', 'Available', 'Crowded'].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterBtnPrimary, availFilter === cat && styles.filterBtnPrimaryActive]}
              onPress={() => setAvailFilter(cat)}
            >
              <Text style={[styles.filterTextPrimary, availFilter === cat && styles.filterTextPrimaryActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Row 2: Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {['All', 'Classroom', 'Lab', 'Study Area'].map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterBtnSecondary, catFilter === cat && styles.filterBtnSecondaryActive]}
              onPress={() => setCatFilter(cat)}
            >
              <Text style={[styles.filterTextSecondary, catFilter === cat && styles.filterTextSecondaryActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.divider} />

        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : filteredSpaces.length === 0 ? (
          <Text style={styles.infoText}>No spaces found matching your criteria.</Text>
        ) : (
          filteredSpaces.map((space) => {
            const score = calculateComfort(space);
            return (
              <TouchableOpacity 
                key={space.id} 
                style={styles.spaceCard}
                onPress={() => router.push({ pathname: '/student/[room]', params: { room: space.id, type: getCategory(space.id) } } as any)}
              >
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.spaceName}>{space.id}</Text>
                    <Text style={[styles.statusText, { color: score >= 80 ? '#10B981' : '#D97706' }]}>
                      {score >= 80 ? 'Optimal Condition' : 'Busy / Crowded'}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#ECFDF5' : '#FFFBEB' }]}>
                    <Text style={[styles.scoreValue, { color: score >= 80 ? '#10B981' : '#D97706' }]}>{score}/100</Text>
                  </View>
                </View>
                
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Ionicons name="cloud-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.metricVal}>{space.current_co2 ? Math.round(space.current_co2) : '--'} ppm</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="thermometer-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.metricVal}>{space.current_temp ? space.current_temp.toFixed(1) : '--'}°C</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Ionicons name="time-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.metricVal}>{space.ttt_minutes || '--'}</Text>
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
  badge: { fontSize: 10, fontWeight: '800', color: '#2563EB', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  profileBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 50 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  
  // Row 1: Availability
  filterContainer: { flexDirection: 'row', marginBottom: 16 },
  filterBtnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  filterBtnPrimaryActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  filterTextPrimary: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTextPrimaryActive: { color: '#FFFFFF' },

  // Row 2: Category
  catScroll: { flexDirection: 'row', paddingHorizontal: 4 },
  filterBtnSecondary: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'flex-start' },
  filterBtnSecondaryActive: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  filterTextSecondary: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextSecondaryActive: { color: '#1E3A8A' },
  
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },
  infoText: { color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  
  spaceCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  spaceName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  scoreValue: { fontSize: 15, fontWeight: '900' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 },
  metricItem: { flexDirection: 'row', alignItems: 'center' },
  metricVal: { fontSize: 13, fontWeight: '700', color: '#334155' },
});