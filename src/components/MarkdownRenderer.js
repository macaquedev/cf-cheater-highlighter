import React from 'react';
import { Box } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useColorMode } from './ui/color-mode';
import './RichTextEditor.css';

const MarkdownRenderer = ({ children, className = "" }) => {
  const { colorMode } = useColorMode();
  
  return (
    <Box className={`markdown-content ${className}`}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const {children, className, node, ...rest} = props
            const match = /language-(\w+)/.exec(className || '')
            return match ? (
              <Box
                borderRadius="md"
                border="1px solid"
                borderColor={colorMode === 'dark' ? '#718096' : '#e2e8f0'}
                overflow="hidden"
                my={2}
              >
                <SyntaxHighlighter
                  {...rest}
                  PreTag="div"
                  children={String(children).replace(/\n$/, '')}
                  language={match[1]}
                  style={colorMode === 'dark' ? tomorrow : undefined}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    lineHeight: 1.5
                  }}
                />
              </Box>
            ) : (
              <code {...rest} className={className}>
                {children}
              </code>
            )
          }
        }}
      >
        {children}
      </ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer; 