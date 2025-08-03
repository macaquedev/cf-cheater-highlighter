import { db } from '../firebase';
import { collection, getDocs, query, where, getCountFromServer, doc, deleteDoc, addDoc, orderBy, updateDoc } from 'firebase/firestore';

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
    q = query(
      cheatersRef
    );
  }
  const querySnapshot = await getCountFromServer(q);
  return querySnapshot.data().count;
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
 * @param {Object} user data for current user
 * @returns {Promise<void>}
 */
export async function moveToPending(cheater, user) {
  await deleteAllReportsForUsername(cheater.username);
  await addDoc(collection(db, 'reports'), {
    username: cheater.username.toLowerCase(),
    evidence: cheater.evidence,
    status: 'pending',
    reportedAt: new Date(),
    movedToPendingBy: user.email,
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

export async function addCheaterToDatabase({ report, adminNote, user }) {
  await addDoc(collection(db, 'cheaters'), {
    username: report.username.toLowerCase(),
    evidence: report.evidence,
    adminNote: adminNote.trim() || null,
    reportedAt: report.reportedAt || new Date(),
    acceptedBy: user.email,
    acceptedAt: new Date(),
  });
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

export async function submitReport({ username, evidence }) {
  return addDoc(collection(db, 'reports'), {
    username,
    evidence: evidence.trim(),
    status: 'pending',
    reportedAt: new Date(),
  });
}

export async function findCheaterByUsername({ username }) {
  const cheatersRef = collection(db, 'cheaters');
  const q = query(cheatersRef, where('username', '==', username));
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
