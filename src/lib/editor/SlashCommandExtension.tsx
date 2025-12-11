// =============================================================================
// SLASH COMMAND EXTENSION — Notion-style "/" menu for block insertion
// =============================================================================
// Enables typing "/" to open a command palette for quickly inserting:
// - Headings (H1, H2, H3)
// - Lists (bullet, numbered, task)
// - Quote blocks
// - Code blocks
// - Horizontal rules
// - Images
// - Tweet embeds
// =============================================================================

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Image,
  Twitter,
  Type,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

// =============================================================================
// SLASH COMMAND ITEMS
// =============================================================================

const getSuggestionItems = (): SlashCommandItem[] => [
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: <Type size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Track tasks with checkboxes',
    icon: <CheckSquare size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quote size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: <Code size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal line',
    icon: <Minus size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Image',
    description: 'Upload or embed an image',
    icon: <Image size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger file input after menu closes
      setTimeout(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                editor.chain().focus().setResizableImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      }, 100);
    },
  },
  {
    title: 'Tweet',
    description: 'Embed a tweet from Twitter/X',
    icon: <Twitter size={18} />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Prompt for URL
      const url = window.prompt('Enter Twitter/X URL:');
      if (url) {
        editor.chain().focus().setTweetEmbed({ url }).run();
      }
    },
  },
];

// =============================================================================
// SLASH COMMAND MENU COMPONENT
// =============================================================================

interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  colors: {
    bg: string;
    border: string;
    text: string;
    textMuted: string;
    hover: string;
    accent: string;
  };
}

export const CommandList = forwardRef<any, CommandListProps>(
  ({ items, command, colors }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((selectedIndex + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    useEffect(() => setSelectedIndex(0), [items]);

    if (items.length === 0) {
      return (
        <div
          style={{
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '13px',
            color: colors.textMuted,
          }}
        >
          No matching commands
        </div>
      );
    }

    return (
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          maxHeight: '320px',
          overflowY: 'auto',
          minWidth: '280px',
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => selectItem(index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 14px',
              textAlign: 'left',
              background: index === selectedIndex ? colors.hover : 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: colors.hover,
                color: index === selectedIndex ? colors.accent : colors.textMuted,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: colors.text,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: colors.textMuted,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }
);

CommandList.displayName = 'CommandList';

// =============================================================================
// SLASH COMMAND EXTENSION
// =============================================================================

export interface SlashCommandOptions {
  suggestion: Omit<SuggestionOptions<SlashCommandItem>, 'editor'>;
  colors?: {
    bg: string;
    border: string;
    text: string;
    textMuted: string;
    hover: string;
    accent: string;
  };
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
      colors: {
        bg: '#0f0f10',
        border: '#1f2023',
        text: '#f3f4f6',
        textMuted: '#9ca3af',
        hover: '#1f2023',
        accent: '#6366f1',
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => {
          const items = getSuggestionItems();
          if (!query) return items;
          return items.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: HTMLElement | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              component = new ReactRenderer(CommandList, {
                props: {
                  ...props,
                  colors: this.options.colors,
                },
                editor: props.editor,
              });

              popup = document.createElement('div');
              popup.style.position = 'absolute';
              popup.style.zIndex = '9999';
              document.body.appendChild(popup);
              popup.appendChild(component.element);

              // Position the popup
              const { clientRect } = props;
              if (clientRect) {
                const rect = clientRect();
                if (rect) {
                  popup.style.top = `${rect.bottom + 8}px`;
                  popup.style.left = `${rect.left}px`;
                }
              }
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              if (component) {
                component.updateProps({
                  ...props,
                  colors: this.options.colors,
                });
              }

              if (popup) {
                const { clientRect } = props;
                if (clientRect) {
                  const rect = clientRect();
                  if (rect) {
                    popup.style.top = `${rect.bottom + 8}px`;
                    popup.style.left = `${rect.left}px`;
                  }
                }
              }
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                if (popup) {
                  popup.remove();
                  popup = null;
                }
                if (component) {
                  component.destroy();
                  component = null;
                }
                return true;
              }

              return (component?.ref as any)?.onKeyDown(props) || false;
            },

            onExit: () => {
              if (popup) {
                popup.remove();
                popup = null;
              }
              if (component) {
                component.destroy();
                component = null;
              }
            },
          };
        },
      }),
    ];
  },
});

export default SlashCommandExtension;
