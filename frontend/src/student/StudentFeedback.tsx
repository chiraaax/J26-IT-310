import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const OPTIONS = [
  { id: 'cold', label: '🥶 Too Cold' },
  { id: 'good', label: '😊 Comfortable' },
  { id: 'hot', label: '🥵 Too Hot' },
  { id: 'stuffy', label: '😴 Stuffy / Tired' },
];

export default function StudentFeedback() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>How do you feel right now?</Text>
      <Text style={styles.subtitle}>Your vote helps adjust the lecture hall climate</Text>

      <View style={styles.grid}>
        {OPTIONS.map((item) => {
          const isSelected = selected === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.button, isSelected && styles.selectedButton]}
              onPress={() => setSelected(item.id)}
            >
              <Text style={[styles.buttonText, isSelected && styles.selectedText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selected && (
        <Text style={styles.confirmation}>
          ✓ Feedback recorded! Sent to Lecture Hall system.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6B7280', marginBottom: 14, marginTop: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  button: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  buttonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  selectedText: { color: '#1D4ED8', fontWeight: '700' },
  confirmation: {
    marginTop: 6,
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
    textAlign: 'center',
  },
});