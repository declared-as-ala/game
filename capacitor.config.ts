import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.satisfyball.game',
  appName: 'SatisfyBall',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  backgroundColor: '#07070c',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#07070c',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07070c'
    }
  }
};

export default config;
