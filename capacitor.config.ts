import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echochunk.app',
  appName: 'EchoChunk',
  webDir: 'public',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://speaking-english.taiphanvan.id.vn',
    cleartext: true,
    androidScheme: 'https',

    // Cho phép mở web ngay trong WebView, thay vì mở 1 external browser
    allowNavigation: [
      'speaking-english.taiphanvan.id.vn',
      '*.firebaseapp.com',
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
    ],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#37352f',
      sound: 'beep.wav',
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
