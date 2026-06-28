import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for Pace iOS app.
 *
 * HOW THIS WORKS
 * ──────────────
 * Because Pace uses Next.js server actions and SSR, the mobile app loads
 * your *deployed* web app from a remote URL rather than bundling static files.
 * This is the standard Capacitor "live URL" pattern for SSR web apps.
 *
 * Before running `npm run cap:sync` you must:
 *   1. Deploy Pace to Vercel (or any HTTPS host).
 *   2. Replace the placeholder URL below with your real production URL.
 *
 * For local development you can temporarily swap the URL for your LAN address,
 * e.g. "http://192.168.1.x:3000", then restore it before a release build.
 */

const config: CapacitorConfig = {
  // Must be unique — use reverse-domain notation.
  // Change this before submitting to the App Store.
  appId: 'com.muster.app',

  // Display name shown on the iOS home screen.
  appName: 'Muster',

  // webDir is required by Capacitor even in server-URL mode.
  // It must be a real directory; we use `public` (always present in Next.js).
  webDir: 'public',

  server: {
    // ⚠️  Replace with your real Vercel / production URL before building.
    url: 'https://pace-roan-six.vercel.app',

    // Allow the WebView to follow HTTP→HTTPS redirects (Supabase auth callbacks etc.)
    androidScheme: 'https',
    cleartext: false,

    // Allow cookies and session storage to persist across WebView restarts.
    allowNavigation: [
      '*.supabase.co',
      '*.supabase.com',
      '*.openstreetmap.org',
    ],
  },

  ios: {
    // Lets Supabase Auth deep links (muster://auth/callback) work.
    // Register this scheme in App Store Connect → App Information too.
    scheme: 'muster',

    // Hide the iOS status bar background so Pace's own header shows edge-to-edge.
    backgroundColor: '#ffffff',

    // Scroll behaviour — disable native bounce so the app feels more native.
    scrollEnabled: true,

    // Content inset — 'automatic' respects the safe area on notched devices.
    contentInset: 'automatic',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      // These reference assets you'll add under ios/App/App/Assets.xcassets
      iosSpinnerStyle: 'small',
      showSpinner: false,
    },

    StatusBar: {
      style: 'Default',       // 'Default' | 'Light' | 'Dark'
      backgroundColor: '#ffffff',
    },

    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
