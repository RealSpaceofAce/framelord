// =============================================================================
// TWEET EMBED NODE — TipTap extension for embedding tweets/X posts
// =============================================================================
// Features:
// - Parse tweet/X URLs to extract tweet ID
// - Render styled tweet card with link to original
// - Support both twitter.com and x.com URLs
// - PASTE-TO-EMBED: Automatically embeds when pasting Twitter/X URLs
// =============================================================================

import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React from 'react';
import { ExternalLink } from 'lucide-react';

// Regex patterns for matching Twitter/X URLs
const TWITTER_URL_REGEX = /https?:\/\/(twitter\.com|x\.com)\/[^/]+\/status\/\d+/g;
const TWITTER_URL_REGEX_GLOBAL = /https?:\/\/(twitter\.com|x\.com)\/[^/]+\/status\/\d+/gi;

// =============================================================================
// TYPES
// =============================================================================

export interface TweetEmbedAttributes {
  url: string;
  tweetId?: string;
  author?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Parse tweet URL to extract tweet ID and author
 * Supports both twitter.com and x.com URLs
 */
function parseTweetUrl(url: string): { tweetId: string | null; author: string | null } {
  try {
    const patterns = [
      // Twitter.com patterns
      /twitter\.com\/([^/]+)\/status\/(\d+)/,
      /twitter\.com\/i\/web\/status\/(\d+)/,
      // X.com patterns
      /x\.com\/([^/]+)\/status\/(\d+)/,
      /x\.com\/i\/web\/status\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        // Pattern with author (groups: author, tweetId)
        if (match.length === 3) {
          return { tweetId: match[2], author: match[1] };
        }
        // Pattern without author (group: tweetId)
        if (match.length === 2) {
          return { tweetId: match[1], author: null };
        }
      }
    }

    return { tweetId: null, author: null };
  } catch (error) {
    console.error('Error parsing tweet URL:', error);
    return { tweetId: null, author: null };
  }
}

// =============================================================================
// TWEET CARD COMPONENT
// =============================================================================

interface TweetCardProps {
  url: string;
  tweetId?: string;
  author?: string;
}

const TweetCard: React.FC<TweetCardProps> = ({ url, tweetId, author }) => {
  // Parse URL if tweetId/author not provided
  const parsed = (!tweetId || !author) ? parseTweetUrl(url) : { tweetId, author };
  const displayAuthor = author || parsed.author || 'Unknown';
  const displayTweetId = tweetId || parsed.tweetId || 'Unknown';

  return (
    <NodeViewWrapper className="tweet-embed-wrapper">
      <div
        className="tweet-embed-card"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '8px',
          marginBottom: '8px',
          background: '#f9fafb',
          maxWidth: '550px',
        }}
      >
        {/* X/Twitter Icon and Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: '#1DA1F2' }}
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
              @{displayAuthor}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Tweet ID: {displayTweetId}
            </div>
          </div>
        </div>

        {/* Tweet Link */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#6366f1',
            textDecoration: 'none',
            padding: '8px 12px',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1';
            e.currentTarget.style.background = '#f5f3ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
            e.currentTarget.style.background = '#fff';
          }}
        >
          <ExternalLink size={14} />
          <span>View on X</span>
        </a>

        {/* Note */}
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic' }}>
          Click to view the full tweet
        </div>
      </div>
    </NodeViewWrapper>
  );
};

// =============================================================================
// TIPTAP EXTENSION
// =============================================================================

export const TweetEmbedNode = Node.create({
  name: 'tweetEmbed',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-url'),
        renderHTML: (attributes) => ({
          'data-url': attributes.url,
        }),
      },
      tweetId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tweet-id'),
        renderHTML: (attributes) => ({
          'data-tweet-id': attributes.tweetId,
        }),
      },
      author: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-author'),
        renderHTML: (attributes) => ({
          'data-author': attributes.author,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="tweet-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-type': 'tweet-embed' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TweetCard);
  },

  addCommands() {
    return {
      setTweetEmbed:
        (attributes: TweetEmbedAttributes) =>
        ({ commands }) => {
          // Parse the URL to extract tweetId and author
          const parsed = parseTweetUrl(attributes.url);

          return commands.insertContent({
            type: this.name,
            attrs: {
              url: attributes.url,
              tweetId: parsed.tweetId,
              author: parsed.author,
            },
          });
        },
    };
  },

  /**
   * PASTE-TO-EMBED: Automatically convert pasted Twitter/X URLs into embedded tweets
   * No modal needed - just paste and it embeds!
   */
  addPasteRules() {
    return [
      nodePasteRule({
        find: TWITTER_URL_REGEX_GLOBAL,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0];
          const parsed = parseTweetUrl(url);
          return {
            url,
            tweetId: parsed.tweetId,
            author: parsed.author,
          };
        },
      }),
    ];
  },
});

export default TweetEmbedNode;
