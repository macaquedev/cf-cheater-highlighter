import { Box, Heading, Text, Input, Button, Link, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import RichTextEditor from '../components/RichTextEditor';
import { Icon } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

const Appeal = () => {
  const [appealUsername, setAppealUsername] = useState('');
  const [appealMessage, setAppealMessage] = useState('');
  const [appealStatus, setAppealStatus] = useState(null);
  const [appealDisabled, setAppealDisabled] = useState(false);
  const [verifyContest, setVerifyContest] = useState(null);
  const [verifyProblem, setVerifyProblem] = useState(null);
  const [rerollLoading, setRerollLoading] = useState(false);

  // Wrapper function to handle loading state
  const withLoading = async (loadingSetter, asyncFunction) => {
    loadingSetter(true);
    try {
      await asyncFunction();
    } finally {
      loadingSetter(false);
    }
  };

  const generateRandomProblem = async () => {
    const contest = Math.floor(Math.random() * 900) + 100;
    const problem = 'A';

    if (verifyContest && verifyContest === contest) {
      await generateRandomProblem();
      return;
    }
    
    setVerifyContest(contest);
    setVerifyProblem(problem);
  };

  const handleRerollProblem = () => {
    withLoading(setRerollLoading, generateRandomProblem);
  };

  if (verifyContest === null || verifyProblem === null) {
    generateRandomProblem();
  }

  const verifyUser = async (normalizedUsername) => {
    // Get user's recent submissions
    const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${normalizedUsername}&count=10`);
    const submissionsData = await submissionsResponse.json();
    
    if (submissionsData.status !== 'OK') {
      setAppealStatus({ type: 'error', text: 'Could not fetch user submissions. Please try again.' });
      return false;
    }

    // Check if any recent submission is a compilation error to the verify contest/problem
    const hasCompilationError = submissionsData.result.some(submission => 
      submission.problem.contestId === verifyContest &&
      submission.problem.index === verifyProblem &&
      submission.verdict === 'COMPILATION_ERROR'
    );

    if (!hasCompilationError) {
      setAppealStatus({ type: 'error', text: `We cannot verify your Codeforces account. Please submit a compilation error to the link above.` });
      return false;
    }
    return true;
  };

  const validateFormFields = () => {
    if (!appealUsername.trim() || !appealMessage.trim()) {
      setAppealStatus({ type: 'error', text: 'Please fill in all fields.' });
      return false;
    }
    return true;
  };

  const checkUserInCheatersDB = async (normalizedUsername) => {
    const cheatersRef = collection(db, 'cheaters');
    const cheaterQuery = query(cheatersRef, where('username', '==', normalizedUsername));
    const cheaterSnapshot = await getDocs(cheaterQuery);
    
    if (cheaterSnapshot.empty) {
      setAppealStatus({ type: 'error', text: `User "${appealUsername}" is not in the cheater database. Only users marked as cheaters can appeal.` });
      return false;
    }
    return true;
  };

  const checkExistingAppeal = async (normalizedUsername) => {
    const appealsRef = collection(db, 'appeals');
    const existingAppealQuery = query(appealsRef, where('username', '==', normalizedUsername));
    const existingAppealSnapshot = await getDocs(existingAppealQuery);
    
    if (!existingAppealSnapshot.empty) {
      const status = existingAppealSnapshot.docs[0].data().status;
      if (status === 'declined') {
        setAppealStatus({ type: 'error', text: `You can only appeal once. Your previous appeal was ${status}.` });
      } else if (status === 'pending') {
        setAppealStatus({ type: 'error', text: `An appeal for this user is already pending. Please wait for admin review.` });
      }
      return false;
    }
    return true;
  };

  const submitAppeal = async (normalizedUsername) => {
    const appealsRef = collection(db, 'appeals');
    await addDoc(appealsRef, {
      username: normalizedUsername,
      message: appealMessage.trim(),
      status: 'pending',
      submittedAt: new Date(),
    });
    
    setAppealStatus({ type: 'success', text: `Appeal for "${appealUsername}" submitted successfully!` });
    setAppealUsername('');
    setAppealMessage('');
  };

  const handleAppealSubmit = async () => {
    // Step 1: Validate form fields
    if (!validateFormFields()) {
      return;
    }

    const normalizedUsername = appealUsername.trim().replace(/\s+/g, '').toLowerCase();
    
    // Step 2: Check if user is in cheaters DB
    if (!(await checkUserInCheatersDB(normalizedUsername))) {
      return;
    }
    
    // Step 3: Check if an appeal already exists
    if (!(await checkExistingAppeal(normalizedUsername))) {
      return;
    }
    
    // Step 4: Verify user identity
    if (!(await verifyUser(normalizedUsername))) {
      return;
    }
    
    // Step 5: Submit the appeal
    await submitAppeal(normalizedUsername);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAppealDisabled(true);
    await handleAppealSubmit();
    setAppealDisabled(false);
  };

  return (
    <Box maxW="2xl" mx="auto" px={6}>
      <Box bg="white" _dark={{ bg: 'gray.800' }} p={8} rounded="md" shadow="md">
        <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
          Appeal a Cheater Mark
        </Heading>
        <Text mb={4} fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }}>
          If you believe you were wrongly marked as a cheater, you can submit an appeal. Only users currently in the cheater database can appeal. Each user can only appeal once.
          <br/>
          <b>Before you appeal, you must verify your identity by submitting a compilation error to the problem below.</b>
        </Text>
        <Box mb={4}>
          <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }} mb={2}>
            Current verification problem: <Link href={`https://codeforces.com/contest/${verifyContest}/problem/${verifyProblem}`} style={{color: "blue"}} target="_blank" rel="noopener noreferrer">{verifyContest}{verifyProblem}</Link>
          </Text>
          <Button 
            size="sm" 
            colorScheme="gray" 
            variant="outline"
            onClick={handleRerollProblem}
            isLoading={rerollLoading}
            loadingText="Rerolling..."
          >
            <Icon as={FiRefreshCw} />
            Reroll Problem
          </Button>
        </Box>
        {appealStatus && (
          <Box p={3} mb={4} rounded="md" bg={
            appealStatus.type === 'success' ? 'green.100' :
            'red.100'
          } color={
            appealStatus.type === 'success' ? 'green.800' :
            'red.800'
          } borderWidth={1} borderColor={
            appealStatus.type === 'success' ? 'green.200' :
            'red.200'
          } _dark={{
            bg: appealStatus.type === 'success' ? 'green.900' : 'red.900',
            color: appealStatus.type === 'success' ? 'green.200' : 'red.200',
            borderColor: appealStatus.type === 'success' ? 'green.700' : 'red.700'
          }}>
            <Text dangerouslySetInnerHTML={{__html: appealStatus.text}}></Text>
          </Box>
        )}
        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Box>
              <label htmlFor="appeal-username" style={{ color: 'inherit' }}>Codeforces Username</label>
              <Input
                id="appeal-username"
                placeholder="Enter username (case-insensitive)"
                value={appealUsername}
                onChange={(e) => setAppealUsername(e.target.value)}
                required
                mt={1}
              />
            </Box>
            <Box>
              <label htmlFor="appeal-message" style={{ color: 'inherit' }}>Appeal Message</label>
              <RichTextEditor
                value={appealMessage}
                onChange={setAppealMessage}
                placeholder="Enter appeal message with formatting options above"
                rows={4}
              />
            </Box>
            <Button colorScheme="blue" type="submit" w="full" size="lg" disabled={appealDisabled}>
              Submit Appeal
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Appeal; 