/**
 * This file is customizable BUT — do not remove:
 *   • `<AuthModal />` render (shipped v2 auth modal; removing it breaks
 *     signin/signup since useAuth().signIn() only flips state, not render)
 *   • `useAuth().initiate()` + `isReady` gate (loads persisted session from
 *     SecureStore — removing causes user to appear signed-out on app launch)
 *
 * Safe to change: the Stack routes, QueryClient config, splash behavior, the
 * wrapping providers, or to add nested providers around <Stack>.
 */
'use client';

import { ErrorBoundary } from '@/__create/ErrorBoundary';
import { useAuth } from '@/utils/auth/useAuth';
import { AuthModal } from '@/utils/auth/useAuthModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { withLayoutContext, useGlobalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { interpolate } from 'react-native-reanimated';
import Transition from 'react-native-screen-transitions';
import { createBlankStackNavigator } from 'react-native-screen-transitions/blank-stack';

void SplashScreen.preventAutoHideAsync();

const SPLASH_TIMEOUT_MS = 10_000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const { Navigator } = createBlankStackNavigator();
const TransitionStack = withLayoutContext(Navigator);

function useSharedTag() {
  const { tag } = useGlobalSearchParams();
  return typeof tag === 'string' ? tag : 'hero';
}

export default function RootLayout() {
  const { initiate, isReady } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const sharedBoundTag = useSharedTag();

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isReady || timedOut) {
      void SplashScreen.hideAsync();
    }
  }, [isReady, timedOut]);

  if (!isReady && !timedOut) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <TransitionStack screenOptions={{ headerShown: false } as any}>
            <TransitionStack.Screen
              name="(tabs)"
              options={{ ...Transition.Presets.SharedXImage({ sharedBoundTag }) }}
            />
            <TransitionStack.Screen
              name="onboarding"
              options={{ animation: 'slide_from_bottom' }}
            />
            <TransitionStack.Screen
              name="movie/[id]"
              options={{
                gestureEnabled: true,
                gestureDirection: 'vertical',
                ...Transition.Presets.SharedXImage({ sharedBoundTag }),
                screenStyleInterpolator: ({
                  focused,
                  bounds,
                  current,
                  layouts: { screen },
                  progress,
                }: any) => {
                  'worklet';
                  if (!focused) return {};
                  const boundValues = bounds({
                    id: sharedBoundTag,
                    method: 'transform',
                    raw: true,
                  });
                  const dragY = interpolate(
                    current.gesture.normalizedY,
                    [-1, 0, 1],
                    [-screen.height, 0, screen.height]
                  );
                  const contentY = interpolate(
                    progress,
                    [0, 1],
                    [dragY >= 0 ? screen.height : -screen.height, 0]
                  );
                  return {
                    [sharedBoundTag]: {
                      transform: [
                        { translateX: boundValues.translateX },
                        { translateY: boundValues.translateY },
                        { scaleX: boundValues.scaleX },
                        { scaleY: boundValues.scaleY },
                      ],
                    },
                    contentStyle: {
                      transform: [{ translateY: contentY }, { translateY: dragY }],
                      pointerEvents: current.animating ? 'none' : 'auto',
                    },
                  };
                },
              }}
            />
          </TransitionStack>
          <AuthModal />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
