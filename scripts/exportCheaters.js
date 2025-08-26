require('dotenv').config();
const fs = require('fs');
const admin = require('firebase-admin');

let serviceAccount;
try {
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  if (error?.code === "MODULE_NOT_FOUND") {
    console.error('❌ serviceAccountKey.json not found!');
    console.log('Please ensure that serviceAccountKey.json is located in the project root');
  } else {
    console.error(error);
  }
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function exportCheaters() {
  console.log('🚀 Starting cheater export process...');

  try {
    // Read existing cheaters.json to get last export time
    let cheatersData = { cheaters: [], lastExportTime: null };
    if (fs.existsSync('./cheaters.json')) {
      try {
        const existingData = JSON.parse(fs.readFileSync('./cheaters.json', 'utf8'));
        
        // Handle different possible data structures
        if (existingData.cheaters && Array.isArray(existingData.cheaters)) {
          // New format with cheaters array
          cheatersData = existingData;
          console.log(`📖 Found existing cheaters.json with ${cheatersData.cheaters.length} cheaters`);
        } else if (Array.isArray(existingData)) {
          // Old format with just array of usernames
          cheatersData.cheaters = existingData;
          console.log(`📖 Found existing cheaters.json with ${cheatersData.cheaters.length} cheaters (old format)`);
        } else {
          // Unknown format
          console.error('⚠️ Invalid format for cheaters.json');
          process.exit(1);
        }
      } catch (error) {
        console.log('⚠️ Error reading existing cheaters.json');
        console.log(error);
        process.exit(1);
      }
    }

    const lastExportTime = cheatersData.lastExportTime;
    const existingCheaters = new Set(cheatersData.cheaters);

    // Build query based on last export time
    let cheatersQuery;
    if (lastExportTime) {
      // Only get documents modified after last export
      cheatersQuery = db.collection('cheaters')
        .where('lastModified', '>', new Date(lastExportTime))
        .orderBy('lastModified', 'asc');
      console.log(`🔍 Querying for documents modified after: ${new Date(lastExportTime).toISOString()}`);
    } else {
      // First time export - get all documents
      cheatersQuery = db.collection('cheaters').orderBy('lastModified', 'asc');
      console.log('🆕 First time export - querying all documents');
    }

    const snapshot = await cheatersQuery.get();
    const cheatersToAdd = [];
    const cheatersToRemove = [];
    
    console.log(`📊 Found ${snapshot.docs.length} modified documents`);
    
    // Process each modified document
    snapshot.forEach(doc => {
      const cheaterData = doc.data();
      const username = cheaterData.username;
      if (!username) return;
      if (cheaterData.markedForDeletion) {
        cheatersToRemove.push({ username, docId: doc.id });
      } else {
        // Document is added
        cheatersToAdd.push(username);
      }
    });

    // Remove cheaters marked for deletion from Firestore
    if (cheatersToRemove.length > 0) {
      console.log(`🗑️  Cleaning up ${cheatersToRemove.length} documents marked for deletion...`);
      
      // Delete in batches to avoid overwhelming Firestore
      const batchSize = 500; // Firestore batch limit
      
      for (let i = 0; i < cheatersToRemove.length; i += batchSize) {
        const batch = db.batch();
        const batchDocs = cheatersToRemove.slice(i, i + batchSize);
        batchDocs.forEach(({ docId }) => {
          const docRef = db.collection('cheaters').doc(docId);
          batch.delete(docRef);
        });
        
        await batch.commit();
        console.log(`🗑️  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cheatersToRemove.length / batchSize)}: ${batchDocs.length} documents`);
      }
      console.log(`✅ Successfully deleted ${cheatersToRemove.length} cheater documents from Firestore`);
    }

    // Remove cheaters marked for deletion from local set
    let changed = false;
    cheatersToRemove.forEach(({ username }) => {
      if (existingCheaters.has(username)) {
        existingCheaters.delete(username);
        changed = true;
      }
    });

    // Add new cheaters
    cheatersToAdd.forEach(username => {
      if (!existingCheaters.has(username)) {
        existingCheaters.add(username);
        changed = true;
      }
    });

    // Only update file if there are changes
    if (changed) {
      const finalCheaters = Array.from(existingCheaters);
      finalCheaters.sort();
      const updatedData = {
        cheaters: finalCheaters,
        lastExportTime: new Date().toISOString()
      };
      fs.writeFileSync('./cheaters.json', JSON.stringify(updatedData, null, 2));
      console.log(`\n✅ Export completed successfully!`);
      console.log(`📊 Total cheaters: ${finalCheaters.length}`);
      console.log(`💾 Data saved to cheaters.json`);
    } else {
      console.log('No changes detected. cheaters.json not updated.');
    }
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportCheaters().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
