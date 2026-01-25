import { db } from '../firebase';
import { collection, getDocs, query, where, getCountFromServer, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';

/**
 * Fetch the total number of cheaters matching a search term.
 * @param {string} searchTerm
 * @returns {Promise<number>} Total number of cheaters
 */

/**
 * Fetch cheaters for a given page and search term using server-side pagination.
 * @param {number} page
 * @param {string} searchTerm
 * @param {number} [pageSize=20]
 * @param {object} [pageCursors] - Map of page numbers to Firestore document snapshots
 * @returns {Promise<{ cheaters: Array, lastVisible: object|null }>} Array of cheater objects for the page and lastVisible doc
 */

/**
 * Delete all reports for a given username.
 * @param {string} username
 * @returns {Promise<void>}
 */
export async function deleteAllReportsForUsername(username) {
  const reportsRef = collection(db, 'reports');
  const q = query(reportsRef, where('username', '==', username.toLowerCase()));
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((docu) => deleteDoc(docu.ref));
  await Promise.all(deletePromises);
}

/**
 * Move a cheater to pending
 * @param {Object} cheater document data of the cheater
 * @param {Object} user data for current user
 * @returns {Promise<void>}
 */
export async function moveToPending(cheater, user) {
  await deleteAllReportsForUsername(cheater.username);
  const reportData = {
    username: cheater.username.toLowerCase(),
    evidence: cheater.evidence,
    status: 'pending',
    reportedAt: new Date(),
    movedToPendingBy: user.email,
    movedToPendingAt: new Date(),
  };
  
  // Preserve cheater's existing info if available
  if (cheater.info) {
    reportData.info = cheater.info;
  }
  
  await addDoc(collection(db, 'reports'), reportData);
  // Mark for deletion instead of actually deleting
  await updateDoc(doc(db, 'cheaters', cheater.id), { 
    markedForDeletion: true,
    deletionReason: 'moved_to_pending',
    deletionTimestamp: new Date(),
    lastModified: new Date()
  });
}

/**
 * Delete a cheater
 * @param {Object} cheater document data of the cheater
 * @returns {Promise<void>}
 */
export async function deleteCheater(cheater) {
  await deleteAllReportsForUsername(cheater.username);
  // Mark for deletion instead of actually deleting
  await updateDoc(doc(db, 'cheaters', cheater.id), { 
    markedForDeletion: true,
    deletionReason: 'appeal_accepted',
    deletionTimestamp: new Date(),
    lastModified: new Date()
  });
}

/**
 * Set the admin note for a cheater
 * @param {Object} cheater document data of the cheater
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function setAdminNote(cheater, note) {
  const cheaterRef = doc(db, 'cheaters', cheater.id);
  await updateDoc(cheaterRef, { 
    adminNote: note,
    lastModified: new Date()
  });
}

export async function addCheaterToDatabase({ report, adminNote, user }) {
  // Check if there's an existing cheater (including marked for deletion)
  const cheatersRef = collection(db, 'cheaters');
  const existingCheaterQuery = query(cheatersRef, where('username', '==', report.username.toLowerCase()));
  const existingCheaterSnapshot = await getDocs(existingCheaterQuery);
  
  // Prepare update data with info if available
  const updateData = {
    evidence: report.evidence,
    adminNote: adminNote.trim() || null,
    lastModified: new Date(),
  };
  
  // Include info from report if available
  if (report.info) {
    updateData.info = report.info;
  }
  
  if (!existingCheaterSnapshot.empty) {
    const existingCheater = existingCheaterSnapshot.docs[0];
    const existingData = existingCheater.data();
    
    if (existingData.markedForDeletion) {
      // If marked for deletion, unmark it and update with new data
      await updateDoc(existingCheater.ref, {
        markedForDeletion: false,
        deletionReason: null,
        deletionTimestamp: null,
        ...updateData,
        reportedAt: report.reportedAt || new Date(),
        acceptedBy: user.email,
        acceptedAt: new Date(),
      });
    } else {
      // If not marked for deletion, just update the existing document
      await updateDoc(existingCheater.ref, updateData);
    }
  } else {
    // Create new cheater document
    const newCheaterData = {
      username: report.username.toLowerCase(),
      ...updateData,
      reportedAt: report.reportedAt || new Date(),
      acceptedBy: user.email,
      acceptedAt: new Date(),
      markedForDeletion: false,
    };
    await addDoc(collection(db, 'cheaters'), newCheaterData);
  }
  
  await updateDoc(doc(db, 'reports', report.id), { status: 'accepted' });
  const reportsRef = collection(db, 'reports');
  const duplicateQuery = query(
    reportsRef,
    where('username', '==', report.username.toLowerCase()),
    where('status', '==', 'pending')
  );
  const duplicateSnapshot = await getDocs(duplicateQuery);
  const deletePromises = duplicateSnapshot.docs.map(docu => {
    if (docu.id !== report.id) {
      return deleteDoc(docu.ref);
    }
    return Promise.resolve();
  });
  await Promise.all(deletePromises);
  return duplicateSnapshot.docs.length - 1;
}

export async function submitAppeal({ username, message }) {
  return addDoc(collection(db, 'appeals'), {
    username,
    message: message.trim(),
    status: 'pending',
    submittedAt: new Date(),
  });
}

export async function submitReport({ username, evidence, info }) {
  const reportData = {
    username,
    evidence: evidence.trim(),
    status: 'pending',
    reportedAt: new Date(),
  };
  
  // Include info if provided
  if (info) {
    reportData.info = info;
  }
  
  return addDoc(collection(db, 'reports'), reportData);
}

export async function findCheaterByUsername({ username }) {
  const cheatersRef = collection(db, 'cheaters');
  const q = query(
    cheatersRef, 
    where('username', '==', username),
    where('markedForDeletion', '==', false)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

/**
 * Fetch the total number of pending reports.
 * @returns {Promise<number>} Total number of pending reports
 */
export async function fetchPendingReportsCount() {
  const reportsRef = collection(db, 'reports');
  const q = query(reportsRef, where('status', '==', 'pending'));
  const querySnapshot = await getCountFromServer(q);
  return querySnapshot.data().count;
}

/**
 * Fetch the total number of pending appeals.
 * @returns {Promise<number>} Total number of pending appeals
 */
export async function fetchPendingAppealsCount() {
  const appealsRef = collection(db, 'appeals');
  const q = query(appealsRef, where('status', '!=', 'declined'));
  const querySnapshot = await getCountFromServer(q);
  return querySnapshot.data().count;
}

/**
 * Validates if a Codeforces username exists by checking the Codeforces API
 * @param {string} username - The username to validate
 * @returns {Promise<{exists: boolean, userInfo?: object, error?: string}>}
 */
export const validateCodeforcesUsername = async (username) => {
  try {
    // Convert username to lowercase and remove all whitespace for case-insensitive, space-insensitive validation
    const normalizedUsername = username.trim().replace(/\s+/g, '').toLowerCase();
    
    // Check if the user exists on Codeforces
    const cfResponse = await fetch(`https://codeforces.com/api/user.info?handles=${normalizedUsername}&checkHistoricHandles=false`);
    const cfData = await cfResponse.json();
    
    if (cfData.status !== 'OK' || !cfData.result || cfData.result.length === 0) {
      return {
        exists: false,
        error: `User "${normalizedUsername}" does not exist on Codeforces.`
      };
    }
    
    return {
      exists: true,
      userInfo: cfData.result[0],
      normalizedUsername
    };
  } catch (error) {
    return {
      exists: false,
      error: 'Failed to validate username. Please try again.'
    };
  }
};
