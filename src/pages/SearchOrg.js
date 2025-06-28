import React, { useState, useEffect } from 'react';
import { Box, Button, Input, Heading, VStack, Text, HStack, Table, Dialog, Portal, Container } from '@chakra-ui/react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { renderMarkdown } from '../utils/markdownRenderer';

const SearchOrg = ({ user }) => {
  const [orgName, setOrgName] = useState('');
  const [searchedOrgName, setSearchedOrgName] = useState(''); // Store the actual searched org name
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [searched, setSearched] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Evidence modal states
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState('');

  // Auto-dismiss message after 15 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 15000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Fetch all cheater handles from database
  const fetchAllCheaterHandles = async () => {
    try {
      const cheatersRef = collection(db, 'cheaters');
      const querySnapshot = await getDocs(cheatersRef);
      
      const cheaterData = [];
      const seenUsernames = new Set();
      
      querySnapshot.forEach((doc) => {
        const cheater = doc.data();
        // Only add if we haven't seen this username before (deduplication)
        if (!seenUsernames.has(cheater.username)) {
          seenUsernames.add(cheater.username);
          cheaterData.push({
            id: doc.id,
            username: cheater.username,
            evidence: cheater.evidence,
            reportedAt: cheater.reportedAt
          });
        }
      });
      
      return cheaterData;
    } catch (error) {
      throw new Error('Failed to fetch cheaters from database: ' + error.message);
    }
  };

  // Add sleep function for rate limiting
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Fetch user info from Codeforces API
  const fetchCodeforceUserInfo = async (handles, cheaterData, orgName) => {
    if (handles.length === 0) return [];
    
    // Split handles into much smaller chunks to avoid URL length limits
    const chunks = [];
    for (let i = 0; i < handles.length; i += 50) {
      chunks.push(handles.slice(i, i + 50));
    }
    
    const allFoundCheaters = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        // Update progress (simplified - just show percentage)
        const progressPercent = Math.round(((i + 1) / chunks.length) * 100);
        setProgress(progressPercent);
        
        // Add 5 second delay between API calls (except for the first one)
        if (i > 0) {
          await sleep(5000);
        }
        
        const handlesParam = chunk.join(';');
        
        // Check if URL would be too long
        const testUrl = `https://codeforces.com/api/user.info?handles=${handlesParam}`;
        if (testUrl.length > 2000) {
          console.warn(`URL too long for chunk ${i + 1}: ${testUrl.length} characters`);
          continue;
        }
        
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (data.status === 'OK') {
          // Filter this batch by organization and add to results immediately
          const matchingUsers = data.result.filter(user => 
            user.organization && user.organization === orgName.trim()
          );
          
          // Convert to cheater format and add to results
          const batchCheaters = matchingUsers.map(user => {
            const cheaterInfo = cheaterData.find(cheater => 
              cheater.username.toLowerCase() === user.handle.toLowerCase()
            );
            return {
              id: cheaterInfo?.id,
              username: user.handle,
              organization: user.organization,
              rating: user.rating || 'Unrated',
              maxRating: user.maxRating || 'N/A',
              rank: user.rank || 'unrated',
              maxRank: user.maxRank || 'unrated',
              country: user.country || 'N/A',
              evidence: user && cheaterInfo ? cheaterInfo.evidence : null,
              reportedAt: cheaterInfo?.reportedAt
            };
          });
          
          // Add to total results
          allFoundCheaters.push(...batchCheaters);
          
          // Update results immediately if we found any cheaters in this batch
          if (batchCheaters.length > 0) {
            // Sort all results so far by username
            const sortedResults = [...allFoundCheaters].sort((a, b) => a.username.localeCompare(b.username));
            setResults(sortedResults);
            setSearched(true);
          }
        } else {
          console.warn(`Codeforces API error for chunk: ${data.comment || 'Unknown error'}`);
        }
      } catch (error) {
        console.warn(`Failed to fetch chunk: ${error.message}`);
      }
    }
    
    return allFoundCheaters;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setSearched(false);
    setProgress(0);
    setProgressMessage('');
    setCurrentPage(1); // Reset to first page on new search
    
    // Store the organization name that was actually searched
    const searchTerm = orgName.trim();
    setSearchedOrgName(searchTerm);
    
    try {
      if (!searchTerm) {
        showMessage('Organization name is required.', 'error');
        setLoading(false);
        return;
      }
      
      setProgressMessage('Fetching cheater handles from database...');
      
      // Step 1: Get all cheater handles from database
      const cheaterData = await fetchAllCheaterHandles();
      const handles = cheaterData.map(cheater => cheater.username);
      
      if (handles.length === 0) {
        showMessage('No cheaters found in database.', 'info');
        setLoading(false);
        setProgress(0);
        setProgressMessage('');
        return;
      }
      
      // Step 2: Get user info from Codeforces API and display results in real-time
      const finalResults = await fetchCodeforceUserInfo(handles, cheaterData, searchTerm);
      
      // Final message based on results
      if (finalResults.length === 0) {
        showMessage(`No cheaters found in organization "${searchTerm}".`, 'info');
        setSearched(true);
      } else {
        showMessage(`Search completed! Found ${finalResults.length} cheater(s) in organization "${searchTerm}".`, 'success');
      }
    } catch (err) {
      showMessage('Error searching: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setProgress(0);
      setProgressMessage('');
    }
  };

  const handleSeeEvidence = (evidence) => {
    setSelectedEvidence(evidence);
    setEvidenceModalOpen(true);
  };

  return (
    <Container maxW="6xl" py={8}>
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
        
        <Heading size="lg" mb={6} color="purple.600" _dark={{ color: "purple.400" }} textAlign="center">
          Search Cheaters by Organisation
        </Heading>
        
        <Text color="gray.600" _dark={{ color: "gray.300" }} textAlign="center" mb={8} fontSize="md">
          Find all reported cheaters from a specific organization using live Codeforces data
        </Text>
        
        <form onSubmit={handleSearch}>
          <VStack gap={5} align="stretch">
            <Box>
              <label htmlFor="orgName" style={{ color: 'inherit', fontWeight: '500' }}>
                Organisation Name (exact match)
              </label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Enter exact organization name (e.g., IIIT Hyderabad)"
                autoFocus
                mt={2}
                size="lg"
              />
              <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }} mt={1}>
                Note: Organization name must match exactly as shown on Codeforces profiles
              </Text>
            </Box>
            <Button colorScheme="purple" type="submit" isLoading={loading} w="full" size="lg">
              Search Organisation
            </Button>
          </VStack>
        </form>
        
        {searched && results.length > 0 && (
          <Box mt={8}>
            <Heading size="md" mb={4} color="gray.700" _dark={{ color: "gray.200" }}>
              Cheaters found in "{searchedOrgName}" ({results.length} user{results.length !== 1 ? 's' : ''})
            </Heading>
            
            {/* Calculate pagination */}
            {(() => {
              const totalPages = Math.ceil(results.length / usersPerPage);
              const startIndex = (currentPage - 1) * usersPerPage;
              const endIndex = startIndex + usersPerPage;
              const currentUsers = results.slice(startIndex, endIndex);
              
              return (
                <>
                  <Box overflowX="auto">
                    <Table.Root variant="simple">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeader>Handle</Table.ColumnHeader>
                          <Table.ColumnHeader>Current Rating</Table.ColumnHeader>
                          <Table.ColumnHeader>Max Rating</Table.ColumnHeader>
                          <Table.ColumnHeader>Current Rank</Table.ColumnHeader>
                          <Table.ColumnHeader>Max Rank</Table.ColumnHeader>
                          <Table.ColumnHeader>Country</Table.ColumnHeader>
                          {user && <Table.ColumnHeader>Actions</Table.ColumnHeader>}
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {currentUsers.map((cheater, index) => (
                          <Table.Row key={cheater.id || index}>
                            <Table.Cell fontWeight="medium">
                              <a 
                                href={`https://codeforces.com/profile/${cheater.username}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#1a73e8', textDecoration: 'underline' }}
                              >
                                {cheater.username}
                              </a>
                            </Table.Cell>
                            <Table.Cell>
                              <Text color={
                                cheater.rating === 'Unrated' ? 'gray.500' :
                                cheater.rating >= 2400 ? 'red.500' :
                                cheater.rating >= 2100 ? 'orange.500' :
                                cheater.rating >= 1900 ? 'purple.500' :
                                cheater.rating >= 1600 ? 'blue.500' :
                                cheater.rating >= 1400 ? 'cyan.500' :
                                cheater.rating >= 1200 ? 'green.500' :
                                'gray.500'
                              }>
                                {cheater.rating}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text color={
                                cheater.maxRating === 'N/A' ? 'gray.500' :
                                cheater.maxRating >= 2400 ? 'red.500' :
                                cheater.maxRating >= 2100 ? 'orange.500' :
                                cheater.maxRating >= 1900 ? 'purple.500' :
                                cheater.maxRating >= 1600 ? 'blue.500' :
                                cheater.maxRating >= 1400 ? 'cyan.500' :
                                cheater.maxRating >= 1200 ? 'green.500' :
                                'gray.500'
                              }>
                                {cheater.maxRating}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text textTransform="capitalize" fontSize="sm">
                                {cheater.rank}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text textTransform="capitalize" fontSize="sm">
                                {cheater.maxRank}
                              </Text>
                            </Table.Cell>
                            <Table.Cell>
                              <Text fontSize="sm">
                                {cheater.country}
                              </Text>
                            </Table.Cell>
                            {user && (
                              <Table.Cell>
                                <Button 
                                  colorScheme="blue" 
                                  size="sm" 
                                  onClick={() => handleSeeEvidence(cheater.evidence)}
                                  disabled={!cheater.evidence}
                                >
                                  See Evidence
                                </Button>
                              </Table.Cell>
                            )}
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Box>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <Box mt={6} display="flex" justifyContent="center" alignItems="center" gap={4}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      
                      <HStack spacing={1}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            size="sm"
                            variant={currentPage === page ? "solid" : "outline"}
                            colorScheme={currentPage === page ? "purple" : "gray"}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </HStack>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </Box>
                  )}

                  {/* Pagination Info */}
                  <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }} mt={4} textAlign="center">
                    Showing {startIndex + 1}-{Math.min(endIndex, results.length)} of {results.length} cheaters
                  </Text>
                </>
              );
            })()}
            
            {!user && (
              <Box mt={4} p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200" _dark={{ bg: "blue.900", borderColor: "blue.700" }}>
                <Text fontSize="sm" color="blue.800" _dark={{ color: "blue.200" }} textAlign="center">
                  Evidence details are only visible to administrators. Data is fetched live from Codeforces API.
                </Text>
              </Box>
            )}
          </Box>
        )}

        {searched && results.length === 0 && !loading && (
          <Box 
            mt={8} 
            borderWidth={2}
            borderColor="green.400"
            borderRadius="md"
            p={6}
            bg="white"
            _dark={{ 
              borderColor: "green.500",
              bg: "gray.700" 
            }}
          >
            <Text fontWeight="bold" color="green.500" _dark={{ color: "green.400" }} fontSize="xl" textAlign="center">
              No cheaters found in this organisation
            </Text>
            <Text color="gray.600" _dark={{ color: "gray.300" }} textAlign="center" fontSize="sm" mt={2}>
              Either this organization has no reported cheaters, or the organization name doesn't match exactly.
            </Text>
          </Box>
        )}

        {/* Progress indicator during search */}
        {loading && (
          <Box mt={8} p={6} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200" _dark={{ bg: "blue.900", borderColor: "blue.700" }}>
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="medium" color="blue.800" _dark={{ color: "blue.200" }}>
                Please wait...
              </Text>
              
              <Box w="full">
                <Box
                  w="full"
                  h={4}
                  bg="blue.100"
                  borderRadius="full"
                  overflow="hidden"
                  _dark={{ bg: "blue.800" }}
                >
                  <Box
                    h="full"
                    bg="blue.500"
                    borderRadius="full"
                    transition="width 0.3s ease"
                    w={`${progress}%`}
                  />
                </Box>
                
                <HStack justify="space-between" mt={2}>
                  <Text fontSize="sm" color="blue.600" _dark={{ color: "blue.300" }}>
                    {progressMessage}
                  </Text>
                  <Text fontSize="sm" fontWeight="medium" color="blue.800" _dark={{ color: "blue.200" }}>
                    {progress}%
                  </Text>
                </HStack>
              </Box>
            </VStack>
          </Box>
        )}
      </Box>

      {/* Evidence Modal */}
      <Dialog.Root open={evidenceModalOpen} onOpenChange={(e) => setEvidenceModalOpen(e.open)}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Evidence</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Box
                  bg="gray.50"
                  p={4}
                  rounded="md"
                  border="1px"
                  borderColor="gray.200"
                  _dark={{ 
                    bg: "gray.600",
                    borderColor: "gray.500" 
                  }}
                  sx={{
                    '& strong': { fontWeight: 'bold' },
                    '& em': { fontStyle: 'italic' },
                    '& code': { 
                      bg: 'gray.100', 
                      px: 1, 
                      py: 0.5, 
                      borderRadius: 'sm', 
                      fontFamily: 'mono',
                      fontSize: 'sm',
                      _dark: { bg: 'gray.700' }
                    },
                    '& pre': {
                      bg: 'gray.50',
                      p: 3,
                      borderRadius: 'md',
                      border: '1px solid',
                      borderColor: 'gray.200',
                      overflowX: 'auto',
                      my: 2,
                      _dark: { 
                        bg: 'gray.700', 
                        borderColor: 'gray.600' 
                      }
                    },
                    '& pre code': {
                      bg: 'transparent',
                      p: 0,
                      borderRadius: 0,
                      fontSize: 'sm',
                      lineHeight: 1.5
                    },
                    '& a': { 
                      color: 'blue.600', 
                      textDecoration: 'underline',
                      _dark: { color: 'blue.300' }
                    },
                    '& br': { display: 'block', content: '""', marginTop: 2 }
                  }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedEvidence) }}
                />
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setEvidenceModalOpen(false)}>
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Container>
  );
};

export default SearchOrg;