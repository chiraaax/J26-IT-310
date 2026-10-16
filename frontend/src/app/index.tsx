import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🌡️</Text>
          <Text style={styles.title}>ComfortSense</Text>
          <Text style={styles.subtitle}>Campus Environment Intelligence</Text>
        </View>

        <View style={styles.actionContainer}>
          {/* Student Entry (No Login) */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/student' as any)}
          >
            <Text style={styles.primaryButtonText}>🎓 Continue as Student</Text>
            <Text style={styles.buttonSubText}>Find study spaces • No login required</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Staff Entry (Requires Login) */}
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/staff' as any)}
          >
            <Text style={styles.secondaryButtonText}>🔐 Staff Portal</Text>
            <Text style={styles.secondaryButtonSubText}>Lecturer & Admin Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 60 },
  logoIcon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8, fontWeight: '500' },
  actionContainer: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  primaryButton: { backgroundColor: '#2563EB', paddingVertical: 20, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  buttonSubText: { color: '#BFDBFE', fontSize: 13, fontWeight: '500' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  secondaryButtonText: { color: '#374151', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  secondaryButtonSubText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' }
});