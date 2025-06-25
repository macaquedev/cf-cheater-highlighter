require('dotenv').config();
const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config (from your .env)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function exportCheaters() {
  const cheatersRef = collection(db, 'cheaters');
  const snapshot = await getDocs(cheatersRef);
  const cheaters = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.username) cheaters.push(data.username);
  });

  const output = { cheaters };
  fs.writeFileSync('cheaters.json', JSON.stringify(output, null, 2));
  console.log('Exported cheaters to cheaters.json');
}

exportCheaters().catch(err => {
  console.error('Failed to export cheaters:', err);
  process.exit(1);
});
