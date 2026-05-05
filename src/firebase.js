import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDP7REaBQRx4Dm8lleHOFeWVMnFv83-jX4",
  authDomain: "webtoon-tracker-demo.firebaseapp.com",
  projectId: "webtoon-tracker-demo",
  storageBucket: "webtoon-tracker-demo.firebasestorage.app",
  messagingSenderId: "269783993373",
  appId: "1:269783993373:web:acff541183024022328af4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const functions = getFunctions(app);
const auth = getAuth(app);

// Connect to local emulators
// connectFirestoreEmulator(db, "127.0.0.1", 8080);
// connectFunctionsEmulator(functions, "127.0.0.1", 5001);
// connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });

export { db, functions, auth };