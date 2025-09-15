// app/firebase/firebaseConfig.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyC7Ld4NcW9ZxMYPlwp1Ck7cpOYinTKD58s",
    authDomain: "bloodbond-892f7.firebaseapp.com",
    projectId: "bloodbond-892f7",
    storageBucket: "bloodbond-892f7.firebasestorage.app",
    messagingSenderId: "589684037045",
    appId: "1:589684037045:web:6b9ca8fe3ac3d8269975fc",
    measurementId: "G-GZH3MCEQD3"
  };

// Google Sign-In client IDs for different platforms
export const googleClientIdIOS = "589684037045-b2vbga5vivhppo02i5sftv4vvkceu3on.apps.googleusercontent.com";
export const googleClientIdWeb = "589684037045-4s0uf5t7gr5vqtg7s7u1vudthicuf6an.apps.googleusercontent.com";

// Initialize Firebase app
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, 'gs://bloodbond-892f7.firebasestorage.app');
