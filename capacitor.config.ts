import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thesundaycup.app',
  appName: 'The Sunday Cup',
  webDir: 'build',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // PASTE YOUR WEB CLIENT ID HERE (NOT the Android Client ID)
      serverClientId: '1056126670188-t68f2nphv8dn1jr1aclusaogbk625ngs.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'leaderboard-backend-628169335141.us-east1.run.app',
      'leaderboard-backend-staging-1056126670188.us-east1.run.app',
      '*.firebaseapp.com',
      '*.web.app',
      '*.googleapis.com',
      'accounts.google.com'
    ]
  }
};

export default config;
