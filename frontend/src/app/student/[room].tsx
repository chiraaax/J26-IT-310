import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// 1. ඔබ සෑදූ Firebase වින්‍යාසය මෙතැනට Import කරගන්න
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase'; // File path එක නිවැරදි දැයි තහවුරු කරගන්න

// Noise/Acoustic Backend එකට සම්බන්ධ වීමට URL එක (ඔබේ Acoustic Flask Server IP එක)
const getAcousticBackendURL = () => {
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000'; // Flask සාමාන්‍යයෙන් port 5000 ධාවනය වේ
  if (Platform.OS === 'web') return 'http://localhost:5000';
  return 'http://10.74.30.198:5000'; // අදාළ IP එකට වෙනස් කරන්න
};

export default function RoomTelemetryScreen() {
  const { room, type } = useLocalSearchParams();
  const router = useRouter();
  
  // States සඳහා විචල්‍යයන්
  const [co2Data, setCo2Data] = useState<any>(null);
  const [noiseData, setNoiseData] = useState<any>(null);
  const [loadingCO2, setLoadingCO2] = useState(true);
  const [loadingNoise, setLoadingNoise] = useState(true);
  const [error, setError] = useState('');

  // 1. Firebase මගින් සජීවීව CO2 සහ Air Quality දත්ත ලබාගැනීම
  useEffect(() => {
    if (!room) return;
    
    // Firestore හි 'spaces' collection එකෙන් අදාළ කාමරයේ දත්ත සජීවීව කියවීම
    const docRef = doc(db, 'spaces', room as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCo2Data(docSnap.data());
        setLoadingCO2(false);
      } else {
        // Firebase හි දත්ත නැතිනම් (තවම ESP32 දත්ත යවා නැතිනම්)
        setError(`No Air Quality data found for ${room}. Ensure ESP32 is running.`);
        setLoadingCO2(false);
      }
    }, (err) => {
      console.error("Firebase Error:", err);
      setError("Cannot connect to Firebase for Air Quality data.");
      setLoadingCO2(false);
    });

    return () => unsubscribe(); // Screen එකෙන් ඉවත් වනවිට Listen කිරීම නවත්වන්න
  }, [room]);

  // 2. Python REST API මගින් සජීවීව Noise / Acoustic දත්ත ලබාගැනීම
  useEffect(() => {
    const fetchNoiseTelemetry = async () => {
      try {
        const backendUrl = getAcousticBackendURL();
        const response = await fetch(`${backendUrl}/api/zones`);
        
        if (!response.ok) throw new Error('Failed to fetch noise telemetry');
        
        const data = await response.json();
        
        // ලබාගත් API දත්ත අතරින් අදාළ කාමරයට (zone_id) අදාළ දත්තය පමණක් වෙන් කර ගැනීම
        const roomAcoustic = data.zones?.find((z: any) => z.zone_id === room);
        
        if (roomAcoustic) {
          setNoiseData(roomAcoustic);
        }
        setLoadingNoise(false);
      } catch (err) {
        console.error("Acoustic API Error:", err);
        // Noise දත්ත ලබාගැනීමට නොහැකි වුවත් මුළු UI එකම error පෙන්වීම වැළැක්වීමට මෙහි error state එක set නොකරයි.
        setLoadingNoise(false); 
      }
    };

    fetchNoiseTelemetry();
    // තත්පර 5කට වරක් Noise API එක Call කිරීම
    const interval = setInterval(fetchNoiseTelemetry, 5000);
    return () => clearInterval(interval);
  }, [room]);

  // 3. Overall Study Comfort Index ගණනය කිරීම (Model Output පදනම් කරගෙන)
  const calculateComfortIndex = () => {
    if (!co2Data) return "Calculating...";
    
    let score = 100;
    
    // CO2 දඬුවම් (Penalty)
    if (co2Data.current_co2 > 1000) score -= 30;
    else if (co2Data.current_co2 > 800) score -= 15;
    
    // TTT දඬුවම්
    if (co2Data.status === "CRITICAL") score -= 20;
    else if (co2Data.status === "OPEN SOON") score -= 10;

    // Noise දඬුවම්
    if (noiseData) {
        if (noiseData.label === "Disruptive") score -= 25;
        else if (noiseData.label === "Moderate") score -= 10;
    }

    return Math.max(0, score); // Index එක බිංදුවට වඩා අඩුවිය නොහැක
  };


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back to Spaces</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.badge}>{type}</Text>
        <Text style={styles.title}>{room}</Text>
      </View>

      {loadingCO2 ? (
        <View style={styles.centerArea}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.statusText}>Connecting to Firebase Analytics...</Text>
        </View>
      ) : error && !co2Data ? (
        <View style={styles.centerArea}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <View style={styles.content}>
          
          {/* Main Status & Comfort Index Card */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Study Comfort Index</Text>
            <View style={styles.indexCircle}>
                <Text style={styles.indexValue}>{calculateComfortIndex()}</Text>
            </View>
            <Text style={[styles.statusMessage, { color: co2Data.status === 'SAFE' ? '#16A34A' : '#DC2626' }]}>
              {co2Data.status === 'SAFE' ? "Optimal Environment" : `Warning: CO2 ${co2Data.status}`}
            </Text>
          </View>

          {/* Environmental Data Grid */}
          <View style={styles.grid}>
            
            {/* Air Quality (CO2) from Firebase */}
            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>💨</Text>
              <Text style={styles.gridValue}>{co2Data.current_co2 ? Math.round(co2Data.current_co2) : "--"}</Text>
              <Text style={styles.gridLabel}>CO₂ (ppm)</Text>
            </View>

            {/* Temperature from Firebase */}
            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>🌡️</Text>
              <Text style={styles.gridValue}>{co2Data.current_temp ? co2Data.current_temp.toFixed(1) : "--"}°C</Text>
              <Text style={styles.gridLabel}>Temperature</Text>
            </View>

            {/* Time to Threshold (TTT) from Firebase */}
            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>⏱️</Text>
              <Text style={[styles.gridValue, {color: co2Data.ttt_minutes !== "> 30" ? '#DC2626' : '#111827'}]}>
                  {co2Data.ttt_minutes}
              </Text>
              <Text style={styles.gridLabel}>Time to Danger (mins)</Text>
            </View>

            {/* Acoustic Classification from Flask API */}
            <View style={styles.gridBox}>
              <Text style={styles.gridIcon}>🔊</Text>
              {loadingNoise ? (
                 <ActivityIndicator size="small" color="#6B7280" />
              ) : (
                <>
                  <Text style={styles.gridValue}>{noiseData ? noiseData.label : "Offline"}</Text>
                  <Text style={styles.gridLabel}>Acoustic Status</Text>
                </>
              )}
            </View>

          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBar: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backBtn: { paddingVertical: 5 },
  backBtnText: { color: '#4B5563', fontSize: 15, fontWeight: '700' },
  header: { paddingHorizontal: 20, marginBottom: 10 },
  badge: { fontSize: 11, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 12, fontSize: 14, color: '#6B7280', fontWeight: '500' },
  errorText: { color: '#DC2626', fontSize: 16, fontWeight: '700', textAlign: 'center', padding: 20 },
  content: { padding: 20 },
  statusCard: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8 },
  statusTitle: { fontSize: 14, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginBottom: 15 },
  indexCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#3B82F6', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  indexValue: { fontSize: 36, fontWeight: '900', color: '#FFFFFF' },
  statusMessage: { fontSize: 16, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  gridBox: { width: '48%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  gridIcon: { fontSize: 24, marginBottom: 8 },
  gridValue: { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center' },
  gridLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 4, textAlign: 'center' }
});