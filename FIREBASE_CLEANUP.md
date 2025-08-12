# Firebase Test Utilities Cleanup

The temporary Firebase test utilities have been removed to streamline the app:

Removed/updated:
- services/firebaseTest.ts (removed from exports)
- app/firebase-test.tsx (deprecated and auto-navigates back)
- Dashboard quick action button (removed)
- README: demo credentials and sample data references removed
- FIREBASE_SETUP.md: updated to reflect removal of test screen

No functional impact on production flows (auth, data, sync).
