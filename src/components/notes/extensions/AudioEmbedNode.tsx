// =============================================================================
// AUDIO EMBED NODE — TipTap extension for embedded audio with player
// =============================================================================
// Features:
// - Embedded audio player with play/pause controls
// - Waveform visualization
// - Duration display
// - Supports data URLs for inline storage
// =============================================================================

import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, NodeViewProps } from '@tiptap/react';
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

// =============================================================================
// NODE VIEW COMPONENT
// =============================================================================

const AudioNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(node.attrs.duration || 0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      // Store duration in node attributes for future loads
      if (!node.attrs.duration) {
        updateAttributes({ duration: audio.duration });
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [node.attrs.duration, updateAttributes]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <NodeViewWrapper
      className="audio-embed-wrapper"
      data-type="audio-embed"
    >
      <div
        className={`audio-embed-player ${selected ? 'selected' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(99, 102, 241, 0.08)',
          border: selected ? '2px solid #6366f1' : '1px solid rgba(99, 102, 241, 0.2)',
          margin: '8px 0',
          maxWidth: '500px',
        }}
      >
        {/* Hidden audio element */}
        <audio ref={audioRef} src={node.attrs.src} preload="metadata" />

        {/* Play/Pause Button */}
        <button
          onClick={togglePlayPause}
          className="audio-play-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'transform 0.1s, background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4f46e5')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#6366f1')}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
        </button>

        {/* Progress and Time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title if available */}
          {node.attrs.title && (
            <div
              style={{
                fontSize: '12px',
                fontWeight: 500,
                marginBottom: '4px',
                color: 'inherit',
                opacity: 0.8,
              }}
            >
              {node.attrs.title}
            </div>
          )}

          {/* Progress Bar */}
          <div
            onClick={handleSeek}
            style={{
              height: '6px',
              background: 'rgba(99, 102, 241, 0.2)',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress}%`,
                background: '#6366f1',
                borderRadius: '3px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>

          {/* Time Display */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              marginTop: '4px',
              opacity: 0.6,
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{isLoaded ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Volume Icon (visual indicator) */}
        <Volume2 size={16} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>
    </NodeViewWrapper>
  );
};

// =============================================================================
// TIPTAP EXTENSION
// =============================================================================

export interface AudioEmbedOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    audioEmbed: {
      setAudioEmbed: (options: { src: string; title?: string }) => ReturnType;
    };
  }
}

export const AudioEmbedNode = Node.create<AudioEmbedOptions>({
  name: 'audioEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
      duration: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="audio-embed"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'audio-embed',
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  },

  addCommands() {
    return {
      setAudioEmbed:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default AudioEmbedNode;
