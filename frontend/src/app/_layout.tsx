import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The gateway screen */}
      <Stack.Screen name="index" />
      {/* The student area */}
      <Stack.Screen name="student" />
      {/* The staff login and lecturer area */}
      <Stack.Screen name="staff" />
    </Stack>
  );
}