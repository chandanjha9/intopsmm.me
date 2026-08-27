import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration (provided by the developer)
const firebaseConfig = {
  apiKey: "AIzaSyBt9nCHLGWkxv5Z8Mh02M3Ie1cSvWaWpKY",
  authDomain: "growmesmm-2aba5.firebaseapp.com",
  projectId: "growmesmm-2aba5",
  storageBucket: "growmesmm-2aba5.firebasestorage.app",
  messagingSenderId: "976888710727",
  appId: "1:976888710727:web:e68f14b163c4663f529362",
  measurementId: "G-BGTTQR38JN",
};

// Initialize Firebase app
const firebaseApp = initializeApp(firebaseConfig);

// Export the Auth instance for use throughout the app
export const firebaseAuth = getAuth(firebaseApp);
