// app/firebase/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyA8Cd-czxRaLw-Lv-o7T34kAOgahGwCSVc",
    authDomain: "bloodbond-892f7.firebaseapp.com",
    projectId: "bloodbond-892f7",
    storageBucket: "bloodbond-892f7.firebasestorage.app",
    messagingSenderId: "589684037045",
    appId: "1:589684037045:web:6b9ca8fe3ac3d8269975fc",
    measurementId: "G-GZH3MCEQD3"
  };

// Initialize Firebase app only if not already initialized
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase Auth
const auth = getAuth(app);

export { auth };

const db = getFirestore(app);

export { db };