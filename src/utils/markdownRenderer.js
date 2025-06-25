// Simple markdown to HTML converter
export const renderMarkdown = (text) => {
  if (!text) return '';
  
  return text
    // Code blocks (must come before inline code)
    .replace(/```([\s\S]*?)```/g, (match, codeContent) => {
      // Trim leading and trailing whitespace/newlines from code content
      const trimmedCode = codeContent.replace(/^\n+|\n+$/g, '');
      return `<pre style="background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; margin: 8px 0; border: 1px solid #e1e4e8;"><code style="font-family: monospace; font-size: 14px; line-height: 1.45;">${trimmedCode}</code></pre>`;
    })
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.*?)`/g, '<code style="background: #f1f1f1; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #3182ce; text-decoration: underline;">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br>');
}; 