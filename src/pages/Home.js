import React from 'react';
import { Box, VStack, Heading, Text, Button, Container, SimpleGrid, Icon, Flex } from '@chakra-ui/react';
import { Link } from 'react-router-dom';
import { FaSearch, FaFlag, FaShieldAlt } from 'react-icons/fa';
import { useAuth } from '../App';

function Home() {
  const { user } = useAuth();
  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={12} textAlign="center">
        {/* Hero Section */}
        <VStack spacing={6} mb={4}>
          <Heading size="2xl" color="blue.600" _dark={{ color: "blue.400" }} fontWeight="bold">
            CF Cheater Database
          </Heading>
          <Text fontSize="xl" color="gray.600" _dark={{ color: "gray.300" }} maxW="2xl">
            Help maintain the integrity of competitive programming by reporting and tracking Codeforces cheaters.
          </Text>
        </VStack>

        {/* Quick Actions */}
        <Box w="full" mt={2}>
          <Flex gap={4} justify="center" wrap="wrap" maxW="2xl" mx="auto">
            <Box
              bg="white"
              _dark={{ bg: "gray.800" }}
              p={8}
              borderRadius="lg"
              shadow="md"
              textAlign="center"
              transition="all 0.2s"
              _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
              flex="1"
              minW="280px"
              maxW="320px"
            >
              <Icon as={FaFlag} boxSize={8} color="red.500" mb={4} />
              <Heading size="md" mb={3} color="gray.800" _dark={{ color: "gray.100" }}>
                Report a Cheater
              </Heading>
              <Text color="gray.600" _dark={{ color: "gray.300" }} mb={6}>
                Submit evidence of suspicious behavior or cheating on Codeforces
              </Text>
              <Button colorPalette="red" size="lg" as={Link} to="/reportCheaters" w="full">
                Report Now
              </Button>
            </Box>

            <Box
              bg="white"
              _dark={{ bg: "gray.800" }}
              p={8}
              borderRadius="lg"
              shadow="md"
              textAlign="center"
              transition="all 0.2s"
              _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
              flex="1"
              minW="280px"
              maxW="320px"
            >
              <Icon as={FaSearch} boxSize={8} color="blue.500" mb={4} />
              <Heading size="md" mb={3} color="gray.800" _dark={{ color: "gray.100" }}>
                Search Database
              </Heading>
              <Text color="gray.600" _dark={{ color: "gray.300" }} mb={6}>
                Look up users to see if they have been reported for cheating
              </Text>
              <Button colorPalette="blue" size="lg" as={Link} to="/search" w="full">
                Search
              </Button>
            </Box>
          </Flex>
        </Box>

        {/* Admin Section - Only visible to admins */}
        {user && (
          <Box w="full">
            <Box
              bg="white"
              _dark={{ bg: "gray.800" }}
              p={8}
              borderRadius="lg"
              shadow="md"
              textAlign="center"
              maxW="md"
              mx="auto"
            >
              <Icon as={FaShieldAlt} boxSize={8} color="green.500" mb={4} />
              <Heading size="md" mb={3} color="gray.800" _dark={{ color: "gray.100" }}>
                Admin Panel
              </Heading>
              <Text color="gray.600" _dark={{ color: "gray.300" }} mb={6}>
                Review and manage reported cheaters
              </Text>
              <Button colorPalette="green" size="lg" as={Link} to="/admin/reports" w="full">
                Access Admin Panel
              </Button>
            </Box>
          </Box>
        )}

        {/* Appeal Section - Only visible to non-admins */}
        {!user && (
          <Box w="full">
            <Box
              bg="white"
              _dark={{ bg: "gray.800" }}
              p={8}
              borderRadius="lg"
              shadow="md"
              textAlign="center"
              maxW="md"
              mx="auto"
            >
              <Icon as={FaShieldAlt} boxSize={8} color="orange.500" mb={4} />
              <Heading size="md" mb={3} color="gray.800" _dark={{ color: "gray.100" }}>
                Appeal a Cheater Mark
              </Heading>
              <Text color="gray.600" _dark={{ color: "gray.300" }} mb={6}>
                If you believe you were wrongly marked as a cheater, you can submit an appeal for review by the administrators.
              </Text>
              <Button colorPalette="orange" size="lg" as={Link} to="/appeal" w="full">
                Appeal
              </Button>
            </Box>
          </Box>
        )}

        {/* Chrome Extension Notice */}
        <Box
          w="full"
          maxW="2xl"
          mx="auto"
          mt={12}
          bg="blue.100"
          borderRadius="md"
          px={4}
          py={3}
          border="1px solid"
          borderColor="blue.300"
          _dark={{ 
            bg: "blue.800",
            borderColor: "blue.600" 
          }}
        >
          <Text fontSize="md" color="blue.900" _dark={{ color: "blue.100" }}>
            We also provide a <b>Chrome extension</b> for highlighting cheaters directly on Codeforces. <br />
            <a
              href="https://github.com/macaquedev/cf-cheater-highlighter"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#1a73e8', // brighter link color
                textDecoration: 'underline',
                fontWeight: '500',
              }}
            >
              Get it here on GitHub
            </a>.
          </Text>
        </Box>

        {/* Footer Info */}
        <Box textAlign="center" color="gray.500" _dark={{ color: "gray.400" }} fontSize="sm" mt={8}>
          <Text>
            This database helps maintain fair competition on Codeforces by tracking verified cases of cheating.
          </Text>
          <Text mt={2}>
            All reports are reviewed by administrators before being added to the database.
          </Text>
        </Box>
      </VStack>
    </Container>
  );
}

export default Home; 