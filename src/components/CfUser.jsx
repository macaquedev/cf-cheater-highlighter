import { memo, useMemo } from 'react';
import { Link } from '@chakra-ui/react';
import { useColorModeValue, useColorMode } from './ui/color-mode';

// Codeforces color scheme based on rank (exact CSS colors)
const getRankColor = (rank, isDark = false) => {
  if (isDark) {
    // Dark mode colors - saturated but slightly toned down
    if (rank === 'legendary grandmaster') return '#FF5555'; // Slightly less bright red
    if (rank === 'international grandmaster') return '#FF5555'; // Slightly less bright red
    if (rank === 'grandmaster') return '#FF5555'; // Slightly less bright red
    if (rank === 'international master') return '#FF8800'; // Slightly less bright orange
    if (rank === 'master') return '#FF8800'; // Slightly less bright orange
    if (rank === 'candidate master') return '#DD55DD'; // Slightly less bright magenta
    if (rank === 'expert') return '#5599FF'; // Slightly less bright blue
    if (rank === 'specialist') return '#22CCCC'; // Slightly less bright cyan
    if (rank === 'pupil') return '#55DD55'; // Slightly less bright green
    if (rank === 'newbie') return '#BBBBBB'; // Slightly less bright gray
    return '#BBBBBB'; // Default for unrated
  } else {
    // Light mode colors (original Codeforces colors)
    if (rank === 'legendary grandmaster') return 'red'; // user-legendary
    if (rank === 'international grandmaster') return 'red'; // user-red
    if (rank === 'grandmaster') return 'red'; // user-red
    if (rank === 'international master') return '#FF8C00'; // user-orange
    if (rank === 'master') return '#FF8C00'; // user-orange
    if (rank === 'candidate master') return '#a0a'; // user-violet
    if (rank === 'expert') return 'blue'; // user-blue
    if (rank === 'specialist') return '#03A89E'; // user-cyan
    if (rank === 'pupil') return 'green'; // user-green
    if (rank === 'newbie') return 'gray'; // user-gray
    return 'gray'; // Default for unrated
  }
};

const CfUser = memo(({ username, ratingInfo, ...props }) => {
  const currentRank = ratingInfo?.currentRank || 'unrated';

  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const rankColor = useMemo(() => getRankColor(currentRank, isDark), [currentRank, isDark]);
  
  // Dark mode support for rating colors
  const textColor = useColorModeValue(rankColor, rankColor);

  // Special styling for legendary grandmasters (first letter different color)
  const isLegendary = currentRank === 'legendary grandmaster';
  const firstLetterColor = isDark ? 'white' : 'black'; // Light gray in dark mode, black in light mode
  
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
