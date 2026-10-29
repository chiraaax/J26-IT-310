import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16A34A', 
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', height: 65, paddingBottom: 12, paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="management"
        options={{ title: 'Manage', tabBarIcon: ({ color, size }) => <Ionicons name="options" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size + 2} color={color} /> }}
      />
      
      {/* අභ්‍යන්තර Room Details පිටුව Tab එකක් ලෙස පෙන්වීම වළක්වයි */}
      <Tabs.Screen name="room/[id]" options={{ href: null }} />
    </Tabs>
  );
}