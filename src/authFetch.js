// src/authFetch.js
// Shared wrapper around fetch() that attaches a Firebase ID token when the
// user is signed in. Falls back to a plain fetch when no user is present
// (preserves behavior for truly public endpoints).
//
// On a hard page refresh, Firebase Auth needs a moment to rehydrate the
// signed-in user from IndexedDB. During that window `auth.currentUser` is
// null, which would cause gated requests to fire without a token and get
// 401'd. We await `auth.authStateReady()` once so callers always observe a
// settled auth state before the request goes out.
import { auth } from './firebaseConfig';

let authReadyPromise = null;
function whenAuthReady() {
  if (!authReadyPromise) {
    authReadyPromise = typeof auth.authStateReady === 'function'
      ? auth.authStateReady()
      : new Promise((resolve) => {
          const unsub = auth.onAuthStateChanged(() => {
            unsub();
            resolve();
          });
        });
  }
  return authReadyPromise;
}

export async function authFetch(input, init = {}) {
  try {
    await whenAuthReady();
  } catch (_e) { /* fall through — treat as anonymous */ }
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      const headers = new Headers(init.headers || {});
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      init = { ...init, headers };
    } catch (err) {
      // If the token fetch fails, fall through to an unauthenticated request.
      // eslint-disable-next-line no-console
      console.warn('authFetch: failed to get ID token', err);
    }
  }
  return fetch(input, init);
}

export default authFetch;
