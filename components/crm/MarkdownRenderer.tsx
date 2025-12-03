// =============================================================================
// MARKDOWN RENDERER — Renders markdown with Obsidian-style [[links]]
// =============================================================================

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  onLinkClick?: (linkText: string) => void;
  onMentionClick?: (contactName: string) => void;
  preserveFormattingMarkers?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  onLinkClick,
  onMentionClick,
  preserveFormattingMarkers = false,
}) => {
  const baseStyle = {
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5rem',
    whiteSpace: 'pre-wrap',
  };

  const renderPreservedContent = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const linkMarkup = match[0];
      const linkText = match[1];

      parts.push(
        <span
          key={`wikilink-${key++}`}
          onClick={
            onLinkClick
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onLinkClick(linkText);
                }
              : undefined
          }
          className="text-[#4433FF]"
          style={{
            display: 'inline',
            cursor: onLinkClick ? 'pointer' : 'default',
          }}
        >
          {linkMarkup}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const renderInlineMarkdown = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let key = 0;

    // Process inline patterns in order of specificity
    const patterns = [
      { regex: /\*\*([^*]+)\*\*/g, type: 'bold' }, // Bold (must come before italic)
      { regex: /\*([^*]+)\*/g, type: 'italic' }, // Italic
      { regex: /`([^`]+)`/g, type: 'code' }, // Inline code
      { regex: /\[\[([^\]]+)\]\]/g, type: 'link' }, // Obsidian links
      { regex: /@([^\s@\[\]\(\)]+(?:\s+[^\s@\[\]\(\)]+)*)/g, type: 'mention' }, // @mentions (allows spaces for full names)
    ];

    const matches: Array<{
      index: number;
      length: number;
      type: string;
      content: string;
      raw: string;
    }> = [];

    // Find all matches
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          type: pattern.type,
          content: match[1],
          raw: match[0],
        });
      }
    });

    // Sort by index
    matches.sort((a, b) => a.index - b.index);

    // Build parts
    matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      switch (match.type) {
        case 'bold':
          if (preserveFormattingMarkers) {
            parts.push(
              <span key={key++} className="font-bold text-white">
                {`**${match.content}**`}
              </span>
            );
          } else {
            parts.push(
              <strong key={key++} className="font-bold text-white">
                {match.content}
              </strong>
            );
          }
          break;
        case 'italic':
          if (preserveFormattingMarkers) {
            parts.push(
              <span key={key++} className="italic text-gray-300">
                {`*${match.content}*`}
              </span>
            );
          } else {
            parts.push(
              <em key={key++} className="italic text-gray-300">
                {match.content}
              </em>
            );
          }
          break;
        case 'code':
          if (preserveFormattingMarkers) {
            const codeText = `\`${match.content}\``;
            parts.push(
              <span key={key++} className="text-[#4433FF]">
                {codeText}
              </span>
            );
          } else {
            parts.push(
              <code key={key++} className="bg-[#1A1A1D] px-1.5 py-0.5 rounded text-[#4433FF] font-mono text-xs">
                {match.content}
              </code>
            );
          }
          break;
        case 'link':
          if (preserveFormattingMarkers) {
            const linkText = `[[${match.content}]]`;
            parts.push(
              <span
                key={key++}
                onClick={
                  onLinkClick
                    ? (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onLinkClick(match.content);
                      }
                    : undefined
                }
                className="text-[#4433FF]"
                style={{
                  display: 'inline',
                  cursor: onLinkClick ? 'pointer' : 'default',
                }}
              >
                {linkText}
              </span>
            );
          } else {
            parts.push(
              <button
                key={key++}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onLinkClick) {
                    onLinkClick(match.content);
                  }
                }}
                className="text-[#4433FF] hover:text-white underline-offset-2 hover:underline cursor-pointer inline"
                style={{ display: 'inline', padding: 0, border: 0, background: 'none' }}
              >
                {match.content}
              </button>
            );
          }
          break;
        case 'mention':
          const mentionText = `@${match.content}`;
          parts.push(
            <span
              key={key++}
              onClick={
                onMentionClick
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMentionClick(match.content);
                    }
                  : undefined
              }
              className="text-[#8beaff] hover:text-white cursor-pointer bg-[#8beaff]/10 px-1 rounded"
              style={{
                display: 'inline',
                cursor: onMentionClick ? 'pointer' : 'default',
              }}
            >
              {mentionText}
            </span>
          );
          break;
      }

      lastIndex = match.index + match.length;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  if (preserveFormattingMarkers) {
    return (
      <div 
        className="break-words"
        style={baseStyle}
      >
        {renderPreservedContent(content)}
      </div>
    );
  }

  // Process line by line to handle headers
  const lines = content.split('\n');
  const renderedLines: (string | React.ReactElement)[] = [];

  lines.forEach((line, lineIdx) => {
    const headerMatch = preserveFormattingMarkers ? null : line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const HeaderTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements;
      const headerContent = renderInlineMarkdown(headerMatch[2]);
      renderedLines.push(
        <HeaderTag key={`header-${lineIdx}`} className="font-bold text-white mt-4 mb-2 first:mt-0">
          {headerContent}
        </HeaderTag>
      );
    } else {
      const rendered = renderInlineMarkdown(line);
      renderedLines.push(
        <React.Fragment key={`line-${lineIdx}`}>
          {rendered}
        </React.Fragment>
      );
      // Don't add <br /> - whiteSpace: pre-wrap handles line breaks
    }
  });

  return (
    <div 
      className="break-words"
      style={baseStyle}
    >
      {renderedLines}
    </div>
  );
};
