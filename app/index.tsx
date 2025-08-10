import { Redirect } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useApp } from "../context/AppContext";

export default function Index() {
  const { state } = useApp();

  useEffect(() => {
    // App initialization logic here
  }, []);

  if (state.isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (state.user?.isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="./login" />;
  }
}
