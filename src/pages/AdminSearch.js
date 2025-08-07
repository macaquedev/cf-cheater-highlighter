import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Input, Heading, Text, HStack, VStack, Table, Dialog, Portal, Skeleton, SkeletonText } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownEditor from '../components/MarkdownEditor';
import { useAuth } from '../App';
import {
  fetchTotalCheaters as fetchTotalCheatersUtil,
  fetchCheaters as fetchCheatersUtil,
  deleteAllReportsForUsername,
  moveToPending,
  deleteCheater,
  setAdminNote
} from '../utils/cheaterUtils';

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

  // Inline admin note editing states
  // const [editingNoteId, setEditingNoteId] = useState(null); // Removed
  const [editingNoteValue, setEditingNoteValue] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCheaters, setTotalCheaters] = useState(0); // Total count of cheaters
  const [totalPages, setTotalPages] = useState(1); // Total number of pages

  const [pageCache, setPageCache] = useState({});
  const [isNavigating, setIsNavigating] = useState(false);
  const lastKeyPressTime = useRef(0);
  const [cheaterCountCache, setCheaterCountCache] = useState({});

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

  // Misc
  const [currentAction, setCurrentAction] = useState('');
  // const [actionId, setActionId] = useState(null);
  const [message, setMessage] = useState(null);

  const navigate = useNavigate();

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

  function loadFromCache(cacheKey) {
    const cache = pageCache[cacheKey];
    if (!cache) return false;
    setAllCheaters(cache.data);
    setTotalPages(Math.max(1, cache.totalPages));
    setTotalCheaters(Number(cache.totalCheaters));
    setTableLoading(false);
    return true;
  }

  // Refetch data when currentPage changes
  useEffect(() => {
    if (user) {
      // Check cache before fetching
      const cacheKey = JSON.stringify([searchTerm, currentPage]);
      if (loadFromCache(cacheKey)) return;
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
      const total = await fetchTotalCheatersUtil(search);
      setTotalCheaters(total);
      setTotalPages(Math.max(1, Math.ceil(total / PAGE_SIZE)));
      setCheaterCountCache(prev => ({ ...prev, [search]: Number(total) }));
    } catch (error) {
      console.error('Error fetching total cheaters:', error);
      setTotalCheaters(0);
    }
  };

  // Fetch cheaters with page-based pagination and caching
  const fetchCheaters = async (search = '') => {
    const cacheKey = JSON.stringify([search, currentPage]);
    if (loadFromCache(cacheKey)) return;
    setTableLoading(true);
    try {
      const cheaters = await fetchCheatersUtil(currentPage, search, PAGE_SIZE);
      setAllCheaters(cheaters);
    } catch (error) {
      showMessage('Error fetching cheaters: ' + error.message, 'error');
    } finally {
      setTableLoading(false);
    }
  };

  // Open confirmation dialog for move to pending
  const handleMoveToPending = (cheater) => {
    setSelectedCheater(cheater);
    setMoveDialogOpen(true);
  };

  // Actually move after confirmation
  const confirmMoveToPending = async () => {
    if (!selectedCheater) return;
    setCurrentAction('moveToPending');
    try {
      await moveToPending(selectedCheater, user);
      showMessage(`User "${selectedCheater.username}" has been moved back to pending review.`, 'success');
      setCheaterCountCache(prev => ({ ...prev, [searchTerm]: undefined }));
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm);
    } catch (error) {
      showMessage('Error moving user to pending: ' + error.message, 'error');
    } finally {
      setCurrentAction('');
      setMoveDialogOpen(false);
      setSelectedCheater(null);
    }
  };

  // Open confirmation dialog
  const handleRemoveFromDatabase = (cheater) => {
    setSelectedCheater(cheater);
    setDeleteDialogOpen(true);
  };

  // Actually delete after confirmation
  const confirmDelete = async () => {
    if (!selectedCheater) return;
    setCurrentAction('delete');
    try {
      await deleteCheater(selectedCheater);
      showMessage(`User "${selectedCheater.username}" has been completely removed from the database.`, 'success');
      setCheaterCountCache(prev => ({ ...prev, [searchTerm]: undefined }));
      fetchCheaters(searchTerm);
      fetchTotalCheaters(searchTerm);
    } catch (error) {
      showMessage('Error removing user: ' + error.message, 'error');
    } finally {
      setCurrentAction('');
      setDeleteDialogOpen(false);
      setSelectedCheater(null);
    }
  };

  const handleSeeEvidence = (cheater) => {
    setSelectedCheater(cheater);
    setEvidenceDialogOpen(true);
    setEditingNote(false);
    setEditingNoteValue('');
  };

  // Inline save handler for admin note
  const handleSaveAdminNote = async (cheater) => {
    setSavingNote(true);
    try {
      await setAdminNote(cheater, editingNoteValue);
      const updatedCheater = { ...cheater, adminNote: editingNoteValue };
      if (selectedCheater && selectedCheater.id === cheater.id) {
        setSelectedCheater(updatedCheater);
      }
      setAllCheaters(prev => prev.map(c => c.id === cheater.id ? updatedCheater : c));
      setPageCache({});
      setEditingNote(false);
      setEditingNoteValue('');
      showMessage('Admin note updated.', 'success');
    } catch (error) {
      showMessage('Error updating admin note: ' + error.message, 'error');
    } finally {
      setSavingNote(false);
    }
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
            <Table.Root variant="simple" maxW="5xl" mx="auto">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="20%" textAlign="center">Username</Table.ColumnHeader>
                  <Table.ColumnHeader width="15%" textAlign="center">Date Reported</Table.ColumnHeader>
                  <Table.ColumnHeader width="15%" textAlign="center">Accepted By</Table.ColumnHeader>
                  <Table.ColumnHeader width="50%" textAlign="center">Actions</Table.ColumnHeader>
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
                    <Table.Cell textAlign="center" width="120px">
                      <Box display="flex" justifyContent="center" alignItems="center" height="24px">
                        <Skeleton loading={tableLoading || isNavigating} height="24px" width="100px">
                          <Text textAlign="center" fontSize="sm">
                            {cheater?.acceptedBy ? cheater.acceptedBy.split('@')[0] : 'Unknown'}
                          </Text>
                        </Skeleton>
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <HStack spacing={2} justify="center" wrap="wrap">
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
                            onClick={() => handleMoveToPending(cheater)}
                          >
                            Move to pending
                          </Button>
                        </Skeleton>
                        <Skeleton loading={tableLoading || isNavigating} height="32px" borderRadius="md">
                          <Button
                            colorPalette="red"
                            size="sm"
                            onClick={() => handleRemoveFromDatabase(cheater)}
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

      {/* Evidence Dialog - inline admin note editing */}
      <Dialog.Root open={evidenceDialogOpen} onOpenChange={(e) => {
        setEvidenceDialogOpen(e.open);
        if (!e.open) {
          setSelectedCheater(null);
          setEditingNote(false);
          setEditingNoteValue('');
        }
      }}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="2xl">
              <Dialog.Header>
                <Dialog.Title>Evidence for {selectedCheater?.username}</Dialog.Title>
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
                    >
                      <MarkdownRenderer>{selectedCheater?.evidence || ''}</MarkdownRenderer>
                    </Box>
                  </Box>
                  
                  {/* Admin Acceptance Information */}
                  <Box>
                    <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                      Report Details:
                    </Text>
                    <Box
                      bg="blue.50"
                      p={3}
                      rounded="md"
                      border="1px"
                      borderColor="blue.200"
                      _dark={{ 
                        bg: "blue.900",
                        borderColor: "blue.700" 
                      }}
                    >
                      <VStack gap={2} align="stretch">
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold">Reported:</Text>{' '}
                          {selectedCheater?.reportedAt
                            ? (selectedCheater.reportedAt?.toDate
                                ? selectedCheater.reportedAt.toDate().toLocaleDateString()
                                : new Date(selectedCheater.reportedAt).toLocaleDateString())
                            : 'Unknown'}
                        </Text>
                        <Text fontSize="sm">
                          <Text as="span" fontWeight="bold">Accepted by:</Text>{' '}
                          {selectedCheater?.acceptedBy || 'Unknown'}
                        </Text>
                        {selectedCheater?.acceptedAt && (
                          <Text fontSize="sm">
                            <Text as="span" fontWeight="bold">Accepted on:</Text>{' '}
                            {selectedCheater.acceptedAt?.toDate
                              ? selectedCheater.acceptedAt.toDate().toLocaleDateString() + ' at ' + selectedCheater.acceptedAt.toDate().toLocaleTimeString()
                              : new Date(selectedCheater.acceptedAt).toLocaleDateString() + ' at ' + new Date(selectedCheater.acceptedAt).toLocaleTimeString()}
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  </Box>
                  
                  <Box>
                    <HStack justify="space-between" align="center" mb={2}>
                      <Text fontWeight="bold" color="blue.700" _dark={{ color: "blue.300" }}>
                        Admin Note:
                      </Text>
                    </HStack>
                    {editingNote ? (
                      <Box>
                        <MarkdownEditor
                          value={editingNoteValue}
                          onChange={setEditingNoteValue}
                          minRows={4}
                          maxRows={12}
                          isDisabled={savingNote}
                        />
                        <HStack mt={2} spacing={2}>
                          <Button
                            size="sm"
                            colorPalette="green"
                            onClick={() => handleSaveAdminNote(selectedCheater)}
                            loading={savingNote}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNote(false);
                              setEditingNoteValue('');
                            }}
                            isDisabled={savingNote}
                          >
                            Cancel
                          </Button>
                        </HStack>
                      </Box>
                    ) : (
                      <Box>
                        {selectedCheater?.adminNote ? (
                          <Box
                            bg="blue.50"
                            p={4}
                            rounded="md"
                            border="1px"
                            borderColor="gray.200"
                            _dark={{ 
                              bg: "gray.600",
                              borderColor: "gray.500" 
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
                        <Button
                          mt={2}
                          size="sm"
                          colorPalette="green"
                          onClick={() => {
                            setEditingNote(true);
                            setEditingNoteValue(selectedCheater.adminNote || '');
                          }}
                        >
                          Edit Note
                        </Button>
                      </Box>
                    )}
                  </Box>
                </VStack>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => {
                  setEvidenceDialogOpen(false);
                  setSelectedCheater(null);
                  setEditingNote(false);
                  setEditingNoteValue('');
                }}>
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
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
                <Button colorPalette="red" onClick={confirmDelete} ml={3} loading={currentAction === 'delete'}>Delete</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Move to Pending Confirmation Dialog */}
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
                <Button colorPalette="orange" onClick={confirmMoveToPending} ml={3} loading={currentAction === 'moveToPending'}>Move to Pending</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  );
};

export default AdminSearch;