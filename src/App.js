import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, Flex, Button, Heading, Text, VStack, HStack } from '@chakra-ui/react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ColorModeProvider, ColorModeButton } from './components/ui/color-mode';
import ReportCheaters from './pages/ReportCheaters';
import Search from './pages/Search';
import Admin from './pages/Admin';
import Home from './pages/Home';
import { collection, getDocs, query, where } from 'firebase/firestore';
import Appeal from './pages/Appeal';
import AdminAppeals from './pages/AdminAppeals';

function Navbar({ user, onLogout, pendingCount, pendingAppealsCount }) {
  return (
    <Box bg="white" _dark={{ bg: "gray.800" }} shadow="md" px={6} py={4}>
      <Flex justify="space-between" align="center" maxW="6xl" mx="auto">
        <Heading size="md" color="blue.600" _dark={{ color: "blue.400" }}>CF Cheater Database</Heading>
        <HStack spacing={4}>
          <Button variant="ghost" as="a" href="/">Home</Button>
          <Button variant="ghost" as="a" href="/reportCheaters">Report</Button>
          <Button variant="ghost" as="a" href="/search">Search</Button>
          {!user && (
            <Button variant="ghost" as="a" href="/appeal">Appeal</Button>
          )}
          {user && (
            <>
              <Button variant="ghost" as="a" href="/admin">
                Review reports{typeof pendingCount === 'number' ? ` (${pendingCount})` : ''}
              </Button>
              <Button variant="ghost" as="a" href="/admin/appeals">
                Review appeals{typeof pendingAppealsCount === 'number' ? ` (${pendingAppealsCount})` : ''}
              </Button>
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
  const [pendingCount, setPendingCount] = useState(null);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPendingCount(null);
      setPendingAppealsCount(null);
      return;
    }
    const fetchPending = async () => {
      const q = query(collection(db, 'reports'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      setPendingCount(snapshot.size);
    };
    const fetchPendingAppeals = async () => {
      const q = query(collection(db, 'appeals'), where('status', '!=', 'declined'));
      const snapshot = await getDocs(q);
      setPendingAppealsCount(snapshot.size);
    };
    fetchPending();
    fetchPendingAppeals();
  }, [user]);

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
          <Navbar user={user} onLogout={handleLogout} pendingCount={pendingCount} pendingAppealsCount={pendingAppealsCount} />
          <Box as="main" py={8}>
            <Routes>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/reportCheaters" element={<ReportCheaters user={user} />} />
              <Route path="/search" element={<Search user={user} />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/appeals" element={<AdminAppeals user={user} />} />
              <Route path="/appeal" element={<Appeal />} />
            </Routes>
          </Box>
        </Router>
      </Box>
    </ColorModeProvider>
  );
}

export default App;
