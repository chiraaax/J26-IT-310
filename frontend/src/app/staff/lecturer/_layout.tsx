import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LecturerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F172A', 
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', height: 65, paddingBottom: 12, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Center',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="CO2Trend"
        options={{
          title: 'Trend',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size + 2} color={color} />
        }}
      />
    </Tabs>
  );
}