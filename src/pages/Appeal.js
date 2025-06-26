import { Box, Heading, Text, Input, Button, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const Appeal = () => {
  const [appealUsername, setAppealUsername] = useState('');
  const [appealMessage, setAppealMessage] = useState('');
  const [appealStatus, setAppealStatus] = useState(null);

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealUsername.trim() || !appealMessage.trim()) {
      setAppealStatus({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    const normalizedUsername = appealUsername.trim().replace(/\s+/g, '').toLowerCase();
    // Check if user is in cheaters DB
    const cheatersRef = collection(db, 'cheaters');
    const cheaterQuery = query(cheatersRef, where('username', '==', normalizedUsername));
    const cheaterSnapshot = await getDocs(cheaterQuery);
    if (cheaterSnapshot.empty) {
      setAppealStatus({ type: 'error', text: `User "${appealUsername}" is not in the cheater database. Only users marked as cheaters can appeal.` });
      return;
    }
    // Check if an appeal already exists for this user
    const appealsRef = collection(db, 'appeals');
    const existingAppealQuery = query(appealsRef, where('username', '==', normalizedUsername));
    const existingAppealSnapshot = await getDocs(existingAppealQuery);
    if (!existingAppealSnapshot.empty) {
      const status = existingAppealSnapshot.docs[0].data().status;
      if (status === 'declined' || status === 'pending') {
        setAppealStatus({ type: 'error', text: `You can only appeal once. Your previous appeal was ${status}.` });
      } else {
        setAppealStatus({ type: 'error', text: `An appeal for this user is already pending. Please wait for admin review.` });
      }
      return;
    }
    // Submit the appeal
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

  return (
    <Box maxW="2xl" mx="auto" px={6}>
      <Box bg="white" _dark={{ bg: 'gray.800' }} p={8} rounded="md" shadow="md">
        <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
          Appeal a Cheater Mark
        </Heading>
        <Text mb={4} fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }}>
          If you believe you were wrongly marked as a cheater, you can submit an appeal. Only users currently in the cheater database can appeal. Each user can only appeal once.
        </Text>
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
            <Text>{appealStatus.text}</Text>
          </Box>
        )}
        <form onSubmit={handleAppealSubmit}>
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
              <Input
                id="appeal-message"
                placeholder="Explain why you should be removed from the cheater database"
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                required
                mt={1}
              />
            </Box>
            <Button colorScheme="blue" type="submit" w="full" size="lg">
              Submit Appeal
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
};

export default Appeal; 