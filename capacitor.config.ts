import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alumnigolf.leaderboard',
  appName: 'Alumni Leaderboard',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    // Allow the WebView to navigate to (and load resources from) our Cloud Run
    // backends and Firebase Auth. Without this, Firebase popup/redirect URLs
    // and backend XHRs would be blocked or treated as external.
    allowNavigation: [
      'leaderboard-backend-628169335141.us-east1.run.app',
      'leaderboard-backend-staging-1056126670188.us-east1.run.app',
      '*.firebaseapp.com',
      '*.web.app',
      '*.googleapis.com',
      'accounts.google.com'
    ]
  },
  android: {
    // Avoid http cleartext by default; backend is https only.
    allowMixedContent: false
  }
};

export default config;
