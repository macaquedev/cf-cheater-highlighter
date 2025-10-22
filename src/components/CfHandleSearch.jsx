import { useState, useEffect, useRef } from 'react';
import { Input, Box, List, ListItem } from '@chakra-ui/react';
import CfUser from './CfUser';

const MAX_SUGGESTIONS = 8;

const CfHandleSearch = ({ value, onChange, ...props }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef();
  const justSelected = useRef(false);
  const clickingSuggestion = useRef(false);

  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (!value || value.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      try {
        const corsProxy = 'https://corsproxy.io/?url=';
        const url = corsProxy + 'https://codeforces.com/data/handles?q=' + encodeURIComponent(value.trim());
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 403) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean).slice(0, MAX_SUGGESTIONS);
        const parsed = lines.map(line => {
          const [handle, , html] = line.split('|');
          let rank = '';
          if (html) {
            const m = html.match(/title="([^"]+)"/i);
            if (m) {
              const title = m[1];
              if (/unrated/i.test(title)) {
                rank = 'unrated';
              } else {
                const handleIndex = title.toLowerCase().lastIndexOf(handle.toLowerCase());
                if (handleIndex > 0) {
                  rank = title.slice(0, handleIndex).trim();
                }
              }
            }
          }
          return { handle, rank };
        });
        setSuggestions(parsed);
        setShowSuggestions(parsed.length > 0);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [value]);

  const handleSuggestionClick = (suggestion) => {
    justSelected.current = true;
    onChange(suggestion.handle);
    setSuggestions([]);
    setShowSuggestions(false);
    if (suggestionsRef.current) {
      suggestionsRef.current.blur();
    }
  };

  return (
    <Box position="relative">
      <Input
        placeholder="Enter username (case-insensitive)"
        value={value}
        onChange={e => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        mt={1}
        borderColor="gray.300"
        _dark={{ borderColor: "gray.400" }}
        autoComplete="off"
        ref={suggestionsRef}
        onBlur={() => {
          setTimeout(() => {
            if (!clickingSuggestion.current) setShowSuggestions(false);
          }, 0);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        {...props}
      />
      {showSuggestions && suggestions.length > 0 && (
        <Box
          position="absolute"
          zIndex={10}
          bg="white"
          _dark={{ bg: "gray.800" }}
          border="1px solid"
          borderColor="gray.200"
          _darkBorderColor="gray.600"
          borderRadius="md"
          mt={1}
          w="full"
          maxH="180px"
          overflowY="auto"
          boxShadow="md"
        >
          <List.Root>
            {suggestions.map(s => (
              <ListItem
                key={s.handle}
                px={3}
                py={2}
                cursor="pointer"
                display="flex"
                alignItems="center"
                _hover={{ bg: "gray.100", _dark: { bg: "gray.700" } }}
                onMouseDown={() => {
                  clickingSuggestion.current = true;
                  handleSuggestionClick(s);
                }}
                onMouseUp={() => {
                  setTimeout(() => { clickingSuggestion.current = false; }, 0);
                }}
              >
                <CfUser username={s.handle} info={{ currentRank: s.rank }} fontSize="md" />
              </ListItem>
            ))}
          </List.Root>
        </Box>
      )}
    </Box>
  );
};

export default CfHandleSearch;
