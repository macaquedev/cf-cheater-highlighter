import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Box, Flex, Button, Heading, Text, HStack } from '@chakra-ui/react';
import { auth } from './firebase';
import { ColorModeButton } from './components/ui/color-mode';
import ReportCheaters from './pages/ReportCheaters';
import Search from './pages/Search';
import AdminReports from './pages/AdminReports';
import AdminLogin from './pages/AdminLogin';
import Home from './pages/Home';
import { useAuthState } from 'react-firebase-hooks/auth';
import Appeal from './pages/Appeal';
import AdminAppeals from './pages/AdminAppeals';
import AdminSearch from './pages/AdminSearch';
import { fetchPendingReportsCount, fetchPendingAppealsCount } from './utils/cheaterUtils';

// Create Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
  const [user, loading, error] = useAuthState(auth);
  const [pendingCount, setPendingCount] = useState(null);
  const [pendingAppealsCount, setPendingAppealsCount] = useState(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch counts when user changes
  const fetchCounts = async () => {
    try {
      const [reportsCount, appealsCount] = await Promise.all([
        fetchPendingReportsCount(),
        fetchPendingAppealsCount()
      ]);
      setPendingCount(reportsCount);
      setPendingAppealsCount(appealsCount);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCounts();
    } else {
      setPendingCount(null);
      setPendingAppealsCount(null);
    }
  }, [user]);

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }} display="flex" alignItems="center" justifyContent="center">
        <Text>Loading...</Text>
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
        <Router>
          <Navbar 
            user={user} 
            onLogout={handleLogout} 
            pendingCount={pendingCount} 
            pendingAppealsCount={pendingAppealsCount} 
          />
          <Box as="main" py={8}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/reportCheaters" element={<ReportCheaters />} />
              <Route path="/search" element={<Search />} />
              <Route path="/admin/search" element={<AdminSearch />} />
              {/* Admin login page */}
              <Route path="/admin" element={<AdminLogin />} />
              {/* Review reports page (protected) */}
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/appeals" element={<AdminAppeals />} />
              <Route path="/appeal" element={<Appeal />} />
            </Routes>
          </Box>
        </Router>
      </Box>
    </AuthContext.Provider>
  );
}

export default App;
