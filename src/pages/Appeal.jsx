import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';
import { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import MarkdownEditor from '../components/MarkdownEditor';
import CFVerifier from '../components/CFVerifier';
import CfHandleSearch from '../components/CfHandleSearch';
import { submitAppeal } from '../utils/cheaterUtils';

const Appeal = () => {
  const [appealUsername, setAppealUsername] = useState('');
  const [appealMessage, setAppealMessage] = useState('');
  const [appealStatus, setAppealStatus] = useState(null);
  const [appealDisabled, setAppealDisabled] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const verificationRef = useRef();

  const validateFormFields = () => {
    if (!appealUsername.trim() || !appealMessage.trim()) {
      setAppealStatus({ type: 'error', text: 'Please fill in all fields.' });
      return false;
    }
    return true;
  };

  const checkUserInCheatersDB = async (normalizedUsername) => {
    const cheatersRef = collection(db, 'cheaters');
    const cheaterQuery = query(
      cheatersRef, 
      where('username', '==', normalizedUsername),
      where('markedForDeletion', '==', false)
    );
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

  const handleSubmitAppeal = async (normalizedUsername) => {
    await submitAppeal({ username: normalizedUsername, message: appealMessage });
    setAppealStatus({ type: 'success', text: `Appeal for "${appealUsername}" submitted successfully!` });
    setAppealUsername('');
    setAppealMessage('');
  };

  const handleAppealSubmit = async () => {
    // Step 1: Validate form fields
    setCurrentStep('Validating...');
    if (!validateFormFields()) {
      return;
    }

    const normalizedUsername = appealUsername.trim().replace(/\s+/g, '').toLowerCase();
    
    // Step 2: Check if user is in cheaters DB
    setCurrentStep('Checking database...');
    if (!(await checkUserInCheatersDB(normalizedUsername))) {
      return;
    }
    
    // Step 3: Check if an appeal already exists
    setCurrentStep('Checking appeals...');
    if (!(await checkExistingAppeal(normalizedUsername))) {
      return;
    }
    
    // Step 4: Verify user identity
    setCurrentStep('Verifying account...');
    const isValid = await verificationRef.current.verifyUser(normalizedUsername);
    if (!isValid) {
      setAppealStatus({ type: 'error', text: `We cannot verify your Codeforces account. Please submit a compilation error to the link above.` });
      return;
    }
    
    // Step 5: Submit the appeal
    setCurrentStep('Submitting...');
    await handleSubmitAppeal(normalizedUsername);
    setCurrentStep('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAppealStatus(null); // Clear any previous messages
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
          <b>Before you appeal, you must verify your identity by submitting a <u>compilation error</u> to the problem below.</b>
        </Text>
        <CFVerifier ref={verificationRef} />
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
              <CfHandleSearch
                id="appeal-username"
                placeholder="Enter username (case-insensitive)"
                value={appealUsername}
                onChange={setAppealUsername}
                required
                mt={1}
                borderColor="gray.300"
                _dark={{ borderColor: "gray.400" }}
              />
            </Box>
            <Box>
              <label htmlFor="appeal-message" style={{ color: 'inherit' }}>Appeal Message</label>
              <MarkdownEditor
                value={appealMessage}
                onChange={setAppealMessage}
                placeholder="Enter appeal message with formatting options above"
                rows={4}
              />
            </Box>
            <Button colorPalette="blue" type="submit" w="full" size="lg" loading={appealDisabled} loadingText={currentStep || "Submitting appeal..."}>
              Submit Appeal
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Appeal; 