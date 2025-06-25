const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHcC1HAgcr6fwmu3FFh9SjSAyyAFmG7lo",
  authDomain: "cf-cheater-database.firebaseapp.com",
  projectId: "cf-cheater-database",
  storageBucket: "cf-cheater-database.firebasestorage.app",
  messagingSenderId: "640477694144",
  appId: "1:640477694144:web:af9f2a7ccacc3fbd5f8525",
  measurementId: "G-1KD3E9TVPB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to fetch cheaters from GitHub
async function fetchCheatersFromGitHub() {
  try {
    console.log('🔍 Attempting to fetch from GitHub...');
    
    // Check if fetch is available
    if (typeof fetch === 'undefined') {
      console.log('❌ Fetch is not available in this Node.js version');
      console.log('💡 Installing node-fetch...');
      
      // Try to use node-fetch if available
      try {
        const nodeFetch = require('node-fetch');
        const response = await nodeFetch('https://raw.githubusercontent.com/macaquedev/cf-cheater-highlighter/main/cheaters.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch cheaters: ${response.status}`);
        }
        const data = await response.json();
        console.log('✅ Successfully fetched data using node-fetch');
        return data;
      } catch (nodeFetchError) {
        console.error('❌ node-fetch not available:', nodeFetchError.message);
        throw new Error('Fetch API not available. Please install node-fetch: npm install node-fetch');
      }
    }
    
    const response = await fetch('https://raw.githubusercontent.com/macaquedev/cf-cheater-highlighter/main/cheaters.json');
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cheaters: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('📄 Raw response (first 200 chars):', text.substring(0, 200));
    
    const data = JSON.parse(text);
    console.log('✅ Successfully parsed JSON data');
    console.log('📊 Data type:', typeof data);
    console.log('📊 Data length:', Array.isArray(data) ? data.length : 'Not an array');
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching cheaters from GitHub:', error);
    console.error('❌ Error details:', error.message);
    throw error;
  }
}

// Function to check if a username already exists in the database
async function checkIfUserExists(username) {
  try {
    const normalizedUsername = username.toLowerCase();
    
    // Check in cheaters collection
    const cheatersRef = collection(db, 'cheaters');
    const cheaterQuery = query(cheatersRef, where('username', '==', normalizedUsername));
    const cheaterSnapshot = await getDocs(cheaterQuery);
    
    if (!cheaterSnapshot.empty) {
      return { exists: true, collection: 'cheaters' };
    }
    
    // Check in reports collection (pending or accepted)
    const reportsRef = collection(db, 'reports');
    const reportQuery = query(reportsRef, where('username', '==', normalizedUsername));
    const reportSnapshot = await getDocs(reportQuery);
    
    if (!reportSnapshot.empty) {
      return { exists: true, collection: 'reports' };
    }
    
    return { exists: false };
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
}

// Function to delete all reports for a username
async function deleteReportsForUsername(username) {
  try {
    const normalizedUsername = username.toLowerCase();
    const reportsRef = collection(db, 'reports');
    const reportQuery = query(reportsRef, where('username', '==', normalizedUsername));
    const reportSnapshot = await getDocs(reportQuery);
    let deletedCount = 0;
    for (const reportDoc of reportSnapshot.docs) {
      await deleteDoc(doc(db, 'reports', reportDoc.id));
      deletedCount++;
    }
    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} pending report(s) for ${username}`);
    }
    return deletedCount;
  } catch (error) {
    console.error(`❌ Error deleting reports for ${username}:`, error);
    return 0;
  }
}

// Function to add a cheater to the database
async function addCheaterToDatabase(username) {
  try {
    const normalizedUsername = username.toLowerCase();
    // Add to cheaters collection
    await addDoc(collection(db, 'cheaters'), {
      username: normalizedUsername,
      evidence: 'see discord',
      status: 'cheater',
      reportedAt: new Date(),
    });
    // Delete any pending reports for this user
    await deleteReportsForUsername(username);
    console.log(`✅ Added cheater: ${username}`);
    return { success: true, username };
  } catch (error) {
    console.error(`❌ Error adding cheater ${username}:`, error);
    return { success: false, username, error };
  }
}

// Main import function
async function importCheaters() {
  console.log('🚀 Starting cheater import process...');
  
  try {
    // Fetch cheaters from GitHub
    console.log('📥 Fetching cheaters from GitHub...');
    const data = await fetchCheatersFromGitHub();
    const cheaters = Array.isArray(data) ? data : data.cheaters;
    console.log(`📊 Found ${cheaters.length} cheaters in the file`);
    
    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const results = {
      added: [],
      skipped: [],
      errors: []
    };
    
    // Process each cheater
    for (let i = 0; i < cheaters.length; i++) {
      const username = cheaters[i];
      console.log(`\n🔄 Processing ${i + 1}/${cheaters.length}: ${username}`);
      
      try {
        // Check if user already exists
        const existsCheck = await checkIfUserExists(username);
        
        if (existsCheck.exists) {
          console.log(`⏭️  Skipping ${username} - already exists in ${existsCheck.collection}`);
          skippedCount++;
          results.skipped.push(username);
        } else {
          // Add to database
          const result = await addCheaterToDatabase(username);
          if (result.success) {
            addedCount++;
            results.added.push(username);
          } else {
            errorCount++;
            results.errors.push({ username, error: result.error });
          }
        }
        
        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing ${username}:`, error);
        errorCount++;
        results.errors.push({ username, error });
      }
    }
    
    // Print summary
    console.log('\n📋 Import Summary:');
    console.log(`✅ Added: ${addedCount} cheaters`);
    console.log(`⏭️  Skipped: ${skippedCount} cheaters (already exist)`);
    console.log(`❌ Errors: ${errorCount} cheaters`);
    console.log(`📊 Total processed: ${cheaters.length} cheaters`);
    
    if (results.added.length > 0) {
      console.log('\n✅ Successfully added cheaters:');
      results.added.forEach(username => console.log(`  - ${username}`));
    }
    
    if (results.skipped.length > 0) {
      console.log('\n⏭️  Skipped cheaters (already exist):');
      results.skipped.forEach(username => console.log(`  - ${username}`));
    }
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors occurred:');
      results.errors.forEach(({ username, error }) => {
        console.log(`  - ${username}: ${error.message}`);
      });
    }
    
    console.log('\n🎉 Import process completed!');
    
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    process.exit(1);
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  importCheaters();
}

module.exports = { importCheaters }; 