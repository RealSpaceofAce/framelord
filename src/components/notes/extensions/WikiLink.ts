// =============================================================================
// WIKI LINK EXTENSION — Tiptap extension for [[Note Title]] links
// =============================================================================
// Provides:
// - WikiLink node type that renders [[Note Title]] as clickable links
// - Input rule to detect [[ and show suggestion popup
// - Click handling to navigate to linked notes
// =============================================================================

import { Mark, mergeAttributes } from '@tiptap/core';

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, any>;
  onNavigate?: (noteTitle: string) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      /**
       * Set a wiki link
       */
      setWikiLink: (attributes: { title: string }) => ReturnType;
      /**
       * Unset a wiki link
       */
      unsetWikiLink: () => ReturnType;
    };
  }
}

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
      onNavigate: undefined,
    };
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-wiki-title'),
        renderHTML: attributes => {
          if (!attributes.title) {
            return {};
          }
          return {
            'data-wiki-title': attributes.title,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-wiki-link': '',
          class: 'wiki-link',
        }
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setWikiLink:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      unsetWikiLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default WikiLink;
