/**
 * Firebase client configuration for Google Sign-In.
 *
 * Values can be overridden with VITE_FIREBASE_* env vars; otherwise the
 * project's own web config (below) is used. Firebase web API keys are public
 * identifiers — they are safe to ship in client code. Access is controlled by
 * the Authorized Domains list in the Firebase console.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "intopsmm-3ef46.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "intopsmm-3ef46",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "intopsmm-3ef46.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "679756605495",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || "1:679756605495:web:89e1c8201e88984f36f7b2",
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
