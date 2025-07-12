import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Box, Flex, Button, Heading, Text, HStack } from '@chakra-ui/react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ColorModeButton } from './components/ui/color-mode';
import ReportCheaters from './pages/ReportCheaters';
import Search from './pages/Search';
import AdminReports from './pages/AdminReports';
import AdminLogin from './pages/AdminLogin';
import Home from './pages/Home';
import { collection, query, where } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import Appeal from './pages/Appeal';
import AdminAppeals from './pages/AdminAppeals';
import AdminSearch from './pages/AdminSearch';

function Navbar({ user, onLogout, pendingCount, pendingAppealsCount }) {
  return (
    <Box bg="white" _dark={{ bg: "gray.800" }} shadow="md" px={6} py={4}>
      <Flex justify="space-between" align="center" maxW="6xl" mx="auto">
        <Heading size="md" color="blue.600" _dark={{ color: "blue.400" }}>CF Cheater Database</Heading>
        <HStack spacing={4}>
          <Button variant="ghost" as={Link} to="/">Home</Button>
          <Button variant="ghost" as={Link} to="/reportCheaters">Report</Button>
          {user ? (
            <Button variant="ghost" as={Link} to="/admin/search">Search</Button>
          ) : (
            <Button variant="ghost" as={Link} to="/search">Search</Button>
          )}
          {user && (
            <>
              <Button variant="ghost" as={Link} to="/admin/reports">
                Review reports{typeof pendingCount === 'number' ? ` (${pendingCount})` : ''}
              </Button>
              <Button variant="ghost" as={Link} to="/admin/appeals">
                Review appeals{typeof pendingAppealsCount === 'number' ? ` (${pendingAppealsCount})` : ''}
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>Logout</Button>
            </>
          )}
          {!user && (
            <Button variant="ghost" as={Link} to="/appeal">Appeal</Button>
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

  // Real-time queries for pending reports and appeals
  const pendingReportsQuery = user ? query(collection(db, 'reports'), where('status', '==', 'pending')) : null;
  const pendingAppealsQuery = user ? query(collection(db, 'appeals'), where('status', '!=', 'declined')) : null;

  // Use react-firebase-hooks for real-time updates - useCollection is more efficient for counts
  const [pendingReportsSnapshot, pendingReportsLoading, pendingReportsError] = useCollection(pendingReportsQuery);

  const [pendingAppealsSnapshot, pendingAppealsLoading, pendingAppealsError] = useCollection(pendingAppealsQuery);

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

  // Handle any errors from the hooks
  if (pendingReportsError) {
    console.error('Error fetching pending reports:', pendingReportsError);
  }
  if (pendingAppealsError) {
    console.error('Error fetching pending appeals:', pendingAppealsError);
  }

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
      <Router>
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          pendingCount={pendingReportsSnapshot?.size || 0} 
          pendingAppealsCount={pendingAppealsSnapshot?.size || 0} 
        />
        <Box as="main" py={8}>
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route path="/reportCheaters" element={<ReportCheaters user={user} />} />
            <Route path="/search" element={<Search />} />
            <Route path="/admin/search" element={<AdminSearch user={user} />} />
            {/* Admin login page */}
            <Route path="/admin" element={<AdminLogin />} />
            {/* Review reports page (protected) */}
            <Route path="/admin/reports" element={
              <AdminReports 
                user={user}
                pendingReportsSnapshot={pendingReportsSnapshot}
                pendingReportsLoading={pendingReportsLoading}
                pendingReportsError={pendingReportsError}
              />
            } />
            <Route path="/admin/appeals" element={
              <AdminAppeals 
                user={user}
                pendingAppealsSnapshot={pendingAppealsSnapshot}
                pendingAppealsLoading={pendingAppealsLoading}
                pendingAppealsError={pendingAppealsError}
              />
            } />
            <Route path="/appeal" element={<Appeal />} />
          </Routes>
        </Box>
      </Router>
    </Box>
  );
}

export default App;
