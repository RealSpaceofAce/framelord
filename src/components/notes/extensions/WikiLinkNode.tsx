// =============================================================================
// WIKI LINK NODE — Tiptap Node extension for [[Note Title]] links
// =============================================================================
// Renders wiki links as inline nodes with:
// - Icon on the LEFT (like Affine)
// - Title text matching body styling
// - No raw [[Title]] visible in rendered mode
// =============================================================================

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { ExternalLink } from 'lucide-react';

// =============================================================================
// NODE VIEW COMPONENT
// =============================================================================

interface WikiLinkNodeViewProps {
  node: {
    attrs: {
      title: string;
      noteId?: string;
    };
  };
  extension: {
    options: WikiLinkNodeOptions;
  };
}

const WikiLinkNodeView: React.FC<WikiLinkNodeViewProps> = ({ node, extension }) => {
  const { title, noteId } = node.attrs;
  const { onNavigate, colors } = extension.options;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate) {
      onNavigate(title, noteId);
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="wikilink"
      onClick={handleClick}
      contentEditable={false}
      data-wiki-title={title}
      data-note-id={noteId || ''}
    >
      <ExternalLink className="wikilink-icon" size={12} />
      <span className="wikilink-text">{title}</span>
    </NodeViewWrapper>
  );
};

// =============================================================================
// NODE EXTENSION
// =============================================================================

export interface WikiLinkNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (title: string, noteId?: string) => void;
  colors?: Record<string, string>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLinkNode: {
      /**
       * Insert a wiki link node
       */
      insertWikiLink: (attrs: { title: string; noteId?: string }) => ReturnType;
    };
  }
}

export const WikiLinkNode = Node.create<WikiLinkNodeOptions>({
  name: 'wikiLinkNode',

  group: 'inline',

  inline: true,

  atom: true, // Treated as a single unit, can't place cursor inside

  selectable: true,

  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
      colors: undefined,
    };
  },

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-wiki-title') || '',
        renderHTML: (attributes) => ({
          'data-wiki-title': attributes.title,
        }),
      },
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id') || null,
        renderHTML: (attributes) => {
          if (!attributes.noteId) return {};
          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.wikilink',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'wikilink',
      }),
      ['span', { class: 'wikilink-icon-placeholder' }],
      ['span', { class: 'wikilink-text' }, HTMLAttributes['data-wiki-title'] || ''],
    ];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(WikiLinkNodeView as any);
  },

  addCommands() {
    return {
      insertWikiLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});

export default WikiLinkNode;
