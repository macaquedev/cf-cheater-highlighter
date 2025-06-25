import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, Button, Heading, Text, VStack, HStack } from '@chakra-ui/react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ColorModeProvider, ColorModeButton } from './components/ui/color-mode';
import ReportCheaters from './pages/ReportCheaters';
import Search from './pages/Search';
import Admin from './pages/Admin';
import Home from './pages/Home';

function Navbar({ user, onLogout }) {
  return (
    <Box bg="white" _dark={{ bg: "gray.800" }} shadow="md" px={6} py={4}>
      <Flex justify="space-between" align="center" maxW="6xl" mx="auto">
        <Heading size="md" color="blue.600" _dark={{ color: "blue.400" }}>CF Cheater Database</Heading>
        <HStack spacing={4}>
          <Button variant="ghost" as="a" href="/">Home</Button>
          <Button variant="ghost" as="a" href="/reportCheaters">Report</Button>
          <Button variant="ghost" as="a" href="/search">Search</Button>
          {user && (
            <>
              <Button variant="ghost" as="a" href="/admin">Review reports</Button>
              <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </>
          )}
          <ColorModeButton />
        </HStack>
      </Flex>
    </Box>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <ColorModeProvider>
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
        <Router>
          <Navbar user={user} onLogout={handleLogout} />
          <Box as="main" py={8}>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/reportCheaters" element={<ReportCheaters user={user} />} />
              <Route path="/search" element={<Search user={user} />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Box>
        </Router>
      </Box>
    </ColorModeProvider>
  );
}

export default App;
