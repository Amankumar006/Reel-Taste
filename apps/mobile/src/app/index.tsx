'use client';

import { Redirect } from 'expo-router';
import { usePreferences } from '@/utils/usePreferences';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { prefs, loaded } = usePreferences();

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#080f1e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  // Redirect to tabs if onboarded, else redirect to onboarding flow
  if (prefs.onboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
