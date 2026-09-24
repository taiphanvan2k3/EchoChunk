import React from 'react';

/**
 * Parses markdown inline syntax (**bold**, *italic*, `code`) into React nodes.
 * Replaces raw markdown syntax like ** or ` with properly styled elements.
 */
export function formatMarkdown(text: string | undefined | null): React.ReactNode {
  if (!text) return '';

  // Matches **bold** or `code` or *italic*
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const cleanContent = part.slice(2, -2).replace(/`/g, '').trim();
      return (
        <strong key={index} className="notion-bold-highlight">
          {cleanContent}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const cleanContent = part.slice(1, -1).trim();
      return (
        <code key={index} className="notion-inline-code">
          {cleanContent}
        </code>
      );
    }
    // Clean any accidental stray backticks
    return part.replace(/`/g, '');
  });
}
