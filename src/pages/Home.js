import React from 'react';
import { Box, VStack, Heading, Text, Button, Container, SimpleGrid, Icon, Flex } from '@chakra-ui/react';
import { FaSearch, FaFlag, FaShieldAlt } from 'react-icons/fa';

function Home({ user }) {
  return (
    <Container maxW="4xl" py={8}>
      <VStack spacing={12} textAlign="center">
        {/* Hero Section */}
        <VStack spacing={6} mb={4}>
          <Heading size="2xl" color="blue.600" _dark={{ color: "blue.400" }} fontWeight="bold">
            CF Cheater Database
          </Heading>
          <Text fontSize="xl" color="gray.600" _dark={{ color: "gray.300" }} maxW="2xl">
            Help maintain the integrity of competitive programming by reporting and tracking Codeforces cheaters who used AI/GPT <b>after 14/09/2024</b> (the AI rule change date).
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
              <Button colorScheme="red" size="lg" as="a" href="/reportCheaters" w="full">
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
              <Button colorScheme="blue" size="lg" as="a" href="/search" w="full">
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
              <Button colorScheme="green" size="lg" as="a" href="/admin" w="full">
                Access Admin Panel
              </Button>
            </Box>
          </Box>
        )}

        {/* Chrome Extension Notice */}
        <Box w="full" maxW="2xl" mx="auto" mt={12} bg="blue.50" _dark={{ bg: "blue.900" }} borderRadius="md" px={4} py={3} border="1px solid" borderColor="blue.200" _dark={{ borderColor: "blue.700" }}>
          <Text fontSize="md" color="blue.800" _dark={{ color: "blue.200" }}>
            We also provide a <b>Chrome extension</b> for highlighting cheaters directly on Codeforces. <br />
            <a href="https://github.com/macaquedev/cf-cheater-highlighter" target="_blank" rel="noopener noreferrer" style={{ color: '#2b6cb0', textDecoration: 'underline' }}>
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