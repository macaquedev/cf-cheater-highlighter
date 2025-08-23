require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
// Save it as 'serviceAccountKey.json' in your project root
let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  console.error('❌ serviceAccountKey.json not found!');
  console.log('Please download your service account key from Firebase Console:');
  console.log('1. Go to Project Settings > Service Accounts');  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the file as "serviceAccountKey.json" in your project root');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateExistingCheaters() {
  console.log('Starting to update existing cheater documents with lastModified field...');
  
  try {
    const cheatersRef = db.collection('cheaters');
    const snapshot = await cheatersRef.where('markedForDeletion', '!=', false).get();
    
    if (snapshot.empty) {
      console.log('No cheater documents found to update.');
      return;
    }
    
    console.log(`Found ${snapshot.docs.length} cheater documents to update.`);
    
    const updatePromises = [];
    let updatedCount = 0;
    
    snapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      
      // Only update if lastModified field doesn't exist
      if (!data.lastModified || !data.markedForDeletion) {
        const updatePromise = docSnapshot.ref.update({
          lastModified: data.reportedAt || data.acceptedAt || new Date(),
          markedForDeletion: false,
        });
        updatePromises.push(updatePromise);
        updatedCount++;
      }
    });
    
    if (updatePromises.length === 0) {
      console.log('All cheater documents already have lastModified field.');
      return;
    }
    
    console.log(`Updating ${updatedCount} documents...`);
    
    // Update in batches to avoid overwhelming Firestore
    const batchSize = 500; // Firestore batch limit
    for (let i = 0; i < updatePromises.length; i += batchSize) {
      const batch = updatePromises.slice(i, i + batchSize);
      await Promise.all(batch);
      console.log(`Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updatePromises.length / batchSize)}`);
    }
    
    console.log(`Successfully updated ${updatedCount} cheater documents with lastModified field.`);
    console.log('You can now run the exportCheaters.js script with optimized queries.');
    
  } catch (error) {
    console.error('Failed to update existing cheaters:', error);
    process.exit(1);
  }
}

updateExistingCheaters().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
