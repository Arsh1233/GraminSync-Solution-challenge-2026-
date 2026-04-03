// Root layout with Expo Router - sets up navigation and providers
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { syncEngine } from "../services/sync-engine";

export default function RootLayout() {
  useEffect(() => {
    // Start the network-aware sync engine on app launch
    syncEngine.start();
    return () => syncEngine.stop();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#1B5E20" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="capture"
          options={{ title: "Capture Survey", presentation: "modal" }}
        />
        <Stack.Screen
          name="need/[id]"
          options={{ title: "Community Need" }}
        />
        <Stack.Screen
          name="volunteer/[id]"
          options={{ title: "Volunteer Profile" }}
        />
      </Stack>
    </>
  );
}
