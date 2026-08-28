import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

// Firebase configuration for the intopsmm project.
// The web API key is public by design; set VITE_FIREBASE_API_KEY in your
// project environment if you prefer not to hardcode it.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "intopsmm-3ef46.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "intopsmm-3ef46",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "intopsmm-3ef46.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "679756605495",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || "1:679756605495:web:89e1c8201e88984f36f7b2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5JJ5R0KDV2",
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0]!;
}

// Export the Auth instance for use throughout the app
export const firebaseAuth = getAuth(getFirebaseApp());
