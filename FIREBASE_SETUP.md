# Firebase Setup (Updated)

This document previously described in-app Firebase test utilities and a dedicated test screen. Those have been removed.

Current status:
- Firebase is initialized in `services/firebase.ts` using environment variables.
- Authentication uses Email/Password via Firebase Auth.
- Per-user data is stored under `users/{uid}/...` in Firestore with secure rules.
- App data syncs automatically with offline support and conflict resolution.

Getting started:
1. Ensure your Firebase project is configured and Email/Password provider is enabled.
2. Set environment variables used by `services/firebase.ts`.
3. Run the app normally and register/login from the UI.

Notes:
- Anonymous authentication and the `/firebase-test` screen were removed.
- The dashboard no longer includes a Firebase Test button.
- For troubleshooting, use Firebase Console and device logs instead of the old test screen.
