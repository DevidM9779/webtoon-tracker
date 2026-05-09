import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDP7REaBQRx4Dm8lleHOFeWVMnFv83-jX4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "webtoon-tracker-demo.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "webtoon-tracker-demo",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "webtoon-tracker-demo.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "269783993373",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:269783993373:web:acff541183024022328af4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);
const auth = getAuth(app);

// Connect to local emulators (commented out for production)
// connectFirestoreEmulator(db, "127.0.0.1", 8080);
// connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

export { db, functions, auth };