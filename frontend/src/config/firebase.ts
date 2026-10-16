import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyA32n3VOQS_uP794kW4V3-7Wg-4yosKlqw",
  authDomain: "comfortsense.firebaseapp.com",
  projectId: "comfortsense",
  storageBucket: "comfortsense.firebasestorage.app",
  messagingSenderId: "949163460698",
  appId: "1:949163460698:web:9b256a18f5b69e73cdf063"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database and auth modules
export const db = getFirestore(app);
export const auth = getAuth(app);