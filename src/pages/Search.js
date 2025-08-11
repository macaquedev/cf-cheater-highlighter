import React, { useState } from 'react';
import { Box, Button, Input, Heading, VStack, Text, Skeleton } from '@chakra-ui/react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { findCheaterByUsername, validateCodeforcesUsername } from '../utils/cheaterUtils';

const Search = () => {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Auto-dismiss message after 15 seconds
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

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

      // First validate if the username exists on Codeforces
      const validation = await validateCodeforcesUsername(username);
      if (!validation.exists) {
        setResult({ status: 'user_not_found', error: validation.error });
        setLoading(false);
        return;
      }

      // Username exists, now search for cheater status
      const cheater = await findCheaterByUsername({ username: validation.normalizedUsername });
      if (cheater) {
        setResult({ 
          status: 'cheater', 
          reportedAt: cheater.reportedAt,
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
                borderColor="gray.300"
                _dark={{ borderColor: "gray.400" }}
              />
            </Box>
            <Button colorPalette="blue" type="submit" loading={loading} w="full" size="lg">
              Search
            </Button>
          </VStack>
        </form>
        
        {/* Search result with skeleton loading */}
        {loading ? (
          <Skeleton 
            mt={8}
            height="140px" 
            borderRadius="md"
            borderWidth={2}
            borderColor="gray.300"
            bg="gray.200"
            _dark={{ 
              borderColor: "gray.600",
              bg: "gray.600"
            }}
          />
        ) : result && (
          <Box 
            mt={8}
            borderWidth={2}
            borderColor={
              result.status === 'cheater' ? 'red.400' : 
              result.status === 'user_not_found' ? 'orange.400' : 
              'green.400'
            }
            borderRadius="md"
            p={6}
            bg="white"
            _dark={{ 
              borderColor: 
                result.status === 'cheater' ? 'red.500' : 
                result.status === 'user_not_found' ? 'orange.500' : 
                'green.500',
              bg: "gray.700" 
            }}
          >
            {result.status === 'cheater' ? (
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="bold" color="red.500" _dark={{ color: "red.400" }} fontSize="xl" textAlign="center">
                  Cheater
                </Text>
                <Text color="gray.600" _dark={{ color: "gray.300" }} textAlign="center" fontSize="sm">
                  This user has been marked as a cheater. Evidence is only visible to administrators.
                </Text>
                {result.reportedAt && (
                  <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }} mt={2} textAlign="center">
                    Reported on: {result.reportedAt.toDate ? result.reportedAt.toDate().toLocaleDateString() : 'Unknown date'}
                  </Text>
                )}
              </VStack>
            ) : result.status === 'user_not_found' ? (
              <VStack align="stretch" spacing={4}>
                <Text fontWeight="bold" color="orange.500" _dark={{ color: "orange.400" }} fontSize="xl" textAlign="center">
                  User Does Not Exist
                </Text>
                <Text color="gray.600" _dark={{ color: "gray.300" }} textAlign="center" fontSize="sm">
                  {result.error}
                </Text>
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