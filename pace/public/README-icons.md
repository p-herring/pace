# Pace — App Icon & Splash Screen Assets

Place your production icon files here, then run `npm run cap:sync` to copy them into the Xcode project.

## iOS App Icon

Apple requires a single 1024×1024 px PNG with no transparency, no rounded corners
(Xcode masks it automatically). Name it `icon.png` and drop it here.

Capacitor's `@capacitor/assets` tool can then generate every required size:

```
npx @capacitor/assets generate --ios
```

This outputs all the required sizes into `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.

### Required sizes (generated automatically by the command above)

| Size | Usage |
|------|-------|
| 20×20 @1x/2x/3x | Notification |
| 29×29 @1x/2x/3x | Settings |
| 40×40 @1x/2x/3x | Spotlight |
| 60×60 @2x/3x | Home screen (iPhone) |
| 76×76 @1x/2x | Home screen (iPad) |
| 83.5×83.5 @2x | iPad Pro |
| 1024×1024 @1x | App Store listing |

## Splash Screen

Place a `splash.png` (2732×2732 px, PNG, safe content in the centre 1200×1200 area)
in this folder, then run:

```
npx @capacitor/assets generate --ios
```

## Design notes for the Pace brand

- Background: white `#ffffff`  
- Icon mark: the Pace logomark centred, at least 512px tall  
- No text in the icon — the app name appears automatically below the icon on iOS  
- Keep the icon simple — it renders at 29×29 px on the Settings screen  
