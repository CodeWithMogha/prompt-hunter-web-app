import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-key-for-dev",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-domain.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-bucket.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:0000000000:web:111111111"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services gracefully (will still throw errors if used, but won't crash the whole app on boot)
let authService, dbService, storageService;

try {
  authService = getAuth(app);
} catch { console.warn("Firebase Auth config missing/invalid."); }

try {
  dbService = getFirestore(app);
} catch { console.warn("Firestore config missing/invalid."); }

try {
  storageService = getStorage(app);
} catch { console.warn("Firebase Storage config missing/invalid."); }

export const auth = authService;
export const db = dbService;
export const storage = storageService;
export default app;
