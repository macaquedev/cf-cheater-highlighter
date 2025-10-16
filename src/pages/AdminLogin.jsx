import React, { useState } from 'react';
import {
  Box, Button, Heading, VStack, Input, Text, Flex
} from '@chakra-ui/react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const AdminLogin = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // Redirect to admin reports page if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/admin/reports', { replace: true });
    }
  }, [user, navigate]);

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

  // Clear error messages when user successfully logs in
  React.useEffect(() => {
    if (user && message && message.type === 'error') {
      setMessage(null);
    }
  }, [user, message]);

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} py={8} px={4}>
      <Flex align="center" justify="center" minH="70vh">
        <Box bg="white" _dark={{ bg: "gray.800" }} p={8} rounded="md" shadow="md" maxW="lg" w="100%">
          <Heading size="lg" mb={6} color="blue.600" _dark={{ color: "blue.400" }} textAlign="center">
            Admin Login
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
                  borderColor="gray.300"
                  _dark={{ borderColor: "gray.400" }}
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
                  borderColor="gray.300"
                  _dark={{ borderColor: "gray.400" }}
                />
              </Box>
              <Button colorPalette="blue" type="submit" loading={authLoading} loadingText="Signing in...">
                Login
              </Button>
            </VStack>
          </form>
        </Box>
      </Flex>
    </Box>
  );
};

export default AdminLogin; 