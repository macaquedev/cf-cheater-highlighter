import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Input, Heading, VStack, Text, HStack, Table, Dialog, Portal } from '@chakra-ui/react';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { renderMarkdown } from '../utils/markdownRenderer';

const Search = ({ user }) => {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Admin table states
  const [allCheaters, setAllCheaters] = useState([]);
  const [filteredCheaters, setFilteredCheaters] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState('');

  // State for delete confirmation modal
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, username }
  const cancelRef = useRef();
  // State for move to pending confirmation modal
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState(null); // { id, username, evidence }

  // Auto-dismiss message after 15 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Fetch all cheaters for admin table
  useEffect(() => {
    if (user) {
      fetchAllCheaters();
    }
  }, [user]);

  // Filter cheaters based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCheaters(allCheaters);
    } else {
      const filtered = allCheaters.filter(cheater => 
        cheater.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCheaters(filtered);
    }
  }, [searchTerm, allCheaters]);

  const fetchAllCheaters = async () => {
    setTableLoading(true);
    try {
      const cheatersRef = collection(db, 'cheaters');
      const querySnapshot = await getDocs(cheatersRef);
      const cheaters = [];
      const seenUsernames = new Set();
      
      querySnapshot.forEach((doc) => {
        const cheaterData = { 
          id: doc.id, 
          ...doc.data() 
        };
        
        // Only add if we haven't seen this username before (deduplication)
        if (!seenUsernames.has(cheaterData.username)) {
          seenUsernames.add(cheaterData.username);
          cheaters.push(cheaterData);
        }
      });
      
      // Sort by reported date (newest first)
      cheaters.sort((a, b) => {
        const dateA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(a.reportedAt);
        const dateB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(b.reportedAt);
        return dateB - dateA;
      });
      
      setAllCheaters(cheaters);
      setFilteredCheaters(cheaters);
    } catch (error) {
      showMessage('Error fetching cheaters: ' + error.message, 'error');
    } finally {
      setTableLoading(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      if (!username.trim()) {
        showMessage('Username is required.', 'error');
        setLoading(false);
        return;
      }
      
      // Convert username to lowercase for case-insensitive search
      const searchUsername = username.trim().toLowerCase();
      
      const cheatersRef = collection(db, 'cheaters');
      const q = query(cheatersRef, where('username', '==', searchUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const cheater = querySnapshot.docs[0].data();
        setResult({ 
          status: 'cheater', 
          evidence: user ? cheater.evidence : null, // Only show evidence to admins
          reportedAt: cheater.reportedAt,
          docId: querySnapshot.docs[0].id // Store the document ID for admin actions
        });
      } else {
        setResult({ status: 'not_cheater' });
      }
    } catch (err) {
      showMessage('Error searching: ' + err.message, 'error');
    } finally {
      setLoading(false);
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
      fetchAllCheaters();
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
      fetchAllCheaters();
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

  // Admin table view
  if (user) {
    return (
      <Box maxW="6xl" mx="auto" px={6}>
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md">
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
          
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">Cheater Database (Admin View)</Heading>
          
          {/* Search input for filtering */}
          <Box mb={6}>
            <Input
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="lg"
            />
          </Box>

          {tableLoading ? (
            <Text textAlign="center" py={8}>Loading cheaters...</Text>
          ) : filteredCheaters.length === 0 ? (
            <Text textAlign="center" py={8} color="gray.500" _dark={{ color: "gray.400" }}>
              {searchTerm ? 'No cheaters found matching your search.' : 'No cheaters in the database.'}
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table.Root variant="simple">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Username</Table.ColumnHeader>
                    <Table.ColumnHeader>Date Reported</Table.ColumnHeader>
                    <Table.ColumnHeader>Actions</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredCheaters.map((cheater) => (
                    <Table.Row key={cheater.id}>
                      <Table.Cell fontWeight="medium">{cheater.username}</Table.Cell>
                      <Table.Cell>
                        {cheater.reportedAt?.toDate 
                          ? cheater.reportedAt.toDate().toLocaleDateString() 
                          : new Date(cheater.reportedAt).toLocaleDateString()
                        }
                      </Table.Cell>
                      <Table.Cell>
                        <HStack spacing={2}>
                          <Button 
                            colorScheme="blue" 
                            size="sm" 
                            onClick={() => handleSeeEvidence(cheater.evidence)}
                          >
                            See evidence
                          </Button>
                          <Button 
                            colorScheme="orange" 
                            size="sm" 
                            onClick={() => handleMoveToPending(cheater.id, cheater.username, cheater.evidence)}
                            isLoading={actionLoading}
                            loadingText="Moving..."
                          >
                            Move to pending
                          </Button>
                          <Button 
                            colorScheme="red" 
                            size="sm" 
                            onClick={() => handleRemoveFromDatabase(cheater.id, cheater.username)}
                            isLoading={actionLoading}
                            loadingText="Removing..."
                          >
                            Remove
                          </Button>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
          
          <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }} mt={4} textAlign="center">
            Showing {filteredCheaters.length} of {allCheaters.length} cheaters
          </Text>
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
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedEvidence) }}
                  />
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
                  <Button colorScheme="red" onClick={confirmDelete} ml={3} isLoading={actionLoading}>Delete</Button>
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
                  <Button colorScheme="orange" onClick={confirmMoveToPending} ml={3} isLoading={actionLoading}>Move to Pending</Button>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Box>
    );
  }

  // Regular user search view
  return (
    <Box maxW="2xl" mx="auto" px={6}>
      <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md">
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
        
        <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">Search for a Cheater</Heading>
        
        <form onSubmit={handleSearch}>
          <VStack gap={5} align="stretch">
            <Box>
              <label htmlFor="username" style={{ color: 'inherit' }}>Codeforces Username</label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (case-insensitive)"
                autoFocus
                mt={1}
              />
            </Box>
            <Button colorScheme="blue" type="submit" isLoading={loading} w="full" size="lg">
              Search
            </Button>
          </VStack>
        </form>
        
        {result && (
          <Box 
            mt={8} 
            borderWidth={2}
            borderColor={result.status === 'cheater' ? 'red.400' : 'green.400'}
            borderRadius="md"
            p={6}
            bg="white"
            _dark={{ 
              borderColor: result.status === 'cheater' ? 'red.500' : 'green.500',
              bg: "gray.700" 
            }}
          >
            {result.status === 'cheater' ? (
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="bold" color="red.500" _dark={{ color: "red.400" }} fontSize="xl" textAlign="center">
                  Cheater
                </Text>
                
                {/* Admin-only evidence section */}
                {user && result.evidence && (
                  <Box>
                    <Text fontWeight="semibold" mb={2} color="gray.700" _dark={{ color: "gray.200" }}>Evidence (Admin View):</Text>
                    <Box
                      bg="gray.50"
                      p={3}
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
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(result.evidence) }}
                    />
                    {result.reportedAt && (
                      <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }} mt={2}>
                        Reported on: {result.reportedAt.toDate ? result.reportedAt.toDate().toLocaleDateString() : 'Unknown date'}
                      </Text>
                    )}
                  </Box>
                )}
                
                {/* Admin-only action buttons */}
                {user && (
                  <Box mt={4} p={4} bg="yellow.50" borderRadius="md" border="1px" borderColor="yellow.200" _dark={{ bg: "yellow.900", borderColor: "yellow.700" }}>
                    <Text fontWeight="semibold" mb={3} color="yellow.800" _dark={{ color: "yellow.200" }}>Admin Actions:</Text>
                    <HStack spacing={3}>
                      <Button 
                        colorScheme="orange" 
                        size="sm" 
                        onClick={() => handleMoveToPending(result.docId, username, result.evidence)}
                        isLoading={actionLoading}
                        loadingText="Moving..."
                      >
                        Move back to pending
                      </Button>
                      <Button 
                        colorScheme="red" 
                        size="sm" 
                        onClick={() => handleRemoveFromDatabase(result.docId, username)}
                        isLoading={actionLoading}
                        loadingText="Removing..."
                      >
                        Remove from database
                      </Button>
                    </HStack>
                    <Text fontSize="xs" color="yellow.700" _dark={{ color: "yellow.300" }} mt={2}>
                      "Move back to pending" will remove them from cheaters but add them to pending reports for re-review.
                      "Remove from database" will completely delete them and all evidence.
                    </Text>
                  </Box>
                )}
                
                {/* Regular user message */}
                {!user && (
                  <Text color="gray.600" _dark={{ color: "gray.300" }} textAlign="center" fontSize="sm">
                    This user has been marked as a cheater. Evidence details are only visible to administrators.
                  </Text>
                )}
              </VStack>
            ) : (
              <Text fontWeight="bold" color="green.500" _dark={{ color: "green.400" }} fontSize="xl" textAlign="center">
                Not marked as cheater
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Search; 