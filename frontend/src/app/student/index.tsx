import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

// ==========================================
// 1. Acoustic Zone Card Component
// ==========================================
interface AcousticZoneProps {
  zone_id?: string;
  label?: string;
  confidence?: number;
  disruption_score?: number;
  isBest: boolean;
}

function AcousticZoneCard({ zone_id, label, confidence, disruption_score, isBest }: AcousticZoneProps) {
  const getStatus = () => {
    switch (label) {
      case 'silence': return { bg: '#DCFCE7', text: '#15803D', bar: '#22C55E', icon: '🤫' };
      case 'ambient': return { bg: '#FEF3C7', text: '#B45309', bar: '#F59E0B', icon: '💬' };
      case 'disruptive': return { bg: '#FEE2E2', text: '#B91C1C', bar: '#EF4444', icon: '📢' };
      default: return { bg: '#F3F4F6', text: '#4B5563', bar: '#9CA3AF', icon: '❓' };
    }
  };

  const status = getStatus();
  const displayName = zone_id ? zone_id.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN ZONE';
  const safeLabel = label ? label.toUpperCase() : 'UNKNOWN';
  const safeScore = disruption_score ?? 0;
  const safeConfidence = confidence ? (confidence * 100).toFixed(0) : '0';

  return (
    <View style={[styles.az_card, isBest && styles.az_cardBest]}>
      {isBest && <Text style={styles.az_bestBadge}>🏆 QUIETEST</Text>}
      <View style={styles.az_topRow}>
        <Text style={styles.az_zoneName}>{displayName}</Text>
        <View style={[styles.az_badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.az_badgeText, { color: status.text }]}>{status.icon} {safeLabel}</Text>
        </View>
      </View>
      <View style={styles.az_scoreContainer}>
        <Text style={styles.az_scoreValue}>{safeScore}</Text>
        <Text style={styles.az_scoreLabel}>/ 100</Text>
      </View>
      <View style={styles.az_barBackground}>
        <View style={[styles.az_barFill, { width: `${safeScore}%`, backgroundColor: status.bar }]} />
      </View>
      <Text style={styles.az_confidence}>ML Confidence: {safeConfidence}%</Text>
    </View>
  );
}

