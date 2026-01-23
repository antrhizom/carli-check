import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Firebase Konfiguration
const firebaseConfig = {
  apiKey: "AIzaSyDljNePNIP2nw_G6YaRoUGU5tOYWDbigvg",
  authDomain: "carli-check.firebaseapp.com",
  projectId: "carli-check",
  storageBucket: "carli-check.firebasestorage.app",
  messagingSenderId: "185263216821",
  appId: "1:185263216821:web:3e229798733fa29edac6fc"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);

// Services exportieren
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'europe-west6'); // Schweiz Region

export default app;
