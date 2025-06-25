import React, { useState, useEffect } from 'react';
import {
  Box, Button, Heading, VStack, Input, Text, Flex
} from '@chakra-ui/react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { renderMarkdown } from '../utils/markdownRenderer';

const Admin = () => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [pendingReports, setPendingReports] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState(null);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPendingReports();
    } else {
      setPendingReports([]);
      setCurrentIndex(0);
    }
    // eslint-disable-next-line
  }, [user]);

  const fetchPendingReports = async () => {
    setLoadingReports(true);
    try {
      const q = query(collection(db, 'reports'), where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      const reports = [];
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      console.log('Fetched reports:', reports); // Debug log
      setPendingReports(reports);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching reports:', error); // Debug log
      setMessage({ type: 'error', text: 'Failed to fetch reports.' });
    } finally {
      setLoadingReports(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setMessage(null); // Clear any existing messages
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Clear form fields on successful login
      setEmail('');
      setPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleAccept = async () => {
    const report = pendingReports[currentIndex];
    if (!report) return;
    try {
      // Check if user is already in cheaters collection
      const cheatersRef = collection(db, 'cheaters');
      const existingCheaterQuery = query(cheatersRef, where('username', '==', report.username.toLowerCase()));
      const existingCheaterSnapshot = await getDocs(existingCheaterQuery);
      
      if (!existingCheaterSnapshot.empty) {
        setMessage({ type: 'error', text: 'User is already marked as a cheater in the database.' });
        return;
      }
      
      // Add to cheaters collection with lowercase username
      await addDoc(collection(db, 'cheaters'), {
        username: report.username.toLowerCase(), // Ensure lowercase storage
        evidence: report.evidence,
        reportedAt: report.reportedAt || new Date(),
      });
      
      // Mark current report as accepted
      await updateDoc(doc(db, 'reports', report.id), { status: 'accepted' });
      
      // Find and actually delete all other pending reports for the same username
      const reportsRef = collection(db, 'reports');
      const duplicateQuery = query(
        reportsRef, 
        where('username', '==', report.username.toLowerCase()),
        where('status', '==', 'pending')
      );
      const duplicateSnapshot = await getDocs(duplicateQuery);
      
      const deletePromises = duplicateSnapshot.docs.map(doc => {
        if (doc.id !== report.id) { // Don't delete the one we just accepted
          return deleteDoc(doc.ref); // Actually delete instead of marking as deleted
        }
        return Promise.resolve();
      });
      
      await Promise.all(deletePromises);
      
      const deletedCount = duplicateSnapshot.docs.length - 1; // Subtract 1 for the accepted report
      const messageText = deletedCount > 0 
        ? `Report accepted and user added to cheaters. ${deletedCount} duplicate pending report(s) were automatically cleaned up.`
        : 'Report accepted and user added to cheaters.';
      
      setMessage({ type: 'success', text: messageText });
      fetchPendingReports();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to accept report.' });
    }
  };

  const handleDecline = async () => {
    const report = pendingReports[currentIndex];
    if (!report) return;
    try {
      await updateDoc(doc(db, 'reports', report.id), { status: 'declined' });
      setMessage({ type: 'info', text: 'Report declined.' });
      fetchPendingReports();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to decline report.' });
    }
  };

  const handlePrev = () => {
    console.log('Previous clicked, current index:', currentIndex); // Debug log
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };
  
  const handleNext = () => {
    console.log('Next clicked, current index:', currentIndex, 'total reports:', pendingReports.length); // Debug log
    setCurrentIndex((i) => Math.min(i + 1, pendingReports.length - 1));
  };

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!user || pendingReports.length === 0) return;
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, pendingReports.length - 1));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, pendingReports.length]);

  // Clear error messages when user successfully logs in
  useEffect(() => {
    if (user && message && message.type === 'error') {
      setMessage(null);
    }
  }, [user, message]);

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} py={8} px={4}>
      <Flex align="center" justify="center" minH="70vh">
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="lg" w="100%">
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
            Admin Panel
          </Heading>
          
          {message && (
            <Box 
              p={4} 
              mb={4} 
              rounded="md" 
              bg={message.type === 'success' ? 'green.100' : message.type === 'error' ? 'red.100' : 'blue.100'}
              color={message.type === 'success' ? 'green.800' : message.type === 'error' ? 'red.800' : 'blue.800'}
              borderWidth={1}
              borderColor={message.type === 'success' ? 'green.200' : message.type === 'error' ? 'red.200' : 'blue.200'}
              _dark={{
                bg: message.type === 'success' ? 'green.900' : message.type === 'error' ? 'red.900' : 'blue.900',
                color: message.type === 'success' ? 'green.200' : message.type === 'error' ? 'red.200' : 'blue.200',
                borderColor: message.type === 'success' ? 'green.700' : message.type === 'error' ? 'red.700' : 'blue.700'
              }}
            >
              <Text>{message.text}</Text>
              <Button 
                size="sm" 
                variant="ghost" 
                position="absolute" 
                right="8px" 
                top="8px"
                onClick={() => setMessage(null)}
              >
                ×
              </Button>
            </Box>
          )}
          
          {!user ? (
            <form onSubmit={handleLogin}>
              <VStack gap={4} align="stretch">
                <Box>
                  <label htmlFor="email" style={{ color: 'inherit' }}>Email</label>
                  <Input
                    id="email"
                    type="email"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    mt={1}
                  />
                </Box>
                <Button colorScheme="blue" type="submit" isLoading={authLoading}>
                  Login
                </Button>
              </VStack>
            </form>
          ) : (
            <>
              {loadingReports ? (
                <Text>Loading reports...</Text>
              ) : pendingReports.length === 0 ? (
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
                      There are currently no pending reports to review. 
                      The queue is empty and all reports have been processed.
                    </Text>
                  </VStack>
                  <Box 
                    p={4} 
                    bg="gray.50" 
                    borderRadius="md" 
                    borderWidth={1}
                    borderColor="gray.200"
                    w="full"
                    _dark={{ 
                      bg: "gray.700",
                      borderColor: "gray.600"
                    }}
                  >
                    <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} textAlign="center">
                      💡 Tip: You can use the Search page to view all cheaters in the database
                    </Text>
                  </Box>
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
                      Report {currentIndex + 1} of {pendingReports.length}
                    </Text>
                    <Button
                      onClick={handleNext}
                      isDisabled={currentIndex === pendingReports.length - 1}
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
                    <Text mb={4}>{pendingReports[currentIndex]?.username}</Text>
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
                      minH="100px"
                      maxH="300px"
                      overflowY="auto"
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
                      dangerouslySetInnerHTML={{ 
                        __html: renderMarkdown(pendingReports[currentIndex]?.evidence || '')
                      }}
                    />
                    <Flex gap={4}>
                      <Button colorScheme="green" onClick={handleAccept}>
                        Add to Database
                      </Button>
                      <Button colorScheme="red" onClick={handleDecline}>
                        Decline Report
                      </Button>
                    </Flex>
                  </Box>
                </VStack>
              )}
            </>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default Admin; 