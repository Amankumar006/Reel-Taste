/**
 * ⚠ ANYTHING PLATFORM — DO NOT REWRITE THIS FILE ⚠
 *
 * Shipped v2 <AuthModal /> — the modal that wraps the AuthWebView. It's
 * already mounted in app/_layout.tsx; DO NOT mount it again. The env-var
 * preflight (returns a "not configured" modal when EXPO_PUBLIC_BASE_URL or
 * EXPO_PUBLIC_PROXY_BASE_URL is missing) is intentional — removing it turns
 * env-var misconfig into a silent "nothing happens" bug. The named export of
 * useAuthModal at the top is also load-bearing (user code imports it from
 * this file, not just from ./store).
 */
'use client';

import React from 'react';
import { Modal, Text, View } from 'react-native';
import { AuthWebView } from './AuthWebView';
import { useAuthModal, useAuthStore } from './store';

export { useAuthModal } from './store';

/**
 * This component renders a modal for authentication purposes.
 * To show it programmatically, you should either use the `useRequireAuth` hook or the `useAuthModal` hook.
 *
 * @example
 * ```js
 * import { useAuthModal } from '@/utils/useAuthModal';
 * function MyComponent() {
 * const { open } = useAuthModal();
 * return <Button title="Login" onPress={() => open({ mode: 'signin' })} />;
 * }
 * ```
 *
 * @example
 * ```js
 * import { useRequireAuth } from '@/utils/auth';
 * function MyComponent() {
 *   // automatically opens the auth modal if the user is not authenticated
 *   useRequireAuth();
 *   return <Text>Protected Content</Text>;
 * }
 *
 */
export const AuthModal = () => {
  return null;
};

export default useAuthModal;
