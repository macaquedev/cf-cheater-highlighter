import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, VStack, Text, HStack, Input, Flex } from '@chakra-ui/react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';

const AdminAppeals = ({ user: initialUser }) => {
  const [user, setUser] = useState(initialUser || null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState(null);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAppeals = async () => {
      setLoading(true);
      const appealsSnapshot = await getDocs(collection(db, 'appeals'));
      const appealsData = [];
      for (const appealDoc of appealsSnapshot.docs) {
        const appeal = { id: appealDoc.id, ...appealDoc.data() };
        // Skip declined appeals
        if (appeal.status === 'declined') continue;
        // Fetch cheater evidence for this user
        const cheaterQuery = query(collection(db, 'cheaters'), where('username', '==', appeal.username));
        const cheaterSnapshot = await getDocs(cheaterQuery);
        if (!cheaterSnapshot.empty) {
          appeal.cheaterEvidence = cheaterSnapshot.docs[0].data().evidence;
        } else {
          appeal.cheaterEvidence = null;
        }
        appealsData.push(appeal);
      }
      setAppeals(appealsData);
      setCurrentIndex(0);
      setLoading(false);
    };
    fetchAppeals();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
    } catch (error) {
      setAuthMessage({ type: 'error', text: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAcceptAppeal = async (appeal) => {
    try {
      const cheaterQuery = query(collection(db, 'cheaters'), where('username', '==', appeal.username));
      const cheaterSnapshot = await getDocs(cheaterQuery);
      if (!cheaterSnapshot.empty) {
        // Delete all cheater docs for this username
        const deletePromises = cheaterSnapshot.docs.map(docSnap => deleteDoc(doc(db, 'cheaters', docSnap.id)));
        await Promise.all(deletePromises);
      }
      await deleteDoc(doc(db, 'appeals', appeal.id));
      const newAppeals = appeals.filter(a => a.id !== appeal.id);
      setAppeals(newAppeals);
      setCurrentIndex((i) => Math.max(0, Math.min(i, newAppeals.length - 1)));
      setMessage({ type: 'success', text: 'Appeal accepted and user completely removed from cheaters.' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to accept appeal.' });
    }
  };

  const handleDeclineAppeal = async (appeal) => {
    await updateDoc(doc(db, 'appeals', appeal.id), { status: 'declined' });
    // Remove declined appeal from the queue
    const newAppeals = appeals.filter(a => a.id !== appeal.id);
    setAppeals(newAppeals);
    setCurrentIndex((i) => Math.max(0, Math.min(i, newAppeals.length - 1)));
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

  if (!user) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} py={8} px={4}>
        <Flex align="center" justify="center" minH="70vh">
          <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="lg" w="100%">
            <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
              Admin Panel
            </Heading>
            {authMessage && (
              <Box p={4} mb={4} rounded="md" bg="red.100" color="red.800" borderWidth={1} borderColor="red.200" _dark={{ bg: 'red.900', color: 'red.200', borderColor: 'red.700' }}>
                <Text>{authMessage.text}</Text>
              </Box>
            )}
            <form onSubmit={handleLogin}>
              <VStack spacing={4} align="stretch">
                <Box>
                  <label htmlFor="email" style={{ color: 'inherit' }}>Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter admin email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    mt={1}
                  />
                </Box>
                <Box>
                  <label htmlFor="password" style={{ color: 'inherit' }}>Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    mt={1}
                  />
                </Box>
                <Button colorScheme="blue" type="submit" w="full" size="lg" isLoading={authLoading} loadingText="Signing in...">
                  Login
                </Button>
              </VStack>
            </form>
          </Box>
        </Flex>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} py={8} px={4}>
      <Flex align="center" justify="center" minH="70vh">
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="lg" w="100%">
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: 'blue.400' }} textAlign="center">
            Appeals Admin Panel
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
                  isDisabled={currentIndex === 0}
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
                  isDisabled={currentIndex === appeals.length - 1}
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
                  Evidence (why marked as cheater):
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
                <Flex gap={4}>
                  <Button colorScheme="green" onClick={() => handleAcceptAppeal(appeals[currentIndex])}>
                    Accept Appeal
                  </Button>
                  <Button colorScheme="red" onClick={() => handleDeclineAppeal(appeals[currentIndex])}>
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