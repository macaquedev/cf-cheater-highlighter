import { db } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, orderBy, updateDoc } from 'firebase/firestore';

/**
 * Fetch the total number of cheaters matching a search term.
 * @param {string} searchTerm
 * @returns {Promise<number>} Total number of cheaters
 */
export async function fetchTotalCheaters(searchTerm = '') {
  let cheatersRef = collection(db, 'cheaters');
  let q;
  if (searchTerm) {
    q = query(
      cheatersRef,
      where('username', '>=', searchTerm.toLowerCase()),
      where('username', '<=', searchTerm.toLowerCase() + '\uf8ff')
    );
  } else {
    q = query(cheatersRef);
  }
  const querySnapshot = await getDocs(q);
  return Number(querySnapshot.size);
}

/**
 * Fetch cheaters for a given page and search term.
 * @param {number} page
 * @param {string} searchTerm
 * @param {number} [pageSize=20]
 * @returns {Promise<Array>} Array of cheater objects for the page
 */
export async function fetchCheaters(page, searchTerm = '', pageSize = 20) {
  let cheatersRef = collection(db, 'cheaters');
  let q;
  if (searchTerm) {
    q = query(
      cheatersRef,
      where('username', '>=', searchTerm.toLowerCase()),
      where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
      orderBy('username'),
      orderBy('reportedAt', 'desc')
    );
  } else {
    q = query(
      cheatersRef,
      orderBy('reportedAt', 'desc')
    );
  }
  const querySnapshot = await getDocs(q);
  const allCheaters = [];
  querySnapshot.forEach((docu) => {
    allCheaters.push({ id: docu.id, ...docu.data() });
  });
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return allCheaters.slice(startIndex, endIndex);
}

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
 * @returns {Promise<void>}
 */
export async function moveToPending(cheater) {
  await deleteAllReportsForUsername(cheater.username);
  await addDoc(collection(db, 'reports'), {
    username: cheater.username.toLowerCase(),
    evidence: cheater.evidence,
    status: 'pending',
    reportedAt: new Date(),
    movedToPendingBy: cheater.acceptedBy,
    movedToPendingAt: new Date(),
  });
  await deleteDoc(doc(db, 'cheaters', cheater.id));
}

/**
 * Delete a cheater
 * @param {Object} cheater document data of the cheater
 * @returns {Promise<void>}
 */
export async function deleteCheater(cheater) {
  await deleteAllReportsForUsername(cheater.username);
  await deleteDoc(doc(db, 'cheaters', cheater.id));
}

/**
 * Set the admin note for a cheater
 * @param {Object} cheater document data of the cheater
 * @param {string} note
 * @returns {Promise<void>}
 */
export async function setAdminNote(cheater, note) {
  const cheaterRef = doc(db, 'cheaters', cheater.id);
  await updateDoc(cheaterRef, { adminNote: note });
}
