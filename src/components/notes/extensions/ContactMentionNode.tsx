// =============================================================================
// CONTACT MENTION NODE — Tiptap Node extension for @mentions
// =============================================================================
// Renders contact mentions as inline nodes with:
// - Icon on the LEFT (like wiki links)
// - Name text matching body styling
// - No raw @{id|name} visible in rendered mode
// - Stored as @{contactId|Full Name} in markdown source
// =============================================================================

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { User } from 'lucide-react';

// =============================================================================
// NODE VIEW COMPONENT
// =============================================================================

interface ContactMentionNodeViewProps {
  node: {
    attrs: {
      contactId: string;
      name: string;
    };
  };
  extension: {
    options: ContactMentionNodeOptions;
  };
}

const ContactMentionNodeView: React.FC<ContactMentionNodeViewProps> = ({ node, extension }) => {
  const { contactId, name } = node.attrs;
  const { onNavigate } = extension.options;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavigate && contactId) {
      onNavigate(contactId);
    }
  };

  return (
    <NodeViewWrapper
      as="span"
      className="contact-mention"
      onClick={handleClick}
      contentEditable={false}
      data-contact-id={contactId}
      data-contact-name={name}
    >
      <User className="mention-icon" size={12} />
      <span className="mention-text">{name}</span>
    </NodeViewWrapper>
  );
};

// =============================================================================
// NODE EXTENSION
// =============================================================================

export interface ContactMentionNodeOptions {
  HTMLAttributes: Record<string, unknown>;
  onNavigate?: (contactId: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    contactMentionNode: {
      /**
       * Insert a contact mention node
       */
      insertContactMention: (attrs: { contactId: string; name: string }) => ReturnType;
    };
  }
}

export const ContactMentionNode = Node.create<ContactMentionNodeOptions>({
  name: 'contactMentionNode',

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
      contactId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-contact-id') || '',
        renderHTML: (attributes) => ({
          'data-contact-id': attributes.contactId,
        }),
      },
      name: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-contact-name') || '',
        renderHTML: (attributes) => ({
          'data-contact-name': attributes.name,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.contact-mention',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'contact-mention',
      }),
      ['span', { class: 'mention-icon-placeholder' }],
      ['span', { class: 'mention-text' }, HTMLAttributes['data-contact-name'] || ''],
    ];
  },

  addNodeView() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ReactNodeViewRenderer(ContactMentionNodeView as any);
  },

  addCommands() {
    return {
      insertContactMention:
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

export default ContactMentionNode;
