import { memo, useMemo } from 'react';
import { Link } from '@chakra-ui/react';
import { useColorModeValue, useColorMode } from './ui/color-mode';

// Codeforces color scheme based on rank (exact CSS colors)
const getRankColor = (rank, isDark = false) => {
  if (isDark) {
    if (rank === 'legendary grandmaster') return '#FF5555';
    if (rank === 'international grandmaster') return '#FF5555';
    if (rank === 'grandmaster') return '#FF5555';
    if (rank === 'international master') return '#FF8800';
    if (rank === 'master') return '#FF8800';
    if (rank === 'candidate master') return '#DD55DD';
    if (rank === 'expert') return '#5599FF';
    if (rank === 'specialist') return '#22CCCC';
    if (rank === 'pupil') return '#55DD55';
    if (rank === 'newbie') return '#BBBBBB';
    if (rank === 'unrated' || rank === '') return '#BBBBBB';
    return '#fff';
  } else {
    if (rank === 'legendary grandmaster') return 'red';
    if (rank === 'international grandmaster') return 'red';
    if (rank === 'grandmaster') return 'red';
    if (rank === 'international master') return '#FF8C00';
    if (rank === 'master') return '#FF8C00';
    if (rank === 'candidate master') return '#a0a';
    if (rank === 'expert') return 'blue';
    if (rank === 'specialist') return '#03A89E';
    if (rank === 'pupil') return 'green';
    if (rank === 'newbie') return 'gray';
    if (rank === 'unrated' || rank === '') return 'gray';
    return '#111';
  }
};

const CfUser = memo(({ username, info, ...props }) => {
  // Always use normalized rank for all logic
  const currentRank = (info?.currentRank || 'unrated').toLowerCase();

  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';

  const rankColor = useMemo(() => getRankColor(currentRank, isDark), [currentRank, isDark]);

  // Dark mode support for rating colors
  const textColor = useColorModeValue(rankColor, rankColor);

  // Special styling for legendary grandmasters (first letter different color)
  const isLegendary = currentRank === 'legendary grandmaster';
  const firstLetterColor = isDark ? 'white' : 'black';

  return (
    <Link
      href={`https://codeforces.com/profile/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      color={textColor}
      textDecoration="none"
      fontWeight={currentRank !== 'unrated' ? "bold" : "normal"}
      display="inline-block"
      {...props}
    >
      {isLegendary ? (
        <>
          <span style={{ color: firstLetterColor }}>{username[0]}</span>
          {username.slice(1)}
        </>
      ) : (
        username
      )}
    </Link>
  );
});

export default CfUser;
