import { db } from '../firebase';
import { collection, getDocs, query, where, getCountFromServer, orderBy, startAfter, limit } from 'firebase/firestore';

/**
 * Map sort option to Firestore orderBy field and direction
 * @param {string} sortOption - The sort option value (e.g., "reportedAtDesc", "ratingAsc")
 * @returns {{field: string, direction: 'asc'|'desc'}}
 */
function getSortConfig(sortOption) {
  // Extract field and direction from sortOption (format: "fieldNameDirection")
  // e.g., "reportedAtDesc" -> { field: 'reportedAt', direction: 'desc' }
  const match = sortOption.match(/^(.+?)(Asc|Desc)$/);
  if (!match) {
    return { field: 'reportedAt', direction: 'desc' };
  }
  
  const [, fieldName, direction] = match;
  const directionLower = direction.toLowerCase();
  
  // Map field names to Firestore field paths
  const fieldMap = {
    'reportedAt': 'reportedAt',
    'rating': 'info.currentRating',
    'maxRating': 'info.maxRating',
    'username': 'username',
  };
  
  const field = fieldMap[fieldName] || 'reportedAt';
  const dir = (directionLower === 'asc' || directionLower === 'desc') ? directionLower : 'desc';
  
  return { field, direction: dir };
}

/**
 * Pure fetcher: fetch a page of cheaters for a search term.
 * @param {Object} params
 * @param {number} params.currentPage
 * @param {string} params.search
 * @param {string} params.sortOption - Sort option (only used when search is empty)
 * @param {number} params.pageSize
 * @param {Record<number, any>} params.pageCursors
 * @returns {Promise<{ cheaters: Array, lastVisible: object|null }>}
 */
export async function fetchPageData({ currentPage, search = '', sortOption = 'reportedAtDesc', pageSize = 20, pageCursors = {} }) {
  let cheatersRef = collection(db, 'cheaters');
  let q;
  if (search) {
    // When searching, always sort by username
    q = query(
      cheatersRef,
      where('markedForDeletion', '==', false),
      where('username', '>=', search.toLowerCase()),
      where('username', '<=', search.toLowerCase() + '\uf8ff'),
      orderBy('username', 'asc'),
      limit(pageSize)
    );
  } else {
    // When search is empty, use the selected sort option
    const sortConfig = getSortConfig(sortOption);
    q = query(
      cheatersRef,
      where('markedForDeletion', '==', false),
      orderBy(sortConfig.field, sortConfig.direction),
      limit(pageSize)
    );
  }
  if (currentPage > 1 && pageCursors[currentPage - 1]) {
    q = query(q, startAfter(pageCursors[currentPage - 1]));
  }
  const querySnapshot = await getDocs(q);
  const cheaters = [];
  querySnapshot.forEach((docu) => {
    cheaters.push({ id: docu.id, ...docu.data() });
  });
  const lastVisible = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
  return { cheaters, lastVisible };
}

const cheaterCountCache = new Map();

/**
 * Pure fetcher: fetch total count for a search term.
 * @param {Object} params
 * @param {string} params.search
 * @returns {Promise<number>}
 */
export async function fetchTotalCount({ search = '' }) {
  if (cheaterCountCache.has(search)) {
    return cheaterCountCache.get(search);
  }
  let cheatersRef = collection(db, 'cheaters');
  let q;
  if (search) {
    q = query(
      cheatersRef,
      where('markedForDeletion', '==', false),
      where('username', '>=', search.toLowerCase()),
      where('username', '<=', search.toLowerCase() + '\uf8ff')
    );
  } else {
    q = query(
      cheatersRef,
      where('markedForDeletion', '==', false)
    );
  }
  const querySnapshot = await getCountFromServer(q);
  const totalCount = querySnapshot.data().count;
  cheaterCountCache.set(search, totalCount);
  return totalCount;
}


