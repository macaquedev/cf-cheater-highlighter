import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Heading, Text, HStack, Table, Dialog, Portal, Skeleton, SkeletonText } from '@chakra-ui/react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';

const AdminSearch = ({ user: initialUser }) => {
  const [user, setUser] = useState(initialUser || null);
  const [allCheaters, setAllCheaters] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState('');
  // Pagination states
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCheaters, setTotalCheaters] = useState(0); // Total count of cheaters
  const [totalPages, setTotalPages] = useState(1); // Total number of pages

  // State for delete confirmation modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, username }
  // State for move to pending confirmation modal
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { id, username, evidence }
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

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

  // Fetch cheaters on mount and when user/searchTerm changes
  useEffect(() => {
    if (user) {
      setCurrentPage(1); // Reset to first page when search changes
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm);
    }
    // eslint-disable-next-line
  }, [user, searchTerm]);

  // Refetch data when currentPage changes
  useEffect(() => {
    if (user && currentPage > 1) {
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
      setTotalCheaters(querySnapshot.size);
    } catch (error) {
      console.error('Error fetching total cheaters:', error);
      setTotalCheaters(0);
    }
  };

  // Fetch cheaters with page-based pagination
  const fetchCheaters = async (search = '') => {
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
      const calculatedTotalPages = Math.ceil(allCheaters.length / pageSize);
      setTotalPages(calculatedTotalPages);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageCheaters = allCheaters.slice(startIndex, endIndex);
      
      setAllCheaters(pageCheaters);
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
      fetchCheaters(searchTerm);
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
      fetchCheaters(searchTerm);
    } catch (error) {
      showMessage('Error removing user: ' + error.message, 'error');
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSeeEvidence = (evidence) => {
    setSelectedEvidence(evidence);
    setEvidenceModalOpen(true);
  };

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
          />
        </Box>
        {allCheaters.length === 0 && !tableLoading ? (
          <Text textAlign="center" py={8} color="gray.500" _dark={{ color: "gray.400" }}>
            {searchTerm ? 'No cheaters found matching your search.' : 'No cheaters in the database.'}
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table.Root variant="simple">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="25%">Username</Table.ColumnHeader>
                  <Table.ColumnHeader width="20%">Date Reported</Table.ColumnHeader>
                  <Table.ColumnHeader width="55%">Actions</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {(tableLoading ? Array.from({ length: pageSize }) : allCheaters).map((cheater, idx) => (
                  <Table.Row key={cheater?.id || idx}>
                    <Table.Cell fontWeight="medium" whiteSpace="nowrap">
                      <Skeleton loading={tableLoading} height="24px">
                        {cheater?.username}
                      </Skeleton>
                    </Table.Cell>
                    <Table.Cell>
                      <Skeleton loading={tableLoading} height="24px" width="100px">
                        {cheater
                          ? (cheater.reportedAt?.toDate
                              ? cheater.reportedAt.toDate().toLocaleDateString()
                              : new Date(cheater.reportedAt).toLocaleDateString())
                          : ''}
                      </Skeleton>
                    </Table.Cell>
                    <Table.Cell>
                      <HStack spacing={4}>
                        <Skeleton loading={tableLoading} height="32px" borderRadius="md">
                          <Button
                            colorPalette="blue"
                            size="sm"
                            onClick={() => handleSeeEvidence(cheater.evidence)}
                          >
                            See evidence
                          </Button>
                        </Skeleton>
                        <Skeleton loading={tableLoading} height="32px" borderRadius="md">
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
                        <Skeleton loading={tableLoading} height="32px" borderRadius="md">
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
              <Skeleton loading={tableLoading} height="40px" borderRadius="md">
                <Button
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    fetchCheaters(searchTerm);
                  }}
                  disabled={currentPage <= 1 || tableLoading}
                  loading={tableLoading}
                >
                  Previous
                </Button>
              </Skeleton>
              <Skeleton loading={tableLoading} height="40px" borderRadius="md">
                <Button
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    fetchCheaters(searchTerm);
                  }}
                  disabled={currentPage >= totalPages || tableLoading}
                >
                  Next
                </Button>
              </Skeleton>
            </HStack>
          </Box>
        )}
        <Box mt={4} textAlign="center">
          <Skeleton loading={tableLoading} mx="auto" display="inline-block">
            <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
              Page {currentPage} of {totalPages} • {allCheaters.length} of {totalCheaters} cheaters
            </Text>
          </Skeleton>
        </Box>
      </Box>
      {/* Evidence Modal */}
      <Dialog.Root open={evidenceModalOpen} onOpenChange={(e) => setEvidenceModalOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Evidence</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
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
                  <MarkdownRenderer>{selectedEvidence}</MarkdownRenderer>
                </Box>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setEvidenceModalOpen(false)}>
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      {/* Delete Confirmation Modal using Dialog */}
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
      {/* Move to Pending Confirmation Modal using Dialog */}
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