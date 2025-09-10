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
  console.log('Initializing Firebase app...');
  app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
} else {
  console.log('Firebase app already exists, getting existing app');
  app = getApp();
}

// Initialize Firebase Auth
console.log('Initializing Firebase Auth...');
const auth = getAuth(app);
console.log('Firebase Auth initialized successfully');

export { auth };

console.log('Initializing Firestore...');
const db = getFirestore(app);
console.log('Firestore initialized successfully');

export { db };
