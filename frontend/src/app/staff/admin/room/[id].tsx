import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function AdminRoomDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [telemetry, setTelemetry] = useState<any>(null);
  const [lecturer, setLecturer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Fetch Room Data
    const docRef = doc(db, 'spaces', id as string);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setTelemetry(docSnap.data());
      setLoading(false);
    });

    // Fetch Assigned Lecturer
    const fetchLecturer = async () => {
      const q = query(collection(db, 'lecturers'), where('room', '==', id));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setLecturer(querySnapshot.docs[0].data());
      }
    };
    fetchLecturer();

    return () => unsubscribe();
  }, [id]);

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></SafeAreaView>;
  if (!telemetry) return <SafeAreaView style={styles.center}><Text>No data found for this room.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#0F172A" /></TouchableOpacity>
        <Text style={styles.title}>{id} Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Assigned Lecturer Info */}
        <View style={styles.lecturerCard}>
          <Ionicons name="person-circle" size={40} color="#16A34A" style={{ marginRight: 12 }} />
          <View>
            <Text style={styles.lecTitle}>Assigned Lecturer</Text>
            <Text style={styles.lecName}>{lecturer ? lecturer.name : "Unassigned"}</Text>
          </View>
        </View>

        {/* Real-time Environment Data */}
        <View style={styles.grid}>
          <View style={styles.gridBox}>
            <Text style={styles.gridVal}>{telemetry.current_co2 ? Math.round(telemetry.current_co2) : "--"}</Text>
            <Text style={styles.gridLabel}>CO₂ (PPM)</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridVal}>{telemetry.current_temp ? telemetry.current_temp.toFixed(1) : "--"}°C</Text>
            <Text style={styles.gridLabel}>Temp</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.gridVal}>{telemetry.humidity || telemetry.current_hum ? Math.round(telemetry.humidity || telemetry.current_hum) : "--"}%</Text>
            <Text style={styles.gridLabel}>Humidity</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={[styles.gridVal, { fontSize: 16, textTransform: 'capitalize', color: telemetry.acoustic_status === 'disruptive' ? '#EF4444' : '#10B981' }]}>
              {telemetry.acoustic_status || 'Ambient'}
            </Text>
            <Text style={styles.gridLabel}>Noise</Text>
          </View>
        </View>

        {/* ML Trend Chart */}
        {telemetry.forecast_array && Array.isArray(telemetry.forecast_array) && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>30-Min CO₂ Forecast (XGBoost)</Text>
            <LineChart
              data={{
                labels: ["+5m", "+10m", "+15m", "+20m", "+25m", "+30m"],
                datasets: [{ data: telemetry.forecast_array.map((v: any) => isNaN(Number(v)) ? 400 : Number(v)), strokeWidth: 3 }]
              }}
              width={screenWidth - 48}
              height={220}
              yAxisSuffix=" ppm"
              withInnerLines={true}
              chartConfig={{
                backgroundColor: "#ffffff", backgroundGradientFrom: "#ffffff", backgroundGradientTo: "#ffffff",
                decimalPlaces: 0, color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                propsForDots: { r: "4", strokeWidth: "0", fill: "#15803D" }
              }}
              bezier
              style={{ marginTop: 10, borderRadius: 16 }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  content: { padding: 24, paddingBottom: 50 },
  lecturerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  lecTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
  lecName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 20 },
  gridBox: { width: '48%', backgroundColor: '#FFFFFF', paddingVertical: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  gridVal: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  gridLabel: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  chartContainer: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  chartTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10, alignSelf: 'flex-start' }
});