# 🔧 Firebase Setup Instructions

## Current Status: ✅ Firestore Connected, ❌ Auth Setup Required

Great news! Your **Firestore connection is working perfectly**. You just need to enable Email/Password Authentication in the Firebase Console.

## 🚨 Quick Fix for Auth Error

You're getting the error: `Firebase: Error (auth/admin-restricted-operation)`

This means Email/Password Authentication is not enabled in your Firebase project.

### Step-by-Step Fix:

1. **Open Firebase Console**
   - Go to [console.firebase.google.com](https://console.firebase.google.com)
   - Select your project: **fieldbook-sudip**

2. **Navigate to Authentication**
   - In the left sidebar, click **"Authentication"**
   - If this is your first time, click **"Get started"**

3. **Enable Email/Password Sign-in**
   - Click on the **"Sign-in method"** tab
   - Find **"Email/Password"** in the list of providers
   - Click on **"Email/Password"**
   - Toggle the **"Enable"** switch to ON
   - Click **"Save"**

4. **Test Again**
   - Go back to your app and use the Register/Login screens
   - Verify you can create an account and sign in successfully

## 🔒 Security Rules (Optional for Testing)

For testing purposes, you might want to update your Firestore security rules:

1. Go to **Firestore Database** in Firebase Console
2. Click on **"Rules"** tab
3. Replace with this testing rule:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click **"Publish"**

## 📱 What This Enables

Once Email/Password Authentication is enabled:
- ✅ Users can sign in with their email and password
- ✅ Firestore security rules can authenticate users
- ✅ Your app can sync data to the cloud
- ✅ Offline/online data synchronization will work

## 🔗 Quick Links

- **Firebase Console**: [console.firebase.google.com](https://console.firebase.google.com)
- **Your Project**: fieldbook-sudip
- **Authentication Docs**: [firebase.google.com/docs/auth](https://firebase.google.com/docs/auth)

## 🆘 Still Having Issues?

If you continue to have problems:
1. Make sure you're signed into the correct Google account
2. Verify you have edit permissions for the Firebase project
3. Check that the project ID matches: `fieldbook-sudip`
4. Try refreshing the Firebase Console page

The fix should take less than 2 minutes! 🚀
