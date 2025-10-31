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
  console.log('1. Go to Project Settings > Service Accounts');
  console.log('2. Click "Generate New Private Key"');
  console.log('3. Save the file as "serviceAccountKey.json" in your project root');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Codeforces API endpoint
const USER_INFO_API = 'https://codeforces.com/api/user.info';
const BATCH_SIZE = 500; // firestore max batch size

/**
 * Helper function to fetch user info from Codeforces API
 * @param {Array} handles 
 * @returns {Map} { [lowercase username]: userData or { userNotFound: true } }
 */
async function fetchUserInfo(handles) {
  if (!handles.length) return new Map();
  try {
    const response = await fetch(`${USER_INFO_API}?handles=${handles.join(';')}`);
    const data = await response.json();
    if (data.status === 'OK') {
      // Map lowercase handle to user data
      const map = new Map();
      for (let i in handles) {
        const handle = handles[i].toLowerCase();
        map.set(handle, data.result[i]);
      }
      return map;
    } else if (
      data.status === 'FAILED' &&
      typeof data.comment === 'string' &&
      data.comment.startsWith('handles: User with handle') &&
      data.comment.endsWith('not found')
    ) {
      // Extract the deleted handle
      const match = data.comment.match(/User with handle ([^ ]+) not found/);
      if (match) {
        const deletedHandle = match[1].toLowerCase();
        // Remove the deleted handle and retry recursively
        const idx = handles.findIndex(h => h.toLowerCase() === deletedHandle);
        let map = new Map();
        if (idx !== -1) {
          const handlesCopy = [...handles];
          handlesCopy.splice(idx, 1);
          map = await fetchUserInfo(handlesCopy);
          map.set(deletedHandle.toLowerCase(), { userNotFound: true });
        }
        return map;
      }
    }
    // Other errors
    console.error('Codeforces API error:', data.comment);
    // For other errors, return an empty map
    return new Map();
  } catch (error) {
    console.error('Failed to fetch from Codeforces API:', error);
    // For network or unexpected errors, return an empty map
    return new Map();
  }
}

// Helper function to process a single batch of cheaters
async function processBatch(cheatersBatch, batchNumber) {
  console.log(`\n--- Processing Batch ${batchNumber} (${cheatersBatch.length} cheaters) ---`);

  const batchTimestamp = new Date();
  
  // Extract usernames from this batch
  const usernames = cheatersBatch.map(cheater => cheater.username);
  console.log(`Fetching user info for ${usernames.length} users...`);
  
  // Fetch user info from Codeforces API
  const userInfoMap = await fetchUserInfo(usernames);
  console.log(`Retrieved info for ${userInfoMap.size} users`);

  if (userInfoMap.size === 0) {
    console.log('No user info found for this batch');
    return 0;
  }

  // Create batch for Firestore updates/deletes
  const batch = db.batch();
  let updateCount = 0;
  let deleteCount = 0;

  // Update or delete cheater documents
  for (const cheater of cheatersBatch) {
    const username = cheater.username;
    const oldInfo = cheater?.info;
    const userInfo = userInfoMap.get(username.toLowerCase());

    const cheaterRef = db.collection('cheaters').doc(cheater.id);

    if (userInfo && userInfo.userNotFound) {
      // User was deleted from Codeforces, mark for deletion
      batch.update(cheaterRef, {
        markedForDeletion: true,
        lastModified: batchTimestamp
      });
      deleteCount++;
    } else if (userInfo) {
      const updateData = {};
      // update info
      const newInfo = {
        currentRating: userInfo.rating || 0,
        maxRating: userInfo.maxRating || 0,
        currentRank: userInfo.rank || 'unrated',
        maxRank: userInfo.maxRank || 'unrated'
      };
      // only updates if modified
      const isModified = !oldInfo || Object.keys(newInfo).some(key => oldInfo[key] !== newInfo[key]);
      if (isModified) {
        updateData.info = newInfo;
      }

      // Update username if it changed
      const newUsername = userInfo.handle.toLowerCase();
      if (newUsername !== username) {
        updateData.username = newUsername;
        updateData.lastModified = batchTimestamp;
      }

      // only update if there are changes (to save writes)
      if (Object.keys(updateData).length !== 0) {
        batch.update(cheaterRef, updateData);
        updateCount++;
      }
    } else {
      // If userInfo is undefined (API/network error), skip update/delete
      console.log(`No rating info found for: ${username} (skipped)`);
    }
  }

  // Commit the batch if there are updates or deletes
  if (updateCount > 0 || deleteCount > 0) {
    console.log(`Committing batch: ${updateCount} updates, ${deleteCount} deletes...`);
    await batch.commit();
    console.log(`✓ Batch ${batchNumber} completed: ${updateCount} updated, ${deleteCount} deleted`);
  } else {
    console.log(`✓ Batch ${batchNumber} completed: No updates or deletes needed`);
  }

  return updateCount + deleteCount;
}

// Helper function to get all cheaters
async function getAllCheaters() {
  const cheatersRef = db.collection('cheaters');
  const snapshot = await cheatersRef.where('markedForDeletion', '==', false).get();
  
  const cheaters = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.username) {
      cheaters.push({
        id: doc.id,
        ...data
      });
    }
  });
  
  console.log(`Total cheaters retrieved: ${cheaters.length}`);
  return cheaters;
}

async function updateCheaterRatings() {
  try {
    console.log('Fetching cheaters from database...');
    
    // Get all cheaters from the database with pagination
    const cheaters = await getAllCheaters();
    
    if (cheaters.length === 0) {
      console.log('No cheaters found in database');
      return;
    }
    
    // Process cheaters in 10k batches
    let totalUpdated = 0;
    let batchNumber = 1;
    
    for (let i = 0; i < cheaters.length; i += BATCH_SIZE) {
      const cheatersBatch = cheaters.slice(i, i + BATCH_SIZE);
      
      // Process this batch: fetch usernames, get user info, update documents, commit
      const batchUpdateCount = await processBatch(cheatersBatch, batchNumber);
      totalUpdated += batchUpdateCount;
      
      batchNumber++;
      
      // Add a small delay between batches to be respectful to the API
      if (i + BATCH_SIZE < cheaters.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 Successfully completed! Total changes: ${totalUpdated}`);
    
  } catch (error) {
    console.error('Failed to update cheater ratings:', error);
    process.exit(1);
  }
}

// Run the script
updateCheaterRatings().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});