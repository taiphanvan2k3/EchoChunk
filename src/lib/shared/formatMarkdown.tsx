import type { ReactNode } from 'react';

/**
 * Parses markdown inline syntax (**bold**, `code`) into React nodes.
 * Replaces raw markdown syntax like ** or ` with properly styled elements.
 */
export function formatMarkdown(text: string | undefined | null): ReactNode {
  if (!text) return '';

  // Matches **bold** or `code` or *italic*
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const cleanContent = part.slice(2, -2).replace(/`/g, '').trim();
      return (
        <strong
          key={index}
          className="font-bold text-notion-blue-text bg-notion-blue-bg border border-notion-blue-border px-1.5 py-0.5 rounded mx-0.5"
        >
          {cleanContent}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const cleanContent = part.slice(1, -1).trim();
      return (
        <code
          key={index}
          className="font-mono text-[0.9em] bg-notion-code-bg text-notion-code-text px-1.5 py-0.5 rounded mx-0.5"
        >
          {cleanContent}
        </code>
      );
    }
    // Clean any accidental stray backticks
    return part.replace(/`/g, '');
  });
}

