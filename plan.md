GitHub Copilot

Here’s the ordered plan to implement your requirements.

1) Prep and Firebase configuration
- Enable Auth providers in Firebase Console: Email/Password (and optionally Google/Phone later).
- Add Firestore Database (Start in production mode).
- Add Firestore security rules for per-user isolation:
  - match /databases/{db}/documents/users/{uid}/{coll=**}/{docId} { allow read, write: if request.auth != null && request.auth.uid == uid }
- Move Firebase config to env (EXPO_PUBLIC_*), read them in firebase.ts.
- Keep the existing Firebase Web SDK for now; we will layer our own offline cache and sync.

2) Design user-facing auth UX
- Add Register screen (email, password, name).
- Update Login screen to use email/password (replace demo creds).
- Add “Forgot password” link (sendPasswordResetEmail).
- Add minimal profile UI (name, logout).

3) Implement Auth service
- Create `services/auth.ts`:
  - register(email, password, name): createUserWithEmailAndPassword, updateProfile, create user profile doc at `users/{uid}`.
  - login(email, password), logout().
  - onAuthStateChanged listener to drive app state.
- Replace local demo login in `AppContext` with Firebase auth listener:
  - When user logs in: store a minimal user session in state using Firebase `currentUser`.
  - When user logs out: clear state and local caches.

4) Define Firestore data model (per-user isolation)
- Store all user data under `users/{uid}/...`:
  - users/{uid}/employees
  - users/{uid}/sites
  - users/{uid}/attendance
  - users/{uid}/payments
  - users/{uid}/meta (optional: lastSyncAt, migrations)
- Add server timestamps:
  - createdAt: serverTimestamp()
  - updatedAt: serverTimestamp()
- Add soft-delete flags where needed for conflict-safe deletes (deleted: true, deletedAt).

5) Introduce a user-scoped local cache
- Namespaced AsyncStorage keys by uid (prefix every key with `${uid}::`).
- Update `StorageService` to accept a dynamic keyPrefix (set after auth).
- Make `lastSyncAt` per-user (namespaced key).
- Ensure all local sets/gets route through the namespaced storage.

6) Create a Data Access layer per entity
- `services/repositories/` (employeesRepo, sitesRepo, attendanceRepo, paymentsRepo):
  - CRUD functions that operate both on local cache and Firestore.
  - Use serverTimestamp on writes to Firestore; mirror writes locally with updatedAt (Date.now()).
- Centralize document conversion (Date <-> Timestamp).

7) Build a Sync service (automatic, resilient)
- `services/sync.ts`:
  - Maintain `lastSyncAt` per-user.
  - Pull: query Firestore for docs with updatedAt > lastSyncAt; merge into local cache.
  - Push: find local changes with updatedAt > lastSyncedAt and not yet pushed; batch write to Firestore.
  - Conflict strategy: last-write-wins on updatedAt; use soft-delete for deletes.
  - Use exponential backoff on failures; record sync stats and errors.
- Triggers:
  - onAuthStateChanged -> initial full sync.
  - App foreground (AppState change) -> incremental sync.
  - Interval timer while app is active (e.g., every 60s, debounced).
  - Manual “Sync now” action in Settings if needed.

8) Wire Sync into AppContext
- After login and on app start (when user is present):
  - Initialize namespaced StorageService with uid.
  - Load local cache into state.
  - Start sync loop (pull then push).
- After logout:
  - Stop sync loop.
  - Clear in-memory state; optionally keep local data to support offline re-login of same user, or purge based on your policy.

9) Migrate existing local data (one-time)
- On first Firebase login for a user:
  - Detect legacy non-namespaced keys.
  - Offer to migrate them into the logged-in user’s namespace and push to Firestore.
  - Record a migration flag under `users/{uid}/meta`.

10) Update navigation guards
- index.tsx should rely on Firebase auth state (via AppContext) to route to login or tabs.
- Replace current demo user check with `firebaseUser != null`.

11) Implement robust Firestore rules
- Validate shapes and constraints:
  - Employees: required fields, numeric ranges, owner path must match request.auth.uid.
  - Attendance/payment write rules ensure only under `users/{uid}/...`.
- Add composite indexes if needed (queries by employeeId/date).

12) Observability and error handling
- Centralized error/toast reporting on sync/auth failures.
- Log sync results (success/fail counts, retry schedule) in dev mode.
- Add a small “sync status” indicator in UI (optional).

13) Testing
- Unit tests for repos and sync diff/merge logic.
- Manual tests:
  - Register/login, data isolation across two users.
  - Offline create/update/delete, then reconnection sync.
  - Conflict scenario with stale local data.
- Firebase Emulator Suite (optional) for local integration tests.

14) Performance and best practices
- Batch writes for push sync; paginate pull (limit + updatedAt cursor).
- Debounce rapid local updates; coalesce multiple changes.
- Avoid heavy onSnapshot for large collections on mobile; prefer periodic pull + targeted listeners where necessary.

15) Rollout plan
- Ship behind a feature flag if desired.
- Provide a one-time migration path dialog for existing users.
- Monitor crash/error logs and Firestore usage after release.