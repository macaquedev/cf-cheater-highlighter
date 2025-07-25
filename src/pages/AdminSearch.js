import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Button, Input, Heading, Text, HStack, VStack, Table, Dialog, Portal, Skeleton, SkeletonText } from '@chakra-ui/react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useAuth } from '../App';

// Constants
const PAGE_SIZE = 20;
const THROTTLE_DELAY = 100; // Consistent delay between key presses

const AdminSearch = () => {
  const { user } = useAuth();
  const [allCheaters, setAllCheaters] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [selectedCheater, setSelectedCheater] = useState(null);
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCheaters, setTotalCheaters] = useState(0); // Total count of cheaters
  const [totalPages, setTotalPages] = useState(1); // Total number of pages

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, username }
  // State for move to pending confirmation dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { id, username, evidence }
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [pageCache, setPageCache] = useState({});
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const lastKeyPressTime = useRef(0);
  const [cheaterCountCache, setCheaterCountCache] = useState({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  // Auto-dismiss message after 15 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Keyboard shortcuts for pagination
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return; // Don't trigger shortcuts when typing in input fields
      }
      
      const now = Date.now();
      
      switch (event.key) {
        case 'ArrowLeft': {
          event.preventDefault();
          if (totalCheaters === 0) return; // Prevent navigation if total not loaded
          const prevPage = Math.max(1, currentPage - 1);
          if (prevPage !== currentPage && now - lastKeyPressTime.current >= THROTTLE_DELAY) {
            lastKeyPressTime.current = now;
            setCurrentPage(prevPage);
            // Set navigating state on repeated events (not first press) and only if page changes
            if (event.repeat) {
              setIsNavigating(true);
            }
          }
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          if (totalCheaters === 0) return; // Prevent navigation if total not loaded
          const nextPage = currentPage + 1;
          if (nextPage <= totalPages && now - lastKeyPressTime.current >= THROTTLE_DELAY) {
            lastKeyPressTime.current = now;
            setCurrentPage(nextPage);
            // Set navigating state on repeated events (not first press) and only if page changes
            if (event.repeat) {
              setIsNavigating(true);
            }
          }
          break;
        }
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        setIsNavigating(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentPage, totalPages, totalCheaters]);

  // Reset navigation state when data finishes loading
  useEffect(() => {
    if (!tableLoading && isNavigating) {
      setIsNavigating(false);
    }
  }, [tableLoading, isNavigating]);

  // Fetch cheaters on mount and when user/searchTerm changes
  useEffect(() => {
    if (user) {
      setCurrentPage(1); // Reset to first page when search changes
      setPageCache({}); // Clear cache when search changes
      setCheaterCountCache(prev => ({ ...prev, [searchTerm]: undefined })); // Always reset skeleton
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm); // Always fetch count
    }
    // eslint-disable-next-line
  }, [user, searchTerm]);



  // Refetch data when currentPage changes
  useEffect(() => {
    if (user) {
      // Check cache before fetching
      const cacheKey = JSON.stringify([searchTerm, currentPage]);
      if (pageCache[cacheKey]) {
        setAllCheaters(pageCache[cacheKey].data);
        setTotalPages(Math.max(1, pageCache[cacheKey].totalPages));
        setTotalCheaters(Number(pageCache[cacheKey].totalCheaters));
        setTableLoading(false);
        return;
      }
      fetchCheaters(searchTerm);
    }
    // eslint-disable-next-line
  }, [currentPage]);



  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Fetch total count of cheaters for display
  const fetchTotalCheaters = async (search = '') => {
    try {
      let cheatersRef = collection(db, 'cheaters');
      let q;
      if (search) {
        q = query(
          cheatersRef,
          where('username', '>=', search.toLowerCase()),
          where('username', '<=', search.toLowerCase() + '\uf8ff')
        );
      } else {
        q = query(cheatersRef);
      }
      const querySnapshot = await getDocs(q);
      setTotalCheaters(Number(querySnapshot.size));
      setCheaterCountCache(prev => ({ ...prev, [search]: Number(querySnapshot.size) }));
    } catch (error) {
      console.error('Error fetching total cheaters:', error);
      setTotalCheaters(0);
    }
  };

  // Fetch cheaters with page-based pagination and caching
  const fetchCheaters = async (search = '') => {
    const cacheKey = JSON.stringify([search, currentPage]);
    
    // Check cache first
    if (pageCache[cacheKey]) {
      setAllCheaters(pageCache[cacheKey].data);
      setTotalPages(Math.max(1, pageCache[cacheKey].totalPages));
      setTotalCheaters(Number(pageCache[cacheKey].totalCheaters));
      setTableLoading(false);
      return;
    }
    
    setTableLoading(true);
    
    try {
      let cheatersRef = collection(db, 'cheaters');
      let q;
      if (search) {
        q = query(
          cheatersRef,
          where('username', '>=', search.toLowerCase()),
          where('username', '<=', search.toLowerCase() + '\uf8ff'),
          orderBy('username'),
          orderBy('reportedAt', 'desc')
        );
      } else {
        q = query(
          cheatersRef,
          orderBy('reportedAt', 'desc')
        );
      }
      
      // Get all documents for the current search
      const querySnapshot = await getDocs(q);
      const allCheaters = [];
      querySnapshot.forEach((doc) => {
        allCheaters.push({ id: doc.id, ...doc.data() });
      });
      
      // Calculate pagination
      const calculatedTotalPages = Math.max(1, Math.ceil(allCheaters.length / PAGE_SIZE));
      const calculatedTotalCheaters = allCheaters.length;
      const startIndex = (currentPage - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const pageCheaters = allCheaters.slice(startIndex, endIndex);
      
      // Cache the result
      const cacheData = {
        data: pageCheaters,
        totalPages: calculatedTotalPages,
        totalCheaters: calculatedTotalCheaters
      };
      setPageCache(prev => ({ ...prev, [cacheKey]: cacheData }));
      
      setAllCheaters(pageCheaters);
      setTotalPages(calculatedTotalPages);
      setTotalCheaters(Number(calculatedTotalCheaters));
    } catch (error) {
      showMessage('Error fetching cheaters: ' + error.message, 'error');
    } finally {
      setTableLoading(false);
    }
  };

  // Helper to delete all reports for a username
  const deleteAllReportsForUsername = async (username) => {
    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, where('username', '==', username.toLowerCase()));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docu) => deleteDoc(docu.ref));
    await Promise.all(deletePromises);
  };

  // Open confirmation dialog for move to pending
  const handleMoveToPending = (cheaterId, cheaterUsername, cheaterEvidence) => {
    setMoveTarget({ id: cheaterId, username: cheaterUsername, evidence: cheaterEvidence });
    setMoveDialogOpen(true);
  };

  // Actually move after confirmation
  const confirmMoveToPending = async () => {
    if (!moveTarget) return;
    setActionLoading(true);
    try {
      await deleteAllReportsForUsername(moveTarget.username);
      await addDoc(collection(db, 'reports'), {
        username: moveTarget.username.toLowerCase(),
        evidence: moveTarget.evidence,
        status: 'pending',
        reportedAt: new Date(),
      });
      await deleteDoc(doc(db, 'cheaters', moveTarget.id));
      showMessage(`User "${moveTarget.username}" has been moved back to pending review.`, 'success');
      setCheaterCountCache(prev => ({ ...prev, [searchTerm]: undefined })); // Reset count cache to trigger skeleton
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm); // Refetch count
    } catch (error) {
      showMessage('Error moving user to pending: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
      setMoveDialogOpen(false);
      setMoveTarget(null);
    }
  };

  // Open confirmation dialog
  const handleRemoveFromDatabase = (cheaterId, cheaterUsername) => {
    setDeleteTarget({ id: cheaterId, username: cheaterUsername });
    setDeleteDialogOpen(true);
  };

  // Actually delete after confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteAllReportsForUsername(deleteTarget.username);
      await deleteDoc(doc(db, 'cheaters', deleteTarget.id));
      showMessage(`User "${deleteTarget.username}" has been completely removed from the database.`, 'success');
      setCheaterCountCache(prev => ({ ...prev, [searchTerm]: undefined })); // Reset count cache to trigger skeleton
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm); // Refetch count
    } catch (error) {
      showMessage('Error removing user: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSeeEvidence = (cheater) => {
    setSelectedCheater(cheater);
    setEvidenceDialogOpen(true);
  };

  console.log(isNavigating, tableLoading); // TODO: remove debug

  // Show loading while checking authentication
  if (!user) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box maxW="6xl" mx="auto" px={6}>
      <Box bg="gray.50" _dark={{ bg: "gray.900" }} p={8} rounded="md" shadow="md">
        {message && (
          <Box 
            p={4} 
            mb={6} 
            rounded="md" 
            bg={message.type === 'error' ? 'red.100' : message.type === 'success' ? 'green.100' : 'blue.100'}
            color={message.type === 'error' ? 'red.800' : message.type === 'success' ? 'green.800' : 'blue.800'}
            borderWidth={1}
            borderColor={message.type === 'error' ? 'red.200' : message.type === 'success' ? 'green.200' : 'blue.200'}
            _dark={{
              bg: message.type === 'error' ? 'red.900' : message.type === 'success' ? 'green.900' : 'blue.900',
              color: message.type === 'error' ? 'red.200' : message.type === 'success' ? 'green.200' : 'blue.200',
              borderColor: message.type === 'error' ? 'red.700' : message.type === 'success' ? 'green.700' : 'blue.700'
            }}
            position="relative"
          >
            <Text>{message.text}</Text>
          </Box>
        )}
        <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">Admin Search</Heading>
        {/* Search input for filtering */}
        <Box mb={6}>
          <Input
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="lg"
            borderColor="gray.300"
            _dark={{ borderColor: "gray.400" }}
          />
        </Box>
        {allCheaters.length === 0 && !tableLoading ? (
          <Text textAlign="center" py={8} color="gray.500" _dark={{ color: "gray.400" }}>
            {searchTerm ? 'No cheaters found matching your search.' : 'No cheaters in the database.'}
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="simple" maxW="4xl" mx="auto">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="25%" textAlign="center">Username</Table.ColumnHeader>
                  <Table.ColumnHeader width="20%" textAlign="center">Date Reported</Table.ColumnHeader>
                  <Table.ColumnHeader width="55%" textAlign="center">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(tableLoading ? Array.from({ length: PAGE_SIZE }) : allCheaters).map((cheater, idx) => (
                  <Table.Row key={cheater?.id || idx}>
                    <Table.Cell fontWeight="medium" whiteSpace="nowrap" textAlign="center">
                      <Skeleton loading={tableLoading || isNavigating} height="24px">
                        {cheater?.username || ''}
                      </Skeleton>
                    </Table.Cell>
                    <Table.Cell textAlign="center" width="120px">
                      <Box display="flex" justifyContent="center" alignItems="center" height="24px">
                        <Skeleton loading={tableLoading || isNavigating} height="24px" width="100px">
                          <Text textAlign="center">
                            {cheater
                              ? (cheater.reportedAt?.toDate
                                  ? cheater.reportedAt.toDate().toLocaleDateString()
                                  : new Date(cheater.reportedAt).toLocaleDateString())
                              : ''}
                          </Text>
                        </Skeleton>
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <HStack spacing={4} justify="center">
                        <Skeleton loading={tableLoading || isNavigating} height="32px" borderRadius="md">
                          <Button
                            colorPalette="blue"
                            size="sm"
                            onClick={() => handleSeeEvidence(cheater)}
                          >
                            See evidence
                          </Button>
                        </Skeleton>
                        <Skeleton loading={tableLoading || isNavigating} height="32px" borderRadius="md">
                          <Button
                            colorPalette="orange"
                            size="sm"
                            onClick={() => handleMoveToPending(cheater.id, cheater.username, cheater.evidence)}
                            loading={actionLoading}
                            loadingText="Moving..."
                          >
                            Move to pending
                          </Button>
                        </Skeleton>
                        <Skeleton loading={tableLoading || isNavigating} height="32px" borderRadius="md">
                          <Button
                            colorPalette="red"
                            size="sm"
                            onClick={() => handleRemoveFromDatabase(cheater.id, cheater.username)}
                            loading={actionLoading}
                            loadingText="Removing..."
                          >
                            Remove
                          </Button>
                        </Skeleton>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
            {/* Pagination controls */}
            <HStack justify="center" mt={4} spacing={4}>
              <Button
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  if (newPage !== currentPage) {
                    setCurrentPage(newPage);
                  }
                }}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <Button
                onClick={() => {
                  const newPage = currentPage + 1;
                  if (newPage <= totalPages) {
                    setCurrentPage(newPage);
                  }
                }}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </HStack>
          </Box>
        )}
        {/* Pagination info */}
        <Box mt={4} textAlign="center">
          <Skeleton loading={cheaterCountCache[searchTerm] === undefined} mx="auto" display="inline-block">
            <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
              {totalCheaters > 0 || tableLoading
                ? `Page ${currentPage} of ${totalPages} • ${allCheaters.length} of ${totalCheaters} cheaters`
                : '\u00A0'}
            </Text>
          </Skeleton>
        </Box>
      </Box>
      {/* Evidence Dialog */}
      <Dialog.Root open={evidenceDialogOpen} onOpenChange={(e) => {
        setEvidenceDialogOpen(e.open);
        if (!e.open) {
          setSelectedCheater(null);
        }
      }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Evidence</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                      Evidence:
                    </Text>
                    <Box
                      bg="gray.50"
                      p={4}
                      rounded="md"
                      border="1px"
                      borderColor="gray.200"
                      _dark={{ 
                        bg: "gray.600",
                        borderColor: "gray.500" 
                      }}
                      sx={{
                        '& strong': { fontWeight: 'bold' },
                        '& em': { fontStyle: 'italic' },
                        '& code': { 
                          bg: 'gray.100', 
                          px: 1, 
                          py: 0.5, 
                          borderRadius: 'sm', 
                          fontFamily: 'mono',
                          fontSize: 'sm',
                          _dark: { bg: 'gray.700' }
                        },
                        '& pre': {
                          bg: 'gray.50',
                          p: 3,
                          borderRadius: 'md',
                          border: '1px solid',
                          borderColor: 'gray.200',
                          overflowX: 'auto',
                          my: 2,
                          _dark: { 
                            bg: 'gray.700', 
                            borderColor: 'gray.600' 
                          }
                        },
                        '& pre code': {
                          bg: 'transparent',
                          p: 0,
                          borderRadius: 0,
                          fontSize: 'sm',
                          lineHeight: 1.5
                        },
                        '& a': { 
                          color: 'blue.600', 
                          textDecoration: 'underline',
                          _dark: { color: 'blue.300' }
                        },
                        '& br': { display: 'block', content: '""', marginTop: 2 }
                      }}
                    >
                      <MarkdownRenderer>{selectedCheater?.evidence || ''}</MarkdownRenderer>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                      Admin Note:
                    </Text>
                    {selectedCheater?.adminNote ? (
                      <Box
                        bg="blue.50"
                        p={4}
                        rounded="md"
                        border="1px"
                        borderColor="blue.200"
                        _dark={{ 
                          bg: "blue.900",
                          borderColor: "blue.700" 
                        }}
                        sx={{
                          '& strong': { fontWeight: 'bold' },
                          '& em': { fontStyle: 'italic' },
                          '& code': { 
                            bg: 'blue.100', 
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 'sm', 
                            fontFamily: 'mono',
                            fontSize: 'sm',
                            _dark: { bg: 'blue.800' }
                          },
                          '& pre': {
                            bg: 'blue.50',
                            p: 3,
                            borderRadius: 'md',
                            border: '1px solid',
                            borderColor: 'blue.200',
                            overflowX: 'auto',
                            my: 2,
                            _dark: { 
                              bg: 'blue.800', 
                              borderColor: 'blue.700' 
                            }
                          },
                          '& pre code': {
                            bg: 'transparent',
                            p: 0,
                            borderRadius: 0,
                            fontSize: 'sm',
                            lineHeight: 1.5
                          },
                          '& a': { 
                            color: 'blue.600', 
                            textDecoration: 'underline',
                            _dark: { color: 'blue.300' }
                          },
                          '& br': { display: 'block', content: '""', marginTop: 2 }
                        }}
                      >
                        <MarkdownRenderer>{selectedCheater.adminNote}</MarkdownRenderer>
                      </Box>
                    ) : (
                      <Box
                        bg="gray.50"
                        p={4}
                        rounded="md"
                        border="1px"
                        borderColor="gray.200"
                        _dark={{ 
                          bg: "gray.700",
                          borderColor: "gray.600" 
                        }}
                      >
                        <Text color="gray.500" _dark={{ color: "gray.400" }} fontStyle="italic">
                          No admin note provided
                        </Text>
                      </Box>
                    )}
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => {
                  setEvidenceDialogOpen(false);
                  setSelectedCheater(null);
                }}>
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      {/* Delete Confirmation Dialog using Dialog */}
      <Dialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} placement="center">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Delete User</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  Are you sure you want to delete this user? This action cannot be undone.
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="red" onClick={confirmDelete} ml={3} loading={actionLoading}>Delete</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      {/* Move to Pending Confirmation Dialog using Dialog */}
      <Dialog.Root open={moveDialogOpen} onOpenChange={setMoveDialogOpen} placement="center">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Move User to Pending</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  Are you sure you want to move this user back to pending review? This action will remove them from the cheaters list and add them to pending reports.
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
                <Button colorPalette="orange" onClick={confirmMoveToPending} ml={3} loading={actionLoading}>Move to Pending</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};

export default AdminSearch; 