// ==========================================
// 2. Main Student Spaces Screen
// ==========================================
export default function StudentSpacesScreen() {
  const router = useRouter();
  const [spaces, setSpaces] = useState<any[]>([]);
  const [acousticZones, setAcousticZones] = useState<any[]>([]);
  const [bestZone, setBestZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    const acousticQuery = query(collection(db, 'acoustic_snapshots'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeNoise = onSnapshot(acousticQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        const zonesArray = [];
        let lowestScore = 100;
        let quietest = null;

        for (const [key, value] of Object.entries(latestData)) {
          if (key !== 'timestamp' && typeof value === 'object') {
            const zoneData = value as any;
            zonesArray.push({ zone_id: key, ...zoneData });
            if (zoneData.disruption_score < lowestScore) {
              lowestScore = zoneData.disruption_score;
              quietest = key;
            }
          }
        }
        setAcousticZones(zonesArray);
        setBestZone(quietest);
      }
    });
    return () => unsubscribeNoise();
  }, []);

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

  const getCategory = (id: string) => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('lab')) return 'Lab';
    if (lowerId.includes('hall') || lowerId.includes('class')) return 'Classroom';
    return 'Study Area';
  };

  const filteredSpaces = spaces.filter(space => {
    const score = calculateComfort(space);
    const category = getCategory(space.id);
    let availMatch = true;
    if (availFilter === 'Available') availMatch = score >= 80;
    if (availFilter === 'Crowded') availMatch = score < 80;
    let catMatch = true;
    if (catFilter !== 'All') catMatch = category === catFilter;
    return availMatch && catMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.badgeLabel}>STUDENT PORTAL</Text>
          <Text style={styles.title}>Campus Spaces</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/student/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={42} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {acousticZones.length > 0 && (
          <View style={styles.acousticSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>LIVE ACOUSTIC RANKING</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
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

        <Text style={styles.sectionTitle}>FIND A STUDY ZONE</Text>
        
        <View style={styles.filterContainer}>
          {['All', 'Available', 'Crowded'].map((cat) => (
            <TouchableOpacity key={cat} style={[styles.filterBtnPrimary, availFilter === cat && styles.filterBtnPrimaryActive]} onPress={() => setAvailFilter(cat)}>
              <Text style={[styles.filterTextPrimary, availFilter === cat && styles.filterTextPrimaryActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {['All', 'Classroom', 'Lab', 'Study Area'].map((cat) => (
            <TouchableOpacity key={cat} style={[styles.filterBtnSecondary, catFilter === cat && styles.filterBtnSecondaryActive]} onPress={() => setCatFilter(cat)}>
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
              <TouchableOpacity key={space.id} style={styles.spaceCard} onPress={() => router.push({ pathname: '/student/[room]', params: { room: space.id, type: getCategory(space.id) } } as any)}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.spaceName}>{space.id}</Text>
                    <Text style={[styles.statusText, { color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }]}>
                      {score >= 80 ? 'Optimal Condition' : score >= 50 ? 'Moderate' : 'Busy / Crowded'}
                    </Text>
                  </View>
                  <View style={[styles.scoreBadge, { backgroundColor: score >= 80 ? '#ECFDF5' : score >= 50 ? '#FEF3C7' : '#FEF2F2' }]}>
                    <Text style={[styles.spaceScoreValue, { color: score >= 80 ? '#10B981' : score >= 50 ? '#D97706' : '#EF4444' }]}>{score}/100</Text>
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
  badgeLabel: { fontSize: 10, fontWeight: '800', color: '#2563EB', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  profileBtn: { padding: 4 },
  content: { padding: 24, paddingBottom: 50 },
  
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  
  // Acoustic Section Styles (Renamed keys to prevent duplicates)
  acousticSection: { marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
  liveText: { fontSize: 10, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  horizontalScroll: { paddingBottom: 10 },

  az_card: { backgroundColor: '#FFFFFF', width: 170, padding: 16, borderRadius: 16, marginRight: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, borderWidth: 1, borderColor: '#F3F4F6', justifyContent: 'space-between' },
  az_cardBest: { borderColor: '#2563EB', borderWidth: 2, backgroundColor: '#EFF6FF' },
  az_bestBadge: { fontSize: 10, fontWeight: '800', color: '#2563EB', marginBottom: 12 },
  az_topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  az_zoneName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  az_badge: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  az_badgeText: { fontSize: 9, fontWeight: '800' },
  az_scoreContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  az_scoreValue: { fontSize: 28, fontWeight: '900', color: '#111827' },
  az_scoreLabel: { fontSize: 14, color: '#9CA3AF', fontWeight: '600', marginLeft: 4 },
  az_barBackground: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 12, overflow: 'hidden' },
  az_barFill: { height: '100%', borderRadius: 3 },
  az_confidence: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  // Filters
  filterContainer: { flexDirection: 'row', marginBottom: 16 },
  filterBtnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  filterBtnPrimaryActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  filterTextPrimary: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTextPrimaryActive: { color: '#FFFFFF' },

  catScroll: { flexDirection: 'row', paddingHorizontal: 4 },
  filterBtnSecondary: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'flex-start' },
  filterBtnSecondaryActive: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  filterTextSecondary: { fontSize: 12, fontWeight: '700', color: '#475569' },
  filterTextSecondaryActive: { color: '#1E3A8A' },
  
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },
  infoText: { color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
  
  // Space Cards
  spaceCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  spaceName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },
  scoreBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  spaceScoreValue: { fontSize: 15, fontWeight: '900' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10 },
  metricItem: { flexDirection: 'row', alignItems: 'center' },
  metricVal: { fontSize: 13, fontWeight: '700', color: '#334155' },
});