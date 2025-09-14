const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase config - copy from your firebaseConfig.ts
const firebaseConfig = {
  apiKey: "AIzaSyC7Ld4NcW9ZxMYPlwp1Ck7cpOYinTKD58s",
  authDomain: "bloodbond-892f7.firebaseapp.com",
  projectId: "bloodbond-892f7",
  storageBucket: "bloodbond-892f7.firebasestorage.app",
  messagingSenderId: "589684037045",
  appId: "1:589684037045:web:6b9ca8fe3ac3d8269975fc",
  measurementId: "G-GZH3MCEQD3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUserTokens(userId) {
  try {
    console.log('Checking tokens for userId:', userId);

    const userTokensRef = collection(db, 'userTokens');
    const q = query(userTokensRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);

    console.log('Found', snapshot.size, 'tokens for user');

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('Token:', {
        id: doc.id,
        userId: data.userId,
        platform: data.platform,
        token: data.token.substring(0, 50) + '...',
        createdAt: data.createdAt?.toDate(),
        active: data.active
      });
    });

    // Also check for web specifically
    const qWeb = query(userTokensRef, where('userId', '==', userId), where('platform', '==', 'web'));
    const snapshotWeb = await getDocs(qWeb);
    console.log('Found', snapshotWeb.size, 'web tokens for user');

  } catch (error) {
    console.error('Error checking tokens:', error);
  }
}

// Replace with the actual userId from the logs
checkUserTokens('QcuaHcDp0QXDwDdq9DgAF0q4S502');
