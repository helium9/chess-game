# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "chess-game-p2p")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Firestore Database

1. In your Firebase project console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can change this later)
4. Select a location for your database (choose closest to your users)
5. Click "Done"

## 3. Get Firebase Configuration

1. In your Firebase project console, click the gear icon (⚙️) and select "Project settings"
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (</>)
4. Register your app with a nickname (e.g., "chess-game-web")
5. Copy the Firebase configuration object

## 4. Update Firebase Configuration

Replace the placeholder values in `src/config/firebase.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## 5. Set Up Firestore Security Rules (Optional for Development)

For development, you can use these permissive rules. **DO NOT use in production!**

Go to Firestore Database > Rules and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to calls collection for development
    match /calls/{callId} {
      allow read, write: if true;
      
      // Allow read/write access to subcollections
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
}
```

## 6. Production Security Rules (Recommended for Production)

For production, use more restrictive rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /calls/{callId} {
      // Allow anyone to read and write to call documents
      // In a real app, you might want to add authentication
      allow read, write: if true;
      
      // Allow access to ICE candidates collections
      match /offerCandidates/{candidateId} {
        allow read, write: if true;
      }
      
      match /answerCandidates/{candidateId} {
        allow read, write: if true;
      }
    }
  }
}
```

## 7. Environment Variables (Optional)

For better security, you can use environment variables by creating a `.env` file:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Then update `firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

## 8. Testing the Setup

1. Update your Firebase configuration in `src/config/firebase.js`
2. Start your development server: `npm run dev`
3. Open the app and test the "Start Game" functionality
4. Check the browser console for any Firebase connection errors
5. Verify that documents are being created in your Firestore console when you create a call

## Troubleshooting

- **"Firebase: No Firebase App '[DEFAULT]' has been created"**: Make sure you've properly configured firebase.js
- **Permission denied**: Check your Firestore security rules
- **Network errors**: Ensure your Firebase project is active and billing is set up (if required)
- **CORS errors**: Make sure you've added your domain to Firebase hosting (if using Firebase hosting)