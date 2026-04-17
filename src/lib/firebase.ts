import { initializeApp, getApps, getApp } from "firebase/app";
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

// ஏற்கனவே App தொடங்கப்பட்டிருந்தால் அதையே பயன்படுத்தவும் (பிழையைத் தவிர்க்க இது அவசியம்)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// மற்ற பக்கங்களில் பயன்படுத்த இவற்றை Export செய்கிறோம்
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
export default app;
