/**
 * capacitor.ts
 *
 * Initialises Capacitor native plugins when running inside the iOS app.
 * Import and call `initNative()` once from your root layout (client-side only).
 *
 * This module is safe to import in SSR — all Capacitor APIs are gated behind
 * an `isNative()` check so they never run on the server or in a desktop browser.
 */

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor sets window.Capacitor when running inside a native shell.
  return !!(window as typeof window & { Capacitor?: { isNative?: boolean } })
    ?.Capacitor?.isNative;
}

/**
 * Call once at app start (client-side) to wire up push notifications,
 * status bar style, and splash screen dismissal.
 */
export async function initNative(): Promise<void> {
  if (!isNative()) return;

  const [{ StatusBar, Style }, { SplashScreen }, { PushNotifications }] =
    await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
      import('@capacitor/push-notifications'),
    ]);

  // Match the status bar to the app's light theme.
  await StatusBar.setStyle({ style: Style.Default }).catch(() => {});

  // Hide the splash screen (launchAutoHide handles this too, but being explicit
  // avoids a flicker if the web view loads slowly).
  await SplashScreen.hide().catch(() => {});

  // Request push notification permission and set up listeners.
  const { receive: permissionState } = await PushNotifications.checkPermissions();
  if (permissionState === 'prompt') {
    await PushNotifications.requestPermissions();
  }

  await PushNotifications.register().catch(() => {
    // Silently ignore — simulator doesn't support push; real devices do.
  });

  // Log the device token so you can wire it to Supabase later.
  PushNotifications.addListener('registration', (token) => {
    console.info('[Muster] Push registration token:', token.value);
    // TODO: save token.value to pace_profile_private via a server action
    //       so you can send targeted push notifications.
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Muster] Push registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.info('[Muster] Push received (foreground):', notification);
  });

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action) => {
      // Deep-link into the relevant plan when the user taps a notification.
      const planId = action.notification.data?.planId as string | undefined;
      if (planId) {
        window.location.href = `/muster/plan/${planId}`;
      }
    },
  );
}
