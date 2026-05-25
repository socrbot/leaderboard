// src/authFetch.js
// Shared wrapper around fetch() that attaches a Firebase ID token when the
// user is signed in. Falls back to a plain fetch when no user is present
// (preserves behavior for truly public endpoints).
import { auth } from './firebaseConfig';

export async function authFetch(input, init = {}) {
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
