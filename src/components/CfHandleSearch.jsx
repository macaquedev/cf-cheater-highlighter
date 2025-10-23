import { useState, useEffect, useRef } from 'react';
import { Input, Box, List, ListItem, Spinner, Center } from '@chakra-ui/react';
import CfUser from './CfUser';

const CfHandleSearch = ({ value, onChange, maxSuggestions = 8, ...props }) => {
  const [highlightedIndex, setHighlightedIndex] = useState(-1); // for keyboard navigation
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false); // loading state for suggestions
  const fetchFailed = useRef(false); // suppress loader if last fetch failed
  const suggestionsRef = useRef();
  const suggestionRefs = useRef([]); // for scroll-into-view
  const justSelected = useRef(false);
  const clickingSuggestion = useRef(false);

  // Scroll highlighted suggestion into view when changed
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionRefs.current[highlightedIndex]) {
      suggestionRefs.current[highlightedIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    // Reset highlight when suggestions change
    setHighlightedIndex(-1);
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    const controller = new AbortController();
    const fetchSuggestions = async () => {
      if (!value || value.trim().length < 3) {
        setSuggestions([]);
        setLoading(false);
        setShowSuggestions(false);
        fetchFailed.current = false;
        return;
      }
      // Only show loader if last fetch did not error
      if (!fetchFailed.current) {
        setLoading(true);
        setShowSuggestions(true);
      }
      try {
        const corsProxy = 'https://corsproxy.io/?url=';
        const url = corsProxy + 'https://codeforces.com/data/handles?q=' + encodeURIComponent(value.trim());
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(res.status);
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean).slice(0, maxSuggestions);
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
        setLoading(false);
        setShowSuggestions(parsed.length > 0);
        fetchFailed.current = false;
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSuggestions([]);
        setLoading(false);
        setShowSuggestions(false);
        fetchFailed.current = true;
      }
    };
    fetchSuggestions();
    return () => controller.abort();
  }, [value, fetchFailed, maxSuggestions]);

  const handleSuggestionClick = (suggestion) => {
    justSelected.current = true;
    onChange(suggestion.handle);
    setSuggestions([]);
    setShowSuggestions(false);
    if (suggestionsRef.current) {
      suggestionsRef.current.blur();
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev === -1) return 0;
        return (prev + 1) % suggestions.length;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        if (prev === -1) return suggestions.length - 1;
        return (prev - 1 + suggestions.length) % suggestions.length;
      });
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSuggestionClick(suggestions[highlightedIndex]);
      }
    }
  };

  return (
    <Box position="relative">
      <Input
        placeholder="Enter username (case-insensitive)"
        value={value}
        onChange={e => {
          onChange(e.target.value);
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
          if (suggestions.length > 0 || loading) setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        {...props}
      />
      {(showSuggestions && (loading || suggestions.length > 0)) && (
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
          {loading && (
            <Center py={2}>
              <Spinner size="sm" thickness="2px" color="blue.500" />
            </Center>
          )}
          {!loading && suggestions.length > 0 && (
            <List.Root>
              {suggestions.map((s, idx) => (
                <ListItem
                  key={s.handle}
                  ref={el => suggestionRefs.current[idx] = el}
                  px={3}
                  py={1}
                  cursor="pointer"
                  display="flex"
                  alignItems="center"
                  bg={highlightedIndex === idx ? 'gray.100' : undefined}
                  _dark={highlightedIndex === idx ? { bg: 'gray.700' } : {}}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseLeave={() => setHighlightedIndex(-1)}
                  onMouseDown={() => {
                    clickingSuggestion.current = true;
                    handleSuggestionClick(s);
                  }}
                  onMouseUp={() => {
                    setTimeout(() => { clickingSuggestion.current = false; }, 0);
                  }}
                  style={{ minHeight: 0, lineHeight: 1.2 }}
                >
                  <CfUser username={s.handle} info={{ currentRank: s.rank }} fontSize="md" />
                </ListItem>
              ))}
            </List.Root>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CfHandleSearch;
