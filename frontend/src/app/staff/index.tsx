import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';

export default function StaffLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    // BALANCING PHASE: Hardcoded mock login until Firebase Database is connected.
    // This allows us to test the Admin UI flow perfectly right now.
    if (username.toLowerCase() === 'admin' && password === 'admin123') {
      setError('');
      router.replace('/staff/admin' as any); // Routes to Admin Dashboard
    } else {
      setError('Invalid credentials. Try admin / admin123');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Return to Welcome</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Staff Portal</Text>
          <Text style={styles.subtitle}>Authorized personnel only</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. admin"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Secure Login</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 60, left: 24, zIndex: 10 },
  backBtnText: { color: '#6B7280', fontSize: 15, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, fontWeight: '500' },
  form: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 20 },
  loginBtn: { backgroundColor: '#111827', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 16, textAlign: 'center' }
});