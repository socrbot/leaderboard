/**
 * nativeAuth.js
 *
 * Handles authentication on native iOS/Android builds via the
 * @capacitor-firebase/authentication plugin. Falls back gracefully to
 * the standard Firebase Web SDK on web.
 *
 * Usage in AuthContext:
 *   import { isNativePlatform, nativeSignInWithGoogle, nativeSignInWithApple } from './nativeAuth';
 */

import { Capacitor } from '@capacitor/core';

// Lazily import the native plugin so web builds never load native code.
let _FirebaseAuthentication = null;
async function getPlugin() {
  if (_FirebaseAuthentication) return _FirebaseAuthentication;
  const mod = await import('@capacitor-firebase/authentication');
  _FirebaseAuthentication = mod.FirebaseAuthentication;
  return _FirebaseAuthentication;
}

/** True when running inside a native iOS or Android shell */
export const isNativePlatform = () => Capacitor.isNativePlatform();

/** True when running on iOS specifically */
export const isIOS = () => Capacitor.getPlatform() === 'ios';

/**
 * Sign in with Google via the native Capacitor plugin.
 * Returns a Firebase credential object compatible with signInWithCredential().
 */
export async function nativeSignInWithGoogle(firebaseAuth, GoogleAuthProvider, signInWithCredential) {
  const plugin = await getPlugin();
  const result = await plugin.signInWithGoogle();
  const credential = GoogleAuthProvider.credential(
    result.credential?.idToken,
    result.credential?.accessToken,
  );
  return signInWithCredential(firebaseAuth, credential);
}

/**
 * Sign in with Apple via the native Capacitor plugin (iOS 13+).
 * Returns a Firebase UserCredential.
 *
 * Apple Sign-In requirements:
 *  - "Sign In with Apple" capability must be enabled in Xcode.
 *  - Apple Sign-In must be configured in Firebase Console → Authentication → Sign-in providers.
 *  - A valid Apple Services ID and private key must be registered in Apple Developer.
 */
export async function nativeSignInWithApple(firebaseAuth, OAuthProvider, signInWithCredential) {
  const plugin = await getPlugin();

  const result = await plugin.signInWithApple({
    scopes: ['name', 'email'],
  });

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: result.credential?.idToken,
    rawNonce: result.credential?.nonce,
  });

  return signInWithCredential(firebaseAuth, credential);
}

/**
 * Sign out via the native plugin (clears the native session too).
 * Only call this when running natively — web sign-out uses Firebase SDK directly.
 */
export async function nativeSignOut() {
  const plugin = await getPlugin();
  await plugin.signOut();
}
