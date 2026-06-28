# Pace — App Store Submission Guide

This document walks from zero to a live App Store listing.
Everything in `pace/` is already wired for Capacitor; this guide covers the steps
you do outside the codebase (Apple accounts, Xcode, App Store Connect).

---

## Prerequisites

| What | Where |
|------|-------|
| Mac with macOS Ventura 13+ | Required by Xcode |
| Xcode 16+ | [Mac App Store](https://apps.apple.com/app/xcode/id497799835) |
| Apple Developer account ($99/year) | [developer.apple.com/enroll](https://developer.apple.com/enroll/) |
| Pace deployed to Vercel (or similar HTTPS host) | See your Vercel dashboard |
| Node 20+ | `node --version` |

---

## Step 1 — Apple Developer enrolment

1. Go to [developer.apple.com/enroll](https://developer.apple.com/enroll/).
2. Sign in with your Apple ID (or create one).
3. Choose **Individual** (or **Organisation** if you're registering a company).
4. Pay the $99 USD annual fee.
5. Allow 24–48 hours for approval.

---

## Step 2 — Deploy Pace to Vercel

1. Push the repo to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new).
3. Add environment variables in Vercel → Project → Settings → Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_APP_URL=https://YOUR_PACE_APP.vercel.app
   ```
4. Deploy. Note your production URL, e.g. `https://pace-beta.vercel.app`.

---

## Step 3 — Update capacitor.config.ts

Open `capacitor.config.ts` and replace the placeholder URL:

```ts
server: {
  url: 'https://pace-beta.vercel.app',   // ← your real URL
  ...
}
```

Also update Supabase Auth redirect URLs (Supabase dashboard → Authentication → URL Configuration):

- **Site URL**: `https://pace-beta.vercel.app`
- **Redirect URLs**: add `pace://auth/callback` (the deep-link scheme from capacitor.config.ts)

---

## Step 4 — Generate the iOS Xcode project

On your Mac, in the `pace/` folder:

```bash
npm install
npm run cap:sync        # builds Next.js then syncs into ios/
```

If `ios/` doesn't exist yet:

```bash
npx cap add ios
npm run cap:sync
```

---

## Step 5 — App icon & splash screen

1. Create a 1024×1024 px PNG of the Pace icon (see `public/README-icons.md`).
2. Save it as `public/icon.png`.
3. Create a 2732×2732 px splash PNG, save as `public/splash.png`.
4. Run:
   ```bash
   npx @capacitor/assets generate --ios
   ```
5. Sync again:
   ```bash
   npm run cap:sync
   ```

---

## Step 6 — Configure the Xcode project

```bash
npm run cap:open        # opens ios/App/App.xcworkspace in Xcode
```

In Xcode:

1. **Signing & Capabilities** → select your Apple Developer team.
2. **Bundle Identifier**: set to `com.pace.app` (must match `capacitor.config.ts`).
3. **Version**: set to `1.0.0`; **Build**: `1`.
4. **Deployment Target**: iOS 16.0.
5. Add capabilities:
   - **Push Notifications** (for `@capacitor/push-notifications`)
   - **Associated Domains** — add `applinks:YOUR_PACE_APP.vercel.app`
     (enables Universal Links for Supabase email confirmation deep links)

### Info.plist entries to add

Open `ios/App/App/Info.plist` and add:

```xml
<!-- Deep-link URL scheme (Supabase Auth callback) -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>pace</string>
    </array>
  </dict>
</array>

<!-- Camera / Photo Library (if you add avatar/photo upload) -->
<key>NSCameraUsageDescription</key>
<string>Pace uses your camera to set a profile photo.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pace accesses your photo library to set a profile photo.</string>

<!-- Location (if you add "near me" plan discovery) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Pace uses your location to show plans near you.</string>
```

---

## Step 7 — Test on a real device / TestFlight

1. Connect an iPhone via USB.
2. In Xcode → scheme selector, choose your device.
3. Press **Run** (▶). The app should open on your phone.
4. Test sign-up, email verification, onboarding, plan creation and joining.

To distribute to beta testers via TestFlight:

1. Xcode → **Product → Archive**.
2. In the Organiser window, click **Distribute App → TestFlight & App Store**.
3. Follow the upload wizard. The build appears in App Store Connect within ~15 minutes.

---

## Step 8 — App Store Connect listing

Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+** → New App.

### Metadata to prepare

**Name**: Pace  
**Subtitle** (30 chars): Find your people to move with  
**Category**: Primary — Health & Fitness; Secondary — Sports  
**Age Rating**: 12+ (for meetups with strangers; select "Infrequent/Mild" for Social Networking)

**Description** (up to 4 000 chars — draft):

> Pace is for people who move better together.
> 
> Post a run, ride or swim — sport, time, pace, suburb — and let your people find you. Join a plan from the feed, get confirmed, and unlock the exact meeting spot. Simple, focused, safe.
> 
> **Find your crew**
> Browse open plans by sport and time. Join instantly or request a spot. Waitlists are first-come, first-served.
> 
> **Host a plan**
> Set sport, distance, target pace, public meeting suburb and exact meeting point. Control capacity and approval. The precise location is only revealed to confirmed participants.
> 
> **Safety first**
> Every member verifies their email before hosting or joining. Report any plan directly from the feed. Account deletion is instant and complete.
> 
> Pace is currently in beta, focused on Perth, Western Australia.

**Keywords** (100 chars): running,cycling,swimming,workout,partner,group run,fitness,meetup,Perth,pace,sport,community

**Privacy Policy URL**: `https://YOUR_PACE_APP.vercel.app/privacy`

**Support URL**: your email or a support page

### Screenshots

Apple requires screenshots for:
- iPhone 6.9" (iPhone 16 Pro Max) — 1320×2868 px
- iPhone 6.7" (iPhone 14 Plus / 15 Plus) — 1290×2796 px
- iPad Pro 13" — 2064×2752 px (required if you support iPad)

Tip: run the app in an iPhone 16 Pro Max simulator, use Xcode → Simulator → File → Take Screenshot.

---

## Step 9 — Submit for review

1. In App Store Connect, select your build (uploaded in Step 7).
2. Fill all metadata fields.
3. Under **App Review Information**, add a demo account:
   - Email: a real Pace test account
   - Password: a test password
4. Add a note: "Pace is a community app for finding running/cycling/swimming partners. The exact meeting location is only revealed to confirmed participants."
5. Click **Submit for Review**.

Apple's review typically takes 24–48 hours for a first submission.

---

## Common rejection reasons & fixes

| Rejection | Fix |
|-----------|-----|
| "App is primarily a web browser" | Ensure the app has native features enabled (push notifications is sufficient). You've already added `@capacitor/push-notifications`. |
| "Missing privacy policy" | Make sure `/privacy` is live and the URL is correct in App Store Connect. |
| "Crash on launch" | Test on a real device, not just simulator. Check `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel. |
| "Sign in with Apple required" | Only needed if you offer other third-party sign-in (e.g., Google). Email/password is exempt. |
| "Demo account doesn't work" | Use a real verified Pace account as the demo credentials. |

---

## Keeping the app up to date

Because Pace loads from your Vercel deployment, **most updates ship instantly** — just
push to Vercel and every user gets the new version without an App Store release.

You only need to cut a new App Store build when you:
- Change native Capacitor plugins
- Update `capacitor.config.ts`
- Change `Info.plist` entries
- Bump the iOS deployment target

For those changes: bump the **Build** number in Xcode, archive, upload via TestFlight, then submit.
