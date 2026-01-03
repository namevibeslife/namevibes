// Firebase core
import { initializeApp } from "firebase/app";

// Firebase services you are using
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Your Firebase configuration (direct values – OK for now)
const firebaseConfig = {
  apiKey: "AIzaSyAkU1zvysoWojve9q9v-jDJWUITbFSnIdc",
  authDomain: "namevibes-life.firebaseapp.com",
  projectId: "namevibes-life",
  storageBucket: "namevibes-life.firebasestorage.app",
  messagingSenderId: "231158578994",
  appId: "1:231158578994:web:31a4bf3ea093717b74e12b",
  measurementId: "G-0CYFVB0CFL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth providers
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export default app;
