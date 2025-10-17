import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, VStack, Text, Flex } from '@chakra-ui/react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { db } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useCollection } from 'react-firebase-hooks/firestore';
import { deleteCheater } from '../utils/cheaterUtils';

const AdminAppeals = () => {
  const { user } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  // Firebase hooks for real-time updates
  const pendingAppealsQuery = user ? query(collection(db, 'appeals'), where('status', '!=', 'declined')) : null;
  const [pendingAppealsSnapshot, pendingAppealsLoading, pendingAppealsError] = useCollection(pendingAppealsQuery);

  // Wrapper function to handle loading state
  const withLoading = async (loadingType, asyncFunction) => {
    setActionLoading(loadingType);
    try {
      await asyncFunction();
    } finally {
      setActionLoading(null);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  // Use the Firebase hook data
  useEffect(() => {
    if (pendingAppealsSnapshot && !pendingAppealsLoading) {
      const fetchAppealsWithEvidence = async () => {
        setLoading(true);
        const appealsData = [];
        
        for (const appealDoc of pendingAppealsSnapshot.docs) {
          const appeal = { id: appealDoc.id, ...appealDoc.data() };
          // Skip declined appeals
          if (appeal.status === 'declined') continue;
          
          // Fetch cheater evidence for this user
          const cheaterQuery = query(
            collection(db, 'cheaters'), 
            where('username', '==', appeal.username),
            where('markedForDeletion', '==', false)
          );
          const cheaterSnapshot = await getDocs(cheaterQuery);
          if (!cheaterSnapshot.empty) {
            const cheaterData = cheaterSnapshot.docs[0].data();
            appeal.cheaterEvidence = cheaterData.evidence;
            appeal.cheaterAdminNote = cheaterData.adminNote || null;
          } else {
            appeal.cheaterEvidence = null;
            appeal.cheaterAdminNote = null;
          }
          appealsData.push(appeal);
        }
        
        setAppeals(appealsData);
        // Reset current index if it's out of bounds
        if (currentIndex >= appealsData.length && appealsData.length > 0) {
          setCurrentIndex(0);
        } else if (appealsData.length === 0) {
          setCurrentIndex(0);
        }
        setLoading(false);
      };
      
      fetchAppealsWithEvidence();
    }
  }, [pendingAppealsSnapshot, pendingAppealsLoading, currentIndex]);

  // Handle any errors from the Firebase hook
  useEffect(() => {
    if (pendingAppealsError) {
      console.error('Error fetching pending appeals:', pendingAppealsError);
      setMessage({ type: 'error', text: 'Failed to fetch appeals.' });
    }
  }, [pendingAppealsError]);

  const handleAcceptAppeal = async (appeal) => {
    // Find and delete the cheater using the utility function
    const cheaterQuery = query(
      collection(db, 'cheaters'), 
      where('username', '==', appeal.username),
      where('markedForDeletion', '==', false)
    );
    const cheaterSnapshot = await getDocs(cheaterQuery);
    if (!cheaterSnapshot.empty) {
      const cheaterData = { id: cheaterSnapshot.docs[0].id, ...cheaterSnapshot.docs[0].data() };
      await deleteCheater(cheaterData);
    }
    await deleteDoc(doc(db, 'appeals', appeal.id));
    setMessage({ type: 'success', text: 'Appeal accepted and user completely removed from cheaters.' });
    // No need to manually update state - the Firebase hook will automatically update the data
  };

  const handleDeclineAppeal = async (appeal) => {
    await updateDoc(doc(db, 'appeals', appeal.id), { 
      status: 'declined',
      lastModified: new Date()
    });
    setMessage({ type: 'info', text: 'Appeal declined.' });
    // No need to manually update state - the Firebase hook will automatically update the data
  };

  const handleAcceptAppealWithLoading = (appeal) => {
    withLoading('accept', () => handleAcceptAppeal(appeal));
  };

  const handleDeclineAppealWithLoading = (appeal) => {
    withLoading('decline', () => handleDeclineAppeal(appeal));
  };

  // Navigation handlers
  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, appeals.length - 1));

  // Add keyboard navigation for appeals
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!user || appeals.length === 0) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, appeals.length - 1));
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, appeals.length]);

  // Show loading while checking authentication
  if (!user) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} py={8} px={4}>
      <Flex align="center" justify="center" minH="70vh">
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="lg" w="100%">
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
            >
              <Text>{message.text}</Text>
            </Box>
          )}
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: 'blue.400' }} textAlign="center">
            Review Appeals
          </Heading>
          {loading ? (
            <Text>Loading appeals...</Text>
          ) : appeals.length === 0 ? (
            <VStack gap={6} align="center" py={8}>
              <Box 
                p={6} 
                bg="blue.50" 
                borderRadius="full"
                color="blue.600"
                _dark={{ 
                  bg: "blue.900",
                  color: "blue.300"
                }}
              >
                <Text fontSize="3xl">✓</Text>
              </Box>
              <VStack gap={2} textAlign="center">
                <Text fontSize="lg" fontWeight="semibold" color="gray.700" _dark={{ color: "gray.200" }}>
                  All Caught Up!
                </Text>
                <Text color="gray.500" _dark={{ color: "gray.400" }} maxW="sm">
                  There are currently no pending appeals to review. The queue is empty and all appeals have been processed.
                </Text>
              </VStack>
            </VStack>
          ) : (
            <VStack gap={6} align="stretch">
              <Flex align="center" justify="space-between">
                <Button
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  variant="ghost"
                  size="sm"
                >
                  ← Previous
                </Button>
                <Text fontWeight="bold">
                  Appeal {currentIndex + 1} of {appeals.length}
                </Text>
                <Button
                  onClick={handleNext}
                  disabled={currentIndex === appeals.length - 1}
                  variant="ghost"
                  size="sm"
                >
                  Next →
                </Button>
              </Flex>
              <Box borderWidth={1} borderRadius="md" p={6} shadow="sm" bg="gray.50" _dark={{ bg: "gray.700" }}>
                <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                  Username:
                </Text>
                <Text mb={4}>
                  <a
                    href={`https://codeforces.com/profile/${appeals[currentIndex]?.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3182ce', textDecoration: 'underline' }}
                  >
                    {appeals[currentIndex]?.username}
                  </a>
                </Text>
                <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                  Appeal Message:
                </Text>
                <Box
                  mb={4}
                  p={4}
                  bg="white"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="gray.200"
                  _dark={{ 
                    bg: "gray.600",
                    borderColor: "gray.500" 
                  }}
                  minH="60px"
                  maxH="200px"
                  overflowY="auto"
                >
                  <Text>{appeals[currentIndex]?.message}</Text>
                </Box>
                <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                  Evidence:
                </Text>
                <Box
                  mb={4}
                  p={4}
                  bg="white"
                  borderRadius="md"
                  borderWidth={1}
                  borderColor="gray.200"
                  _dark={{ 
                    bg: "gray.600",
                    borderColor: "gray.500" 
                  }}
                  minH="60px"
                  maxH="200px"
                  overflowY="auto"
                >
                  <Text>{appeals[currentIndex]?.cheaterEvidence || 'Not found'}</Text>
                </Box>
                <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                  Admin Note:
                </Text>
                {appeals[currentIndex]?.cheaterAdminNote ? (
                  <Box
                    mb={4}
                    p={4}
                    bg="blue.50"
                    borderRadius="md"
                    borderWidth={1}
                    borderColor="gray.200"
                    _dark={{ 
                      bg: "gray.600",
                      borderColor: "gray.500" 
                    }}
                    maxH="200px"
                    overflowY="auto"
                  >
                    <MarkdownRenderer>{appeals[currentIndex]?.cheaterAdminNote}</MarkdownRenderer>
                  </Box>
                ) : (
                  <Box
                    mb={4}
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    borderWidth={1}
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
                <Flex gap={4}>
                  <Button 
                    colorPalette="green" 
                    onClick={() => handleAcceptAppealWithLoading(appeals[currentIndex])} 
                    loading={actionLoading === 'accept'} 
                    loadingText="Processing..."
                    disabled={actionLoading !== null}
                  >
                    Accept Appeal
                  </Button>
                  <Button 
                    colorPalette="red" 
                    onClick={() => handleDeclineAppealWithLoading(appeals[currentIndex])} 
                    loading={actionLoading === 'decline'} 
                    loadingText="Processing..."
                    disabled={actionLoading !== null}
                  >
                    Decline Appeal
                  </Button>
                </Flex>
              </Box>
            </VStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default AdminAppeals; 