import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Text, Button } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react';
import { FiRefreshCw } from 'react-icons/fi';

const range = [100, 1000];

const CfVerifier = forwardRef((props, ref) => {
  const [contest, setContest] = useState(null);
  const [problem, setProblem] = useState('A');
  const [loading, setLoading] = useState(false);

  const generateRandomProblem = useCallback(async () => {
    const contestId = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    const problemId = 'A';
    
    if (contest && contest === contestId) {
      await generateRandomProblem();
      return;
    }
    
    setContest(contestId);
    setProblem(problemId);
  }, [contest]);

  const handleReroll = async () => {
    setLoading(true);
    try {
      await generateRandomProblem();
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async (username) => {
    if (!contest) return false;
    
    const submissionsResponse = await fetch(`https://codeforces.com/api/user.status?handle=${username}&count=10`);
    const submissionsData = await submissionsResponse.json();
    
    if (submissionsData.status !== 'OK') {
      return false;
    }

    const hasCompilationError = submissionsData.result.some(submission => 
      submission.problem.contestId === contest &&
      submission.problem.index === problem &&
      submission.verdict === 'COMPILATION_ERROR'
    );

    return hasCompilationError;
  };

  useImperativeHandle(ref, () => ({
    verifyUser
  }));

  useEffect(() => {
    if (contest === null) {
      generateRandomProblem();
    }
  }, [contest, generateRandomProblem]);

  if (!contest) {
    return <Text>Loading verification problem...</Text>;
  }

  return (
    <Box mb={4}>
      <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.200' }} mb={2}>
        Current verification problem: <a href={`https://codeforces.com/contest/${contest}/problem/${problem}`} style={{color: "#3182ce", textDecoration: "underline", fontWeight: "500"}} target="_blank" rel="noopener noreferrer">{contest}{problem}</a>
      </Text>
      <Button 
        size="sm" 
        colorPalette="gray" 
        variant="outline"
        onClick={handleReroll}
        loading={loading}
        loadingText="Rerolling..."
        borderWidth={2}
        borderColor="gray.400"
        _dark={{ borderColor: "gray.500" }}
      >
        <Icon as={FiRefreshCw} />
        Reroll Problem
      </Button>
    </Box>
  );
});

CfVerifier.displayName = 'CfVerifier';

export default CfVerifier; 