import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB_IFx9D75KnocfGLGH9sBDIaa3T0pTRn0",
  authDomain: "agaram-dhines-online-academy.firebaseapp.com",
  projectId: "agaram-dhines-online-academy",
  storageBucket: "agaram-dhines-online-academy.firebasestorage.app",
  messagingSenderId: "825909851431",
  appId: "1:825909851431:web:add4be35e13e113d096502"
};

// Firebase-ஐத் தொடங்குதல்
const app = initializeApp(firebaseConfig);

// மாணவர் சேர்க்கை மற்றும் லாகின் செய்ய இவை அவசியம்
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
