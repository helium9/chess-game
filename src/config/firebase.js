// Firebase configuration and initialization
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that all required environment variables are present
const requiredEnvVars = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

for (const key of requiredEnvVars) {
  if (!firebaseConfig[key]) {
    console.warn(`Missing environment variable for Firebase config: ${key}`);
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// For development: Connect to Firestore emulator if running locally
// Uncomment the line below if you want to use the Firebase emulator
// if (location.hostname === 'localhost') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

export { db };
export default app;
