import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, ActivityIndicator, Platform } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../config/firebase'; 
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

export default function CO2Trend() {
  const [chartData, setChartData] = useState<number[]>([]);
  const [tttMinutes, setTttMinutes] = useState<string>("--");
  const [loading, setLoading] = useState(true);

  const [pastData, setPastData] = useState<number[]>([]);
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    const roomName = 'Lab 2.2';

    // 1. අතීත විනාඩි 10 ක දත්ත (Real History) Firebase වෙතින් ලබා ගැනීම
    const historyRef = collection(db, 'co2_history');
    const historyQuery = query(
      historyRef, 
      where('room', '==', roomName), 
      orderBy('timestamp', 'desc'), 
      limit(2) // අවසාන වාර්තා 2 ලබාගනී (-5m සහ -10m)
    );
    
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      if (!snap.empty) {
        const docs = snap.docs.map(d => d.data());
        // Descending නිසා docs[0] යනු -5m, docs[1] යනු -10m වේ
        const val5m = docs[0]?.co2_ppm || docs[0]?.current_co2 || docs[0]?.co2 || null;
        const val10m = docs[1]?.co2_ppm || docs[1]?.current_co2 || docs[1]?.co2 || val5m;
        
        if (val5m && val10m) {
          setPastData([Number(val10m), Number(val5m)]);
        }
      }
    }, (err) => {
      console.warn("History Firebase Index Issue (will use fallback):", err);
    });

    // 2. සජීවී දත්ත සහ අනාගත දත්ත (Live & Forecast) ලබා ගැනීම
    const docRef = doc(db, 'spaces', roomName);
    const unsubSpace = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setLiveData(docSnap.data());
      }
    });

    return () => {
      unsubHistory();
      unsubSpace();
    };
  }, []);

  // 3. අතීතය, වර්තමානය සහ අනාගතය එකතු කර ප්‍රස්ථාරය සෑදීම
  useEffect(() => {
    if (liveData) {
      const currentCO2 = liveData.current_co2 ? Number(liveData.current_co2) : 400;
      
      // Firebase හි History Data තිබේ නම් එය ගනී, නැතිනම් දළ අගයක් (Fallback) ගනී
      const p10 = pastData.length === 2 ? pastData[0] : Math.max(400, currentCO2 - 40);
      const p5 = pastData.length === 2 ? pastData[1] : Math.max(400, currentCO2 - 20);

      let fullArray = [p10, p5, currentCO2];

      if (liveData.forecast_array && Array.isArray(liveData.forecast_array)) {
        const forecast = liveData.forecast_array.map((val: any) => isNaN(Number(val)) ? 400 : Number(val));
        fullArray = [...fullArray, ...forecast];
      }

      setChartData(fullArray);
      setTttMinutes(liveData.ttt_minutes || "--");
      setLoading(false);
    }
  }, [liveData, pastData]);

  const getDotColor = (value: number, index: number) => {
    if (index < 3) return "#10B981"; // අතීතය සහ වර්තමානය (Green)
    if (value >= 1000) return "#EF4444"; // අවදානම් අගයන් (Red)
    return "#F59E0B"; // අනාගත ආරක්ෂිත අගයන් (Yellow)
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topHeader}>
        <Text style={styles.title}>Trend Analysis</Text>
        <Text style={styles.subtitle}>Powered by XGBoost</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.container}>
          <View style={styles.cardHeader}>
            <Ionicons name="analytics" size={24} color="#0F172A" style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>40-Min Environmental Trajectory</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginVertical: 40 }} />
          ) : chartData.length === 0 ? (
            <Text style={styles.footerText}>Waiting for Data...</Text>
          ) : Platform.OS === 'web' ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
               <Text style={{ color: '#64748B', fontStyle: 'italic', textAlign: 'center' }}>
                 Interactive charts are only fully supported on the Mobile App.
               </Text>
            </View>
          ) : (
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: ["-10m", "-5m", "Now", "+5m", "+10m", "+15m", "+20m", "+25m", "+30m"],
                  datasets: [{
                    data: chartData,
                    strokeWidth: 3, 
                  }]
                }}
                width={screenWidth - 48}
                height={220}
                yAxisSuffix=" ppm"
                withInnerLines={true}
                withOuterLines={false}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0, 
                  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`, 
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  style: { borderRadius: 16 },
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#FFFFFF" }
                }}
                getDotColor={(dataPoint, dataPointIndex) => getDotColor(dataPoint, dataPointIndex)}
                bezier
                style={{ marginVertical: 16, borderRadius: 16 }}
              />
            </View>
          )}

          <View style={[styles.tttBox, tttMinutes !== "> 30" ? styles.tttDanger : styles.tttSafe]}>
            <Ionicons name="timer-outline" size={20} color={tttMinutes !== "> 30" ? "#B91C1C" : "#0F172A"} style={{ marginRight: 8 }} />
            <Text style={[styles.tttText, tttMinutes !== "> 30" && styles.tttTextDanger]}>
              Danger Threshold ETA: <Text style={{ fontWeight: '900' }}>{tttMinutes}</Text>
            </Text>
          </View>

          <Text style={styles.footerText}>*Green = Past Data | Yellow = Safe Forecast | Red = Danger Level</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
  content: { padding: 24 },
  container: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 20, shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  chartWrapper: { alignItems: 'center', marginLeft: -10 },
  
  tttBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1 },
  tttSafe: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  tttDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  tttText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  tttTextDanger: { color: '#B91C1C' },

  footerText: { fontSize: 11, color: '#64748B', marginTop: 16, textAlign: 'center', fontWeight: '600' }
});