# FieldBook

Mobile-first workforce management for field teams and contractors. Track attendance, wages, advances, sites/projects, and weekly settlements with a fast, simple UI.

## Highlights
- Weekly wage settlements (every Tuesday)
- Daily attendance with multipliers (0.5×–2×)
- Advance payments with automatic multi-week deductions
- Site tracking (start dates, assignments, withdrawals)
- Extra expenses per employee

## Tech Stack
- React Native + Expo (Expo Router)
- Firebase Auth (native persistence)
- AsyncStorage for offline-first data
- Planned backend: Node.js/Express + PostgreSQL

## Quick Start
```bash
# Install dependencies
npm install

# Start the app
npx expo start

# Platform targets
npx expo start --android
npx expo start --ios
npx expo start --web
```

## Easy Android Builds (Cloud)
Use EAS to generate installable builds without Android Studio setup.
```bash
npm i -g eas-cli
eas login

# One-time setup
eas build:configure

# Production AAB (Play Store)
eas build -p android --profile production

# APK for quick testing
eas build -p android --profile preview
```
Tip: Manage secrets with `eas secret:create`. Ensure `android.package` and `ios.bundleIdentifier` are set in `app.json`.

## Environment
Create a `.env` (or set in your CI):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Project Structure
```
/app            # File-based routes (Expo Router)
components    # Reusable UI
context       # Global state
services      # Auth, storage, repositories
utils         # Dates, calculations, sample data
```

## Notes
- Mobile-first UX with minimal screens and touch-friendly controls
- Sensitive financial data: validate wage/settlement logic before release

## License
Proprietary. All rights reserved.