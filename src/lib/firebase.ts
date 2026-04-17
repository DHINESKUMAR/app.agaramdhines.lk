import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_IFx9D75KnocfGLGH9sBDIaa3T0pTRn0",
  authDomain: "agaram-dhines-online-academy.firebaseapp.com",
  projectId: "agaram-dhines-online-academy",
  storageBucket: "agaram-dhines-online-academy.firebasestorage.app",
  messagingSenderId: "825909851431",
  appId: "1:825909851431:web:b68b641adcff92a2096502"
};

export const isFirebaseConfigured = true;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Secondary app for creating users without signing out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};
