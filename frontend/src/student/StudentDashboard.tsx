import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import StudentSensorCard from './StudentSensorCard';
import StudentFeedback from './StudentFeedback';

const SCENARIOS = {
  Optimal: {
    room_id: 'Lecture Hall A',
    temperature: 22.5,
    humidity: 48.0,
    noise: 38.0,
    CO2: 520.0,
    peopleCount: 15,
  },
  Stuffy: {
    room_id: 'Lab 02',
    temperature: 25.5,
    humidity: 62.0,
    noise: 45.0,
    CO2: 920.0,
    peopleCount: 30,
  },
  Crowded: {
    room_id: 'Main Auditorium',
    temperature: 28.8,
    humidity: 76.0,
    noise: 68.0,
    CO2: 1450.0,
    peopleCount: 55,
  },
};

type ScenarioKey = keyof typeof SCENARIOS;

export default function StudentDashboard() {
  const [scenario, setScenario] = useState<ScenarioKey>('Stuffy');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Automatically uses 127.0.0.1 on Web Browser, and Wi-Fi IP on iPhone!
  const API_URL =
    Platform.OS === 'web'
      ? 'http://127.0.0.1:8000/api/predict'
      : 'http://10.132.128.198:8000/api/predict';

  const current = SCENARIOS[scenario];

  const fetchPrediction = useCallback(async () => {
    try {
      const payload = {
        room_id: current.room_id,
        session_start_time: new Date().toISOString(),
        readings: [
          {
            timestamp: new Date().toISOString(),
            temperature: current.temperature,
            humidity: current.humidity,
            noise: current.noise,
            CO2: current.CO2,
            peopleCount: current.peopleCount,
          },
        ],
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setData(result.predictions);
      setError(null);
    } catch (err) {
      setError(`Cannot connect to ${API_URL}. Ensure FastAPI is running.`);
    } finally {
      setRefreshing(false);
    }
  }, [current, API_URL]);

  useEffect(() => {
    fetchPrediction();
    const interval = setInterval(fetchPrediction, 3000);
    return () => clearInterval(interval);
  }, [fetchPrediction]);

  const comfortScore = data?.Comfort_Score ?? 0;
  const scoreColor =
    comfortScore >= 70 ? '#16A34A' : comfortScore >= 45 ? '#D97706' : '#DC2626';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchPrediction();
            }}
          />
        }
      >
        {/* Top Student Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>🎓 STUDENT VIEW</Text>
            </View>
            <Text style={styles.title}>ComfortSense</Text>
            <Text style={styles.subtitle}>Room: {current.room_id}</Text>
          </View>
          <View style={[styles.dot, { backgroundColor: error ? '#EF4444' : '#22C55E' }]} />
        </View>

        {/* Room Switcher for Testing */}
        <View style={styles.tabs}>
          {(['Optimal', 'Stuffy', 'Crowded'] as ScenarioKey[]).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, scenario === key && styles.activeTab]}
              onPress={() => setScenario(key)}
            >
              <Text style={[styles.tabText, scenario === key && styles.activeTabText]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {!data && !error && <ActivityIndicator size="large" color="#2563EB" />}

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {data && (
          <>
            {/* Personal Study & Focus Banner */}
            <View
              style={[
                styles.tipBanner,
                { backgroundColor: data.Attention_Level === 'High' ? '#F0FDF4' : '#FFFBEB' },
              ]}
            >
              <Text style={styles.tipTitle}>
                {data.Attention_Level === 'High'
                  ? '✨ Great Study Environment!'
                  : '💡 Personal Focus Tip'}
              </Text>
              <Text style={styles.tipText}>{data.Actionable_Recommendation}</Text>
            </View>

            {/* Student Comfort & Focus Card */}
            <View style={styles.mainCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.label}>ROOM COMFORT</Text>
                  <Text style={[styles.score, { color: scoreColor }]}>
                    {comfortScore.toFixed(1)}%
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.label}>STUDY FOCUS LEVEL</Text>
                  <Text
                    style={[
                      styles.focusText,
                      { color: data.Attention_Level === 'High' ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    {data.Attention_Level}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.min(Math.max(comfortScore, 0), 100)}%`, backgroundColor: scoreColor },
                  ]}
                />
              </View>
            </View>

            {/* Live Room Sensors */}
            <Text style={styles.sectionTitle}>Current Room Conditions</Text>
            <View style={styles.grid}>
              <StudentSensorCard
                title="Temperature"
                value={current.temperature}
                unit="°C"
                icon="🌡️"
                status={current.temperature <= 24 ? 'Good' : current.temperature <= 27 ? 'Fair' : 'Poor'}
              />
              <StudentSensorCard
                title="Fresh Air (CO₂)"
                value={current.CO2}
                unit="ppm"
                icon="☁️"
                status={current.CO2 < 700 ? 'Good' : current.CO2 <= 1000 ? 'Fair' : 'Poor'}
              />
              <StudentSensorCard
                title="Humidity"
                value={current.humidity}
                unit="%"
                icon="💧"
                status={current.humidity <= 55 ? 'Good' : current.humidity <= 65 ? 'Fair' : 'Poor'}
              />
              <StudentSensorCard
                title="Quietness"
                value={current.noise}
                unit="dB"
                icon="🔊"
                status={current.noise < 45 ? 'Good' : current.noise <= 60 ? 'Fair' : 'Poor'}
              />
            </View>

            {/* Interactive Student Comfort Voting */}
            <StudentFeedback />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { padding: 20, paddingTop: 65, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleBadge: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
  },
  roleText: { fontSize: 11, fontWeight: '800', color: '#1E40AF' },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 9 },
  activeTab: { backgroundColor: '#FFFFFF' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#111827', fontWeight: '700' },
  tipBanner: {
    padding: 15,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 4 },
  tipText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  score: { fontSize: 40, fontWeight: '900' },
  focusText: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  barBg: { height: 10, backgroundColor: '#E5E7EB', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  errorBox: { backgroundColor: '#FEE2E2', padding: 15, borderRadius: 12, marginVertical: 15 },
  errorText: { color: '#B91C1C', fontWeight: '600', textAlign: 'center' },
});