import React, { useState, useEffect } from 'react';
import {
  Box, Button, Heading, VStack, Input, Text, Flex
} from '@chakra-ui/react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import MarkdownRenderer from '../components/MarkdownRenderer';
import MarkdownEditor from '../components/MarkdownEditor';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { addCheaterToDatabase } from '../utils/cheaterUtils';
import { useCollection } from 'react-firebase-hooks/firestore';

const AdminReports = () => {
  const { user } = useAuth();
  const [pendingReports, setPendingReports] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [message, setMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const navigate = useNavigate();

  // Firebase hooks for real-time updates
  const pendingReportsQuery = user ? query(collection(db, 'reports'), where('status', '==', 'pending')) : null;
  const [pendingReportsSnapshot, pendingReportsLoading, pendingReportsError] = useCollection(pendingReportsQuery);

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
    if (pendingReportsSnapshot && !pendingReportsLoading) {
      const reports = [];
      pendingReportsSnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setPendingReports(reports);
      // Reset current index if it's out of bounds
      if (currentIndex >= reports.length && reports.length > 0) {
        setCurrentIndex(0);
      } else if (reports.length === 0) {
        setCurrentIndex(0);
      }
    }
  }, [pendingReportsSnapshot, pendingReportsLoading, currentIndex]);

  // Handle any errors from the Firebase hook
  useEffect(() => {
    if (pendingReportsError) {
      console.error('Error fetching pending reports:', pendingReportsError);
      setMessage({ type: 'error', text: 'Failed to fetch reports.' });
    }
  }, [pendingReportsError]);

  const handleAccept = async () => {
    const report = pendingReports[currentIndex];
    if (!report) return;
    
    // Check if user is already marked as a cheater
    const cheatersRef = collection(db, 'cheaters');
    const existingCheaterQuery = query(
      cheatersRef, 
      where('username', '==', report.username.toLowerCase()),
      where('markedForDeletion', '!=', true)
    );
    const existingCheaterSnapshot = await getDocs(existingCheaterQuery);

    if (!existingCheaterSnapshot.empty) {
      setMessage({ type: 'error', text: 'User is already marked as a cheater in the database.' });
      return;
    }
    
    const deletedCount = await addCheaterToDatabase({ report, adminNote, user });
    const messageText = deletedCount > 0 
      ? `Report accepted and user added to cheaters. ${deletedCount} duplicate pending report(s) were automatically cleaned up.`
      : 'Report accepted and user added to cheaters.';
    setMessage({ type: 'success', text: messageText });
    setAdminNote('');
    // No need to manually refresh - the Firebase hook will automatically update the data
  };

  const handleDecline = async () => {
    const report = pendingReports[currentIndex];
    if (!report) return;

    await deleteDoc(doc(db, 'reports', report.id));
    setMessage({ type: 'info', text: 'Report declined.' });
    setAdminNote(''); // Clear admin note after declining
    // No need to manually refresh - the Firebase hook will automatically update the data
  };

  const handleAcceptWithLoading = () => {
    withLoading('accept', handleAccept);
  };

  const handleDeclineWithLoading = () => {
    withLoading('decline', handleDecline);
  };

  const handlePrev = () => {
    console.log('Previous clicked, current index:', currentIndex); // Debug log
    setCurrentIndex((i) => Math.max(i - 1, 0));
    setAdminNote(''); // Reset admin note when navigating
  };
  
  const handleNext = () => {
    console.log('Next clicked, current index:', currentIndex, 'total reports:', pendingReports.length); // Debug log
    setCurrentIndex((i) => Math.min(i + 1, pendingReports.length - 1));
    setAdminNote(''); // Reset admin note when navigating
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
      } else if (event.key === 'Enter' && event.ctrlKey) {
        // Ctrl+Enter accepts the current report
        if (actionLoading !== null) return;
        event.preventDefault();
        handleAcceptWithLoading();
      } else if ((event.key === 'y' || event.key === 'Y') && event.ctrlKey) {
        // Ctrl+Y declines the current report
        if (actionLoading !== null) return;
        event.preventDefault();
        handleDeclineWithLoading();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, pendingReports.length, actionLoading, handleAcceptWithLoading, handleDeclineWithLoading]);

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
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="2xl" w="100%">
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
            Review Reports
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
              position="relative"
            >
              <Button
                position="absolute"
                top={2}
                right={2}
                size="sm"
                variant="ghost"
                onClick={() => setMessage(null)}
                color="inherit"
                _hover={{ bg: 'rgba(0,0,0,0.1)' }}
                _dark={{ _hover: { bg: 'rgba(255,255,255,0.1)' } }}
              >
                ×
              </Button>
              <Text>{message.text}</Text>
            </Box>
          )}
          
          {pendingReportsLoading ? (
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
                  disabled={currentIndex === 0}
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
                  disabled={currentIndex === pendingReports.length - 1}
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
                    href={`https://codeforces.com/profile/${pendingReports[currentIndex]?.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3182ce', textDecoration: 'underline' }}
                  >
                    {pendingReports[currentIndex]?.username}
                  </a>
                </Text>
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
                >
                  <MarkdownRenderer>{pendingReports[currentIndex]?.evidence || ''}</MarkdownRenderer>
                </Box>
                
                <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                  Admin Note (Optional):
                </Text>
                <Box mb={4} p={4} bg="white" borderRadius="md" borderWidth={1} borderColor="gray.200" _dark={{ bg: "gray.700", borderColor: "gray.600" }}>
                  <Box mt={-2}>
                    <MarkdownEditor
                      value={adminNote}
                      onChange={setAdminNote}
                      placeholder="Add any additional notes or context for this report..."
                      rows={3}
                    />
                  </Box>
                </Box>
                <Flex gap={4}>
                  <Button 
                    colorPalette="green" 
                    onClick={handleAcceptWithLoading} 
                    loading={actionLoading === 'accept'} 
                    loadingText="Processing..."
                    disabled={actionLoading !== null}
                  >
                    Add to Database
                  </Button>
                  <Button 
                    colorPalette="red" 
                    onClick={handleDeclineWithLoading} 
                    loading={actionLoading === 'decline'} 
                    loadingText="Processing..."
                    disabled={actionLoading !== null}
                  >
                    Decline Report
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

export default AdminReports; 