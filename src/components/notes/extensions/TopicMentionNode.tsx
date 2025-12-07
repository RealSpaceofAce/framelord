// =============================================================================
// TOPIC MENTION NODE — Tiptap Node extension for #hashtags
// =============================================================================
// Renders topic hashtags as inline nodes with:
// - Hash icon on the LEFT
// - Topic label text matching body styling
// - No raw #{id|label} visible in rendered mode
// - Stored as #{topicId|Label} in markdown source
// =============================================================================

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { Hash } from 'lucide-react';

// =============================================================================
// NODE VIEW COMPONENT
// =============================================================================

interface TopicMentionNodeViewProps {
  node: {
    attrs: {
      topicId: string;
      label: string;
    };
  };
  extension: {
    options: TopicMentionNodeOptions;
  };
}

const TopicMentionNodeView: React.FC<TopicMentionNodeViewProps> = ({ node, extension }) => {
  const { topicId, label } = node.attrs;
  const { onNavigate } = extension.options;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate && topicId) {
      onNavigate(topicId);
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="topic-mention"
      onClick={handleClick}
      contentEditable={false}
      data-topic-id={topicId}
      data-topic-label={label}
    >
      <Hash className="mention-icon" size={12} />
      <span className="mention-text">{label}</span>
    </NodeViewWrapper>
  );
};

// =============================================================================
// NODE EXTENSION
// =============================================================================

export interface TopicMentionNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (topicId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    topicMentionNode: {
      /**
       * Insert a topic mention node
       */
      insertTopicMention: (attrs: { topicId: string; label: string }) => ReturnType;
    };
  }
}

export const TopicMentionNode = Node.create<TopicMentionNodeOptions>({
  name: 'topicMentionNode',

  group: 'inline',

  inline: true,

  atom: true, // Treated as a single unit, can't place cursor inside

  selectable: true,

  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      topicId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-topic-id') || '',
        renderHTML: (attributes) => ({
          'data-topic-id': attributes.topicId,
        }),
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-topic-label') || '',
        renderHTML: (attributes) => ({
          'data-topic-label': attributes.label,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.topic-mention',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'topic-mention',
      }),
      ['span', { class: 'mention-icon-placeholder' }],
      ['span', { class: 'mention-text' }, HTMLAttributes['data-topic-label'] || ''],
    ];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(TopicMentionNodeView as any);
  },

  addCommands() {
    return {
      insertTopicMention:
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

export default TopicMentionNode;
