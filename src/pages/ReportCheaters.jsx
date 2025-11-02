import { Box, Heading, Text, Button, VStack, Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import MarkdownEditor from '../components/MarkdownEditor';
import { useAuth } from '../App';
import { submitReport, validateCodeforcesUsername } from '../utils/cheaterUtils';
import CfHandleSearch from '../components/CfHandleSearch';


const ReportCheaters = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState(null);

  // Auto-dismiss message after 15 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!username.trim() || !evidence.trim()) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    // Require evidence to include a markdown link object or a plaintext URL
    const hasMarkdownLink = /\[[^\]]+\]\((https?:\/\/[^)]+)\)/.test(evidence);
    const hasPlainUrl = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/.test(evidence);
    if (!hasMarkdownLink && !hasPlainUrl) {
      setMessage({ type: 'error', text: 'Evidence must include at least one link (either a plain URL like https://... or a markdown link like [text](https://...)).' });
      return;
    }

    setIsChecking(true);
    try {
      // Validate if the username exists on Codeforces
      const validation = await validateCodeforcesUsername(username);
      if (!validation.exists) {
        setMessage({ type: 'error', text: validation.error });
        setIsChecking(false);
        return;
      }

      // Check if user is already marked as a cheater
      const cheatersRef = collection(db, 'cheaters');
      const cheaterQuery = query(
        cheatersRef, 
        where('username', '==', validation.normalizedUsername),
        where('markedForDeletion', '==', false)
      );
      const cheaterSnapshot = await getDocs(cheaterQuery);
      
      if (!cheaterSnapshot.empty) {
        setMessage({ 
          type: 'error', 
          text: `User "${username}" is already marked as a cheater in the database. No additional reports are needed.` 
        });
        setIsChecking(false);
        return;
      }

      // Check if a pending report for this user already exists
      // * Disabled this for now to fix security issue
      // const reportsRef = collection(db, 'reports');
      // const existingReportQuery = query(
      //   reportsRef,
      //   where('username', '==', normalizedUsername),
      //   where('status', '==', 'pending')
      // );
      // const existingReportSnapshot = await getDocs(existingReportQuery);
      // if (!existingReportSnapshot.empty) {
      //   setMessage({
      //     type: 'error',
      //     text: `A report for "${username}" already exists and is under review. You cannot submit another report for the same user until the current one is resolved.`
      //   });
      //   setIsSubmitting(false);
      //   setIsChecking(false);
      //   return;
      // }
      
      // Switch to submitting state
      setIsChecking(false);
      setIsSubmitting(true);
      
      // Submit the new report
      await submitReport({ username: validation.normalizedUsername, evidence });
      setMessage({ type: 'success', text: `User "${username}" has been reported successfully!` });
      setUsername('');
      setEvidence('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to submit report. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setIsChecking(false);
    }
  }, [evidence, username]);

  // Keyboard shortcut: Ctrl+Enter submits the report
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && event.ctrlKey) {
        if (isSubmitting || isChecking) return;
        event.preventDefault();
        // Call submit handler with a no-op preventDefault
        handleSubmit({ preventDefault: () => {} });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, isChecking, handleSubmit]);

  return (
    <Box maxW="2xl" mx="auto" px={6}>
      <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md">
        <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
          Report a Cheater
        </Heading>

        {/* AI Rule Change Notice */}
        <Box
          bg="yellow.50"
          color="yellow.800"
          borderWidth={1}
          borderColor="yellow.200"
          rounded="md"
          px={4}
          py={3}
          mb={6}
          fontWeight="semibold"
          fontSize="sm"
          _dark={{ bg: "yellow.900", color: "yellow.100", borderColor: "yellow.700" }}
        >
          ⚠️ If you are reporting a cheater whom you suspect of AI use, <u>ONLY</u> report them if their AI submissions were made <b>after <span style={{whiteSpace: 'nowrap'}}>14/09/2024</span></b>.<br/>
          <span style={{fontWeight: 400}}>
            <i>This is the date when the new AI-assisted cheating rules came into effect. Do <b>not</b> report users for AI use before this date.</i>
          </span>
        </Box>

        {message && (
          <Box 
            p={4} 
            mb={6} 
            rounded="md" 
            bg={
              message.type === 'success' ? 'green.100' : 
              message.type === 'warning' ? 'yellow.100' : 
              message.type === 'info' ? 'blue.100' :
              'red.100'
            }
            color={
              message.type === 'success' ? 'green.800' : 
              message.type === 'warning' ? 'yellow.800' : 
              message.type === 'info' ? 'blue.800' :
              'red.800'
            }
            borderWidth={1}
            borderColor={
              message.type === 'success' ? 'green.200' : 
              message.type === 'warning' ? 'yellow.200' : 
              message.type === 'info' ? 'blue.200' :
              'red.200'
            }
            _dark={{
              bg: message.type === 'success' ? 'green.900' : 
                  message.type === 'warning' ? 'yellow.900' : 
                  message.type === 'info' ? 'blue.900' :
                  'red.900',
              color: message.type === 'success' ? 'green.200' : 
                     message.type === 'warning' ? 'yellow.200' : 
                     message.type === 'info' ? 'blue.200' :
                     'red.200',
              borderColor: message.type === 'success' ? 'green.700' : 
                          message.type === 'warning' ? 'yellow.700' : 
                          message.type === 'info' ? 'blue.700' :
                          'red.700'
            }}
            position="relative"
          >
            <Text>{message.text}</Text>
          </Box>
        )}

        {/* Admin notice */}
        {user && (
          <Box 
            display="flex"
            alignItems="center"
            gap={3}
            p={4}
            mb={6}
            rounded="md"
            bg="blue.50"
            color="blue.800"
            borderWidth={1}
            borderColor="blue.200"
            borderLeftWidth={6}
            borderLeftColor="blue.400"
            _dark={{ bg: "blue.900", color: "blue.200", borderColor: "blue.700", borderLeftColor: "blue.300" }}
          >
            <Box as="span" fontSize="2xl" mr={2} aria-label="Admin">
              ⚡
            </Box>
            <Box flex="1">
              <Text fontSize="md" fontWeight="semibold" mb={1}>Admin Notice</Text>
              <Text fontSize="sm">
                You can review and manage reports in the{' '}
                <Link
                  as={RouterLink}
                  to="/admin"
                  color="blue.600"
                  _dark={{ color: "blue.300" }}
                  fontWeight="semibold"
                  textDecoration="underline"
                  _hover={{ color: 'blue.800', _dark: { color: 'blue.100' } }}
                >
                  Admin Panel
                </Link>
                .
              </Text>
            </Box>
          </Box>
        )}

        <form onSubmit={handleSubmit}>
          <VStack gap={5} align="stretch">
            <Box>
              <label htmlFor="username" style={{ color: 'inherit' }}>Codeforces Username</label>
              <CfHandleSearch
                value={username}
                onChange={setUsername}
                id="username"
                required
              />
            </Box>
            
            <Box>
              <label htmlFor="evidence" style={{ color: 'inherit' }}>Evidence</label>
              <MarkdownEditor
                value={evidence}
                onChange={setEvidence}
                placeholder="Enter evidence with formatting options above"
                rows={4}
              />
            </Box>
            
            <Button 
              colorPalette="blue" 
              type="submit" 
              w="full" 
              size="lg"
              loading={isSubmitting || isChecking}
              loadingText={isChecking ? "Checking username..." : "Submitting report..."}
            >
              Submit Report
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default ReportCheaters;