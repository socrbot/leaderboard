// Push notification registration for the draft workflow.
//
// On native (Capacitor Android/iOS) we use @capacitor-firebase/messaging to
// request permission, retrieve the FCM token, and POST it to the backend.
// On web we use Firebase web messaging with the app service worker.

import { Capacitor } from '@capacitor/core';
import { authFetch } from '../authFetch';
import { BACKEND_BASE_URL } from '../apiConfig';
import app from '../firebaseConfig';
import { getMessaging, getToken as getWebToken, onMessage, deleteToken as deleteWebToken, isSupported } from 'firebase/messaging';

let registeredToken = null;
let listenersAttached = false;
const TOKEN_STORAGE_KEY = 'fcmRegisteredToken';
const FOREGROUND_EVENT_NAME = 'leaderboard:push-foreground';
const ACTION_EVENT_NAME = 'leaderboard:push-action';

try {
  if (!registeredToken && typeof window !== 'undefined' && window.localStorage) {
    registeredToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  }
} catch {
  // Ignore storage unavailability (private mode, disabled storage, etc).
}

function cacheRegisteredToken(token) {
  registeredToken = token || null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

function emitForegroundNotification(payload) {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(FOREGROUND_EVENT_NAME, { detail: payload }));
  } catch {
    // Non-fatal.
  }
}

function emitPushAction(payload) {
  try {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(ACTION_EVENT_NAME, { detail: payload }));
  } catch {
    // Non-fatal.
  }
}

async function postToken(token, platform) {
  try {
    await authFetch(`${BACKEND_BASE_URL}/user/fcm_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform }),
    });
    cacheRegisteredToken(token);
  } catch (err) {
    // Non-fatal: notifications just won't arrive on this device.
    // eslint-disable-next-line no-console
    console.warn('FCM token register failed:', err);
  }
}

async function deleteToken(token) {
  if (!token) return;
  try {
    await authFetch(`${BACKEND_BASE_URL}/user/fcm_token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('FCM token unregister failed:', err);
  }
}

export async function registerPush() {
  if (!Capacitor.isNativePlatform()) {
    try {
      const supported = await isSupported();
      if (!supported || typeof window === 'undefined' || typeof Notification === 'undefined') return;

      const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        // eslint-disable-next-line no-console
        console.warn('Web push skipped: missing REACT_APP_FIREBASE_VAPID_KEY');
        return;
      }

      if (!('serviceWorker' in navigator)) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      const token = await getWebToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        await postToken(token, 'web');
      }

      if (!listenersAttached) {
        listenersAttached = true;
        onMessage(messaging, (payload) => {
          emitForegroundNotification(payload);
        });

        if (navigator?.serviceWorker) {
          navigator.serviceWorker.addEventListener('message', (event) => {
            const message = event?.data;
            if (message?.type === 'notification_click') {
              emitPushAction(message?.payload || null);
            }
          });
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('registerPush (web) failed:', err);
    }
    return;
  }

  let FirebaseMessaging;
  try {
    ({ FirebaseMessaging } = await import('@capacitor-firebase/messaging'));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('FirebaseMessaging plugin not available:', err);
    return;
  }

  try {
    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== 'granted') return;

    const { token } = await FirebaseMessaging.getToken();
    if (!token) return;

    const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
    await postToken(token, platform);

    if (!listenersAttached) {
      listenersAttached = true;

      // Token rotation — re-register the new one.
      FirebaseMessaging.addListener('tokenReceived', async (event) => {
        if (event?.token && event.token !== registeredToken) {
          await postToken(event.token, Capacitor.getPlatform());
        }
      });

      // Foreground notifications — log for now; we can wire to a toast later.
      FirebaseMessaging.addListener('notificationReceived', (event) => {
        emitForegroundNotification(event);
        // eslint-disable-next-line no-console
        console.log('Notification (foreground):', event);
      });

      // User tapped a notification — could be used to deep-link into the
      // tournament. Left as a hook; routing is currently top-level state.
      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
        emitPushAction(event);
        // eslint-disable-next-line no-console
        console.log('Notification tapped:', event);
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('registerPush failed:', err);
  }
}

export async function unregisterPush() {
  if (!Capacitor.isNativePlatform()) {
    const token = registeredToken;
    cacheRegisteredToken(null);
    if (token) {
      await deleteToken(token);
    }
    try {
      const supported = await isSupported();
      if (!supported) return;
      const messaging = getMessaging(app);
      await deleteWebToken(messaging);
    } catch {
      // Non-fatal.
    }
    return;
  }

  const token = registeredToken;
  cacheRegisteredToken(null);
  await deleteToken(token);
}

export function onForegroundPush(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  const listener = (event) => {
    handler(event?.detail || null);
  };

  window.addEventListener(FOREGROUND_EVENT_NAME, listener);
  return () => window.removeEventListener(FOREGROUND_EVENT_NAME, listener);
}

export function onPushAction(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  const listener = (event) => {
    handler(event?.detail || null);
  };

  window.addEventListener(ACTION_EVENT_NAME, listener);
  return () => window.removeEventListener(ACTION_EVENT_NAME, listener);
}
