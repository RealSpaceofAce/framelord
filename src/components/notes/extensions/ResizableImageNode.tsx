// =============================================================================
// RESIZABLE IMAGE NODE — TipTap extension for resizable images
// =============================================================================
// Features:
// - Drag handles on corners and edges to resize images
// - Maintains aspect ratio by default (hold Shift to override)
// - Minimum size constraints to prevent tiny images
// - Stores width/height in node attributes for persistence
// =============================================================================

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import React, { useState, useRef, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface ResizableImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

// =============================================================================
// RESIZABLE IMAGE COMPONENT
// =============================================================================

interface ResizableImageViewProps {
  node: {
    attrs: ResizableImageAttributes;
  };
  updateAttributes: (attrs: Partial<ResizableImageAttributes>) => void;
  selected: boolean;
  // Additional TipTap NodeViewProps (typed loosely for compatibility)
  editor?: any;
  getPos?: () => number | undefined;
  deleteNode?: () => void;
  decorations?: any;
  extension?: any;
  HTMLAttributes?: Record<string, any>;
}

const ResizableImageView: React.FC<ResizableImageViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const { src, alt, title, width, height } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeDirection(direction);

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = containerRef.current?.offsetWidth || width || 300;
      const startHeight = containerRef.current?.offsetHeight || height || 200;
      const aspectRatio = startWidth / startHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const maintainAspectRatio = !moveEvent.shiftKey;

        let newWidth = startWidth;
        let newHeight = startHeight;

        // Calculate new dimensions based on direction
        switch (direction) {
          case 'se': // Bottom-right
            newWidth = Math.max(100, startWidth + deltaX);
            newHeight = maintainAspectRatio
              ? newWidth / aspectRatio
              : Math.max(50, startHeight + deltaY);
            break;
          case 'sw': // Bottom-left
            newWidth = Math.max(100, startWidth - deltaX);
            newHeight = maintainAspectRatio
              ? newWidth / aspectRatio
              : Math.max(50, startHeight + deltaY);
            break;
          case 'ne': // Top-right
            newWidth = Math.max(100, startWidth + deltaX);
            newHeight = maintainAspectRatio
              ? newWidth / aspectRatio
              : Math.max(50, startHeight - deltaY);
            break;
          case 'nw': // Top-left
            newWidth = Math.max(100, startWidth - deltaX);
            newHeight = maintainAspectRatio
              ? newWidth / aspectRatio
              : Math.max(50, startHeight - deltaY);
            break;
          case 'e': // Right edge
            newWidth = Math.max(100, startWidth + deltaX);
            if (maintainAspectRatio) newHeight = newWidth / aspectRatio;
            break;
          case 'w': // Left edge
            newWidth = Math.max(100, startWidth - deltaX);
            if (maintainAspectRatio) newHeight = newWidth / aspectRatio;
            break;
          case 's': // Bottom edge
            newHeight = Math.max(50, startHeight + deltaY);
            if (maintainAspectRatio) newWidth = newHeight * aspectRatio;
            break;
          case 'n': // Top edge
            newHeight = Math.max(50, startHeight - deltaY);
            if (maintainAspectRatio) newWidth = newHeight * aspectRatio;
            break;
        }

        // Apply max width constraint (don't exceed container)
        const maxWidth = 800;
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          if (maintainAspectRatio) newHeight = newWidth / aspectRatio;
        }

        updateAttributes({
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        setResizeDirection(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [width, height, updateAttributes]
  );

  // Resize handle component
  const ResizeHandle: React.FC<{
    position: string;
    cursor: string;
    style: React.CSSProperties;
  }> = ({ position, cursor, style }) => (
    <div
      onMouseDown={(e) => handleMouseDown(e, position)}
      className="resize-handle"
      style={{
        position: 'absolute',
        width: position.length === 2 ? '12px' : '8px',
        height: position.length === 2 ? '12px' : '8px',
        background: '#6366f1',
        borderRadius: position.length === 2 ? '50%' : '2px',
        cursor,
        zIndex: 10,
        opacity: selected || isResizing ? 1 : 0,
        transition: 'opacity 0.15s',
        ...style,
      }}
    />
  );

  return (
    <NodeViewWrapper className="resizable-image-wrapper">
      <div
        ref={containerRef}
        className="resizable-image-container"
        style={{
          position: 'relative',
          display: 'inline-block',
          margin: '8px 0',
          maxWidth: '100%',
        }}
      >
        {/* The Image */}
        <img
          src={src}
          alt={alt || ''}
          title={title || ''}
          style={{
            display: 'block',
            width: width ? `${width}px` : 'auto',
            height: height ? `${height}px` : 'auto',
            maxWidth: '100%',
            borderRadius: '8px',
            outline: selected ? '2px solid #6366f1' : 'none',
            outlineOffset: '2px',
          }}
          draggable={false}
        />

        {/* Resize Handles - only show when selected */}
        {(selected || isResizing) && (
          <>
            {/* Corner handles */}
            <ResizeHandle position="nw" cursor="nw-resize" style={{ top: -6, left: -6 }} />
            <ResizeHandle position="ne" cursor="ne-resize" style={{ top: -6, right: -6 }} />
            <ResizeHandle position="sw" cursor="sw-resize" style={{ bottom: -6, left: -6 }} />
            <ResizeHandle position="se" cursor="se-resize" style={{ bottom: -6, right: -6 }} />

            {/* Edge handles */}
            <ResizeHandle position="n" cursor="n-resize" style={{ top: -4, left: '50%', transform: 'translateX(-50%)', width: '30px', height: '6px' }} />
            <ResizeHandle position="s" cursor="s-resize" style={{ bottom: -4, left: '50%', transform: 'translateX(-50%)', width: '30px', height: '6px' }} />
            <ResizeHandle position="e" cursor="e-resize" style={{ right: -4, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '30px' }} />
            <ResizeHandle position="w" cursor="w-resize" style={{ left: -4, top: '50%', transform: 'translateY(-50%)', width: '6px', height: '30px' }} />
          </>
        )}

        {/* Size indicator while resizing */}
        {isResizing && width && height && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            {width} × {height}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// =============================================================================
// TIPTAP EXTENSION
// =============================================================================

export const ResizableImageNode = Node.create({
  name: 'resizableImage',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.querySelector('img')?.getAttribute('src'),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      alt: {
        default: null,
        parseHTML: (element) => element.querySelector('img')?.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      title: {
        default: null,
        parseHTML: (element) => element.querySelector('img')?.getAttribute('title'),
        renderHTML: (attributes) => ({
          title: attributes.title,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.querySelector('img')?.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.querySelector('img')?.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => ({
          height: attributes.height,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="resizable-image"]',
      },
      {
        // Also parse regular img tags and convert them
        tag: 'img[src]',
        getAttrs: (element) => {
          const img = element as HTMLImageElement;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width') ? parseInt(img.getAttribute('width')!, 10) : null,
            height: img.getAttribute('height') ? parseInt(img.getAttribute('height')!, 10) : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ 'data-type': 'resizable-image' }),
      [
        'img',
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt,
          title: HTMLAttributes.title,
          width: HTMLAttributes.width,
          height: HTMLAttributes.height,
        },
      ],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView as any);
  },

  addCommands() {
    return {
      setResizableImage:
        (attributes: ResizableImageAttributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          });
        },
    };
  },
});

// Extend TipTap's Commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (attributes: ResizableImageAttributes) => ReturnType;
    };
  }
}

export default ResizableImageNode;
