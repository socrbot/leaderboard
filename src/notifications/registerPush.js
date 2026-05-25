// Push notification registration for the draft workflow.
//
// On native (Capacitor Android/iOS) we use @capacitor-firebase/messaging to
// request permission, retrieve the FCM token, and POST it to the backend.
// On web we no-op for now — web push needs a service worker + VAPID key which
// is a separate setup we'll add later if/when we want browser notifications.

import { Capacitor } from '@capacitor/core';
import { authFetch } from '../authFetch';
import { BACKEND_BASE_URL } from '../apiConfig';

let registeredToken = null;
let listenersAttached = false;

async function postToken(token, platform) {
  try {
    await authFetch(`${BACKEND_BASE_URL}/user/fcm_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform }),
    });
    registeredToken = token;
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
    return; // Web no-op
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
        // eslint-disable-next-line no-console
        console.log('Notification (foreground):', event);
      });

      // User tapped a notification — could be used to deep-link into the
      // tournament. Left as a hook; routing is currently top-level state.
      FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
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
  if (!Capacitor.isNativePlatform()) return;
  const token = registeredToken;
  registeredToken = null;
  await deleteToken(token);
}
