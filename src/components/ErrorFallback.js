import React from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }} display="flex" alignItems="center" justifyContent="center">
      <VStack spacing={6} p={8} bg="white" _dark={{ bg: 'gray.800' }} rounded="md" shadow="md" maxW="lg">
        <Heading size="lg" color="red.500" _dark={{ color: 'red.400' }}>
          Something went wrong
        </Heading>
        <Text color="gray.700" _dark={{ color: 'gray.200' }} textAlign="center">
          An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
        </Text>
        {process.env.NODE_ENV === 'development' && error && (
          <Box w="full" p={4} bg="red.50" _dark={{ bg: 'red.900' }} borderRadius="md" overflowX="auto">
            <Text fontSize="sm" color="red.800" _dark={{ color: 'red.200' }}>
              {error.message}
            </Text>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'inherit' }}>{error.stack}</pre>
          </Box>
        )}
        <Button colorScheme="blue" onClick={resetErrorBoundary}>
          Try Again
        </Button>
      </VStack>
    </Box>
  );
}

export default ErrorFallback; 