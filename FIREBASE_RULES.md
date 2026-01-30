# 🛡️ Firebase Security Rules

Paste the following rules into your **Firebase Console > Firestore Database > Rules** tab to fix the permission errors.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read/write for now to make the app work immediately
    // You can make these more secure later
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### How to apply:
1. Open [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Click on **Firestore Database** in the left sidebar.
4. Click on the **Rules** tab at the top.
5. Delete everything there and paste the code above.
6. Click **Publish**.
