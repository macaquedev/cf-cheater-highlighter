require('dotenv').config();
const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
// Save it as 'serviceAccountKey.json' in your project root
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
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
const CODEFORCES_API = 'https://codeforces.com/api/user.info';
const BATCH_SIZE = 100; // Process 10k cheaters per batch

// Helper function to fetch user info from Codeforces API
async function fetchUserInfo(handles) {
  try {
    const response = await fetch(`${CODEFORCES_API}?handles=${handles.join(';')}`);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.result;
    } else {
      console.error('Codeforces API error:', data.comment);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch from Codeforces API:', error);
    return [];
  }
}

// Helper function to process a single batch of cheaters
async function processBatch(cheatersBatch, batchNumber) {
  console.log(`\n--- Processing Batch ${batchNumber} (${cheatersBatch.length} cheaters) ---`);
  
  // Extract usernames from this batch
  const usernames = cheatersBatch.map(cheater => cheater.username);
  console.log(`Fetching user info for ${usernames.length} usernames...`);
  
  // Fetch user info from Codeforces API
  const userInfos = await fetchUserInfo(usernames);
  console.log(`Retrieved info for ${userInfos.length} users`);
  
  if (userInfos.length === 0) {
    console.log('No user info found for this batch');
    return 0;
  }
  
  // Create a map for quick lookup
  const userInfoMap = new Map();
  userInfos.forEach(user => {
    userInfoMap.set(user.handle.toLowerCase(), user);
  });
  
  // Create batch for Firestore updates
  const batch = db.batch();
  let updateCount = 0;
  
  // Update cheater documents
  for (const cheater of cheatersBatch) {
    const username = cheater.username;
    const userInfo = userInfoMap.get(username.toLowerCase());
    
    if (userInfo) {
      const cheaterRef = db.collection('cheaters').doc(cheater.id);
      
      const updateData = {
        ratingInfo: {
          currentRating: userInfo.rating || 0,
          maxRating: userInfo.maxRating || 0,
          currentRank: userInfo.rank || 'unrated',
          maxRank: userInfo.maxRank || 'unrated'
        }
      };
      
      // Update username if it changed
      if (userInfo.handle !== username) {
        updateData.username = userInfo.handle;
      }
      
      batch.update(cheaterRef, updateData);
      updateCount++;
    } else {
      console.log(`  No rating info found for: ${username}`);
    }
  }
  
  // Commit the batch if there are updates
  if (updateCount > 0) {
    console.log(`Committing batch with ${updateCount} updates...`);
    await batch.commit();
    console.log(`✓ Batch ${batchNumber} completed: ${updateCount} documents updated`);
  } else {
    console.log(`✓ Batch ${batchNumber} completed: No updates needed`);
  }
  
  return updateCount;
}

// Helper function to get all cheaters
async function getAllCheaters() {
  console.log('Fetching all cheaters from database...');
  
  const cheatersRef = db.collection('cheaters');
  const snapshot = await cheatersRef.get();
  
  const cheaters = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.username) {
      cheaters.push({
        id: doc.id,
        username: data.username,
        ...data
      });
    }
  });
  
  console.log(`Total cheaters retrieved: ${cheaters.length}`);
  return cheaters;
}

async function updateCheaterRatings() {
  try {
    console.log('Starting to fetch cheaters from database...');
    
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
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\n🎉 Successfully completed! Total documents updated: ${totalUpdated}`);
    
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
