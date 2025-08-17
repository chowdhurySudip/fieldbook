import { Stack } from "expo-router";
import { AppProvider } from "../context/AppContext";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
        {/* Show headers for non-tab screens */}
        <Stack.Screen name="employees/add" options={{ headerShown: true, title: "Add Employee" }} />
        <Stack.Screen name="employees/edit" options={{ headerShown: true, title: "Edit Employee" }} />
        <Stack.Screen name="employees/[employeeId]" options={{ headerShown: true, title: "Employee History" }} />
        <Stack.Screen name="sites/[siteId]" options={{ headerShown: true, title: "Site Details" }} />
        <Stack.Screen name="sites/add" options={{ headerShown: true, title: "Add Site" }} />
        <Stack.Screen name="attendance/entry" options={{ headerShown: true, title: "Daily Attendance" }} />
        <Stack.Screen name="settlements/[employeeId]" options={{ headerShown: true, title: "Settlement Details" }} />
      </Stack>
    </AppProvider>
  );
}
