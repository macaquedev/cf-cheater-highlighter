import React, { useState, useEffect, useRef } from 'react';
import { Box, Textarea, HStack, IconButton, Input, Button, Text } from '@chakra-ui/react';
import { LuBold, LuItalic, LuCode, LuLink, LuLink2, LuEye, LuPencil, LuFileCode } from 'react-icons/lu';
import MarkdownRenderer from './MarkdownRenderer';
import './RichTextEditor.css';

// Styled wrapper for ReactMarkdown
const StyledMarkdown = ({ children }) => (
  <MarkdownRenderer>{children}</MarkdownRenderer>
);

const RichTextEditor = ({ value, onChange, placeholder = "Enter text...", rows = 4 }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Rich text editor functions
  const formatText = (format) => {
    const textarea = document.getElementById('rich-text-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    let formattedText = '';
    let newCursorPos = start;
    
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = start + 1;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        newCursorPos = start + 1;
        break;
      case 'codeblock':
        formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
        newCursorPos = start + 4;
        break;
      default:
        return;
    }
    
    const newValue = value.substring(0, start) + formattedText + value.substring(end);
    onChange(newValue);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    
    const textarea = document.getElementById('rich-text-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const linkText = selectedText || 'link';
    const formattedLink = `[${linkText}](${linkUrl})`;
    
    const newValue = value.substring(0, start) + formattedLink + value.substring(end);
    onChange(newValue);
    
    setLinkUrl('');
    setShowLinkInput(false);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedLink.length, start + formattedLink.length);
    }, 0);
  };

  const handleSelect = () => {
    const textarea = document.getElementById('rich-text-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
  };

  return (
    <Box>
      {/* Mode Toggle and Formatting Toolbar */}
      <HStack spacing={1} mb={2} p={2} bg="gray.50" borderRadius="md" _dark={{ bg: "gray.700" }} justify="space-between">
        <HStack spacing={1}>
          {!isPreviewMode && (
            <>
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => formatText('bold')}
                aria-label="Bold"
              >
                <LuBold />
              </IconButton>
              
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => formatText('italic')}
                aria-label="Italic"
              >
                <LuItalic />
              </IconButton>
              
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => formatText('code')}
                aria-label="Code"
              >
                <LuCode />
              </IconButton>
              
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => formatText('codeblock')}
                aria-label="Code Block"
              >
                <LuFileCode />
              </IconButton>
              
              <IconButton
                size="sm"
                variant="ghost"
                onClick={() => setShowLinkInput(!showLinkInput)}
                aria-label="Add Link"
              >
                <LuLink2 />
              </IconButton>
            </>
          )}
        </HStack>
        
        <IconButton
          size="sm"
          variant="ghost"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          aria-label={isPreviewMode ? "Edit Mode" : "Preview Mode"}
          colorPalette={isPreviewMode ? "blue" : "gray"}
        >
          {isPreviewMode ? <LuPencil /> : <LuEye />}
        </IconButton>
      </HStack>

      {/* Link Input Panel */}
      {showLinkInput && !isPreviewMode && (
        <Box mb={2} p={3} bg="blue.50" borderRadius="md" _dark={{ bg: "blue.900" }}>
          <HStack spacing={2}>
            <Input
              placeholder="Enter URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              size="sm"
              onKeyPress={(e) => e.key === 'Enter' && addLink()}
              borderColor="gray.300"
              _dark={{ borderColor: "gray.400" }}
            />
            <Button size="sm" onClick={addLink} colorPalette="blue">
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowLinkInput(false)}>
              Cancel
            </Button>
          </HStack>
        </Box>
      )}

      {/* Text Editor or Preview */}
      {isPreviewMode ? (
        <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          borderColor="gray.200"
          bg="white"
          minH={`${rows * 1.5}em`}
          _dark={{ 
            bg: "gray.800", 
            borderColor: "gray.600" 
          }}
        >
          <StyledMarkdown>{value}</StyledMarkdown>
        </Box>
      ) : (
        <Textarea
          id="rich-text-editor"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={handleSelect}
          placeholder={placeholder}
          rows={rows}
          resize="vertical"
          fontFamily="mono"
          fontSize="sm"
        />
      )}
    </Box>
  );
};

export default RichTextEditor; 