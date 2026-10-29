import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase'; 
import { Ionicons } from '@expo/vector-icons';

export default function RoomTelemetryScreen() {
  const { room, type } = useLocalSearchParams();
  const router = useRouter();
  
  const [co2Data, setCo2Data] = useState<any>(null);
  const [noiseData, setNoiseData] = useState<any>(null);
  const [loadingCO2, setLoadingCO2] = useState(true);
  const [loadingNoise, setLoadingNoise] = useState(true);
  const [error, setError] = useState('');
  
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!room) return;
    const docRef = doc(db, 'spaces', room as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCo2Data(docSnap.data());
        setLoadingCO2(false);
      } else {
        setError(`No telemetry data found for ${room}.`);
        setLoadingCO2(false);
      }
    }, (err) => {
      console.error(err);
      setError("Cannot connect to server.");
      setLoadingCO2(false);
    });
    return () => unsubscribe(); 
  }, [room]);

  useEffect(() => {
    if (!room) return;
    const acousticQuery = query(collection(db, 'acoustic_snapshots'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribeNoise = onSnapshot(acousticQuery, (snapshot) => {
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        const acousticZoneID = "zone_a"; 
        const roomAcoustic = latestData[acousticZoneID];
        setNoiseData(roomAcoustic || null);
        setLoadingNoise(false);
      } else {
        setLoadingNoise(false);
      }
    }, (err) => {
      console.error(err);
      setLoadingNoise(false);
    });
    return () => unsubscribeNoise();
  }, [room]);

  // යාවත්කාලීන කළ ලකුණු ලබාදීමේ ක්‍රමවේදය (Realistic Scoring Logic)
  const calculateComfortIndex = () => {
    if (!co2Data) return 100;
    let score = 100;
    
    // CO2 දඬුවම් (Penalties) ASHRAE ප්‍රමිතීන්ට අනුව
    if (co2Data.current_co2 > 1500) score -= 30;
    else if (co2Data.current_co2 > 1200) score -= 15;
    else if (co2Data.current_co2 > 1000) score -= 5;
    
    if (co2Data.status === "CRITICAL") score -= 15;
    else if (co2Data.status === "OPEN SOON") score -= 5;
    
    // ශබ්ද දඬුවම්
    if (noiseData) {
        if (noiseData.label === "disruptive") score -= 25;
        else if (noiseData.label === "ambient") score -= 10;
    }
    
    return Math.max(0, score);
  };

  const handleVote = async (feedbackType: string) => {
    try {
      await addDoc(collection(db, 'comfort_feedback'), {
        room: room,
        feedback: feedbackType,
        timestamp: new Date().toISOString()
      });
      setHasVoted(true);
      Alert.alert("Thank You", "Your feedback has been submitted to the facility management.");
    } catch (error) {
      Alert.alert("Error", "Could not submit feedback at this time.");
    }
  };

  const comfortScore = calculateComfortIndex();
  
  // දර්ශකය මත පදනම්ව වර්ණය තීරණය කිරීම
  let bgColor = '#0F172A'; // Default Dark
  let borderColor = '#3B82F6'; // Default Blue
  if (comfortScore >= 80) {
    bgColor = '#064E3B'; // Dark Green
    borderColor = '#10B981'; // Light Green
  } else if (comfortScore >= 50) {
    bgColor = '#78350F'; // Dark Orange/Yellow
    borderColor = '#F59E0B'; // Light Yellow
  } else {
    bgColor = '#7F1D1D'; // Dark Red
    borderColor = '#EF4444'; // Light Red
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#475569" style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Spaces</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.push('/student/profile')} style={styles.profileBtn}>
          <Ionicons name="person-circle" size={36} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.badge}>{type}</Text>
        <Text style={styles.title}>{room}</Text>
      </View>

      {loadingCO2 ? (
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error && !co2Data ? (
        <View style={styles.centerArea}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Dynamic Comfort Index Card */}
          <View style={[styles.statusCard, { backgroundColor: bgColor }]}>
            <Text style={styles.statusTitle}>Study Comfort Index</Text>
            <View style={[styles.indexCircle, { borderColor: borderColor }]}>
                <Text style={styles.indexValue}>{comfortScore}</Text>
            </View>
            <Text style={[styles.statusMessage, { color: comfortScore >= 80 ? '#A7F3D0' : comfortScore >= 50 ? '#FDE68A' : '#FECACA' }]}>
              {comfortScore >= 80 ? "Optimal Environment" : comfortScore >= 50 ? "Warning: Comfort Degrading" : "Critical: Action Required"}
            </Text>
          </View>

          <View style={styles.grid}>
            <View style={styles.gridBox}>
              <Ionicons name="cloud" size={24} color="#64748B" style={styles.gridIcon} />
              <Text style={styles.gridValue}>{co2Data.current_co2 ? Math.round(co2Data.current_co2) : "--"}</Text>
              <Text style={styles.gridLabel}>CO₂ (ppm)</Text>
            </View>
            <View style={styles.gridBox}>
              <Ionicons name="thermometer" size={24} color="#64748B" style={styles.gridIcon} />
              <Text style={styles.gridValue}>{co2Data.current_temp ? co2Data.current_temp.toFixed(1) : "--"}°C</Text>
              <Text style={styles.gridLabel}>Temperature</Text>
            </View>
            <View style={styles.gridBox}>
              <Ionicons name="time" size={24} color={co2Data.ttt_minutes !== "> 30" ? '#EF4444' : '#64748B'} style={styles.gridIcon} />
              <Text style={[styles.gridValue, {color: co2Data.ttt_minutes !== "> 30" ? '#EF4444' : '#0F172A'}]}>
                  {co2Data.ttt_minutes}
              </Text>
              <Text style={styles.gridLabel}>Danger ETA</Text>
            </View>
            <View style={styles.gridBox}>
              <Ionicons name="volume-high" size={24} color="#64748B" style={styles.gridIcon} />
              {loadingNoise ? (
                 <ActivityIndicator size="small" color="#64748B" />
              ) : (
                <>
                  <Text style={[styles.gridValue, { textTransform: 'capitalize' }]}>{noiseData ? noiseData.label : "Offline"}</Text>
                  <Text style={styles.gridLabel}>Acoustic Status</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.votingTitle}>How does this room feel?</Text>
          
          {hasVoted ? (
            <View style={styles.votedBox}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" style={{ marginBottom: 8 }} />
              <Text style={styles.votedText}>Feedback Submitted</Text>
              <Text style={styles.votedSubtext}>Your response helps us optimize campus environments.</Text>
            </View>
          ) : (
            <View style={styles.votingGrid}>
              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('perfect')}>
                <Ionicons name="happy-outline" size={28} color="#10B981" />
                <Text style={styles.voteBtnText}>Perfect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('too_warm')}>
                <Ionicons name="flame-outline" size={28} color="#F59E0B" />
                <Text style={styles.voteBtnText}>Too Warm</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('too_cold')}>
                <Ionicons name="snow-outline" size={28} color="#3B82F6" />
                <Text style={styles.voteBtnText}>Too Cold</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote('noisy')}>
                <Ionicons name="volume-high-outline" size={28} color="#EF4444" />
                <Text style={styles.voteBtnText}>Too Noisy</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  backBtnText: { color: '#475569', fontSize: 16, fontWeight: '700' },
  profileBtn: { padding: 4 },
  
  header: { paddingHorizontal: 24, marginBottom: 16 },
  badge: { fontSize: 11, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 20 },
  content: { padding: 24, paddingBottom: 50 }, 
  
  statusCard: { padding: 24, borderRadius: 20, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  statusTitle: { fontSize: 13, color: '#E2E8F0', fontWeight: '800', textTransform: 'uppercase', marginBottom: 20, letterSpacing: 0.5 },
  indexCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  indexValue: { fontSize: 42, fontWeight: '900', color: '#FFFFFF' },
  statusMessage: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }, 
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridBox: { width: '48%', backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  gridIcon: { marginBottom: 8 },
  gridValue: { fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  gridLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 24 },

  votingTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16, textAlign: 'center' },
  votingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  voteBtn: { width: '48%', backgroundColor: '#FFFFFF', paddingVertical: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  voteBtnText: { fontSize: 13, fontWeight: '700', color: '#334155', marginTop: 10 },

  votedBox: { backgroundColor: '#ECFDF5', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#A7F3D0' },
  votedText: { fontSize: 18, fontWeight: '800', color: '#065F46', marginBottom: 6 },
  votedSubtext: { fontSize: 13, color: '#047857', textAlign: 'center', fontWeight: '500' }
});