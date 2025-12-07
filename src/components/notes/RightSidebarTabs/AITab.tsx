// =============================================================================
// AI TAB — LittleLord chat interface for right sidebar
// =============================================================================
// Migrated from LittleLordNoteSidebar to work as a tab
// - Chat interface with message history
// - Suggestion buttons
// - Model selector (Gemini dropdown)
// - Action buttons (Insert, Copy, Save, etc.)
// =============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Loader2,
  Crown,
  User,
  Plus,
  FileText,
  Copy,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  invokeLittleLordWithHistory,
  createInitialLittleLordMessage,
  getLittleLordDisplayName,
} from '../../../services/littleLord';
import type { LittleLordMessage, LittleLordContext } from '../../../services/littleLord/types';
import { CONTACT_ZERO } from '../../../services/contactStore';
import { createNote } from '../../../services/noteStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export interface AITabProps {
  noteId?: string;
  noteContent?: string;
  theme: 'light' | 'gray' | 'dark';
  colors: Record<string, string>;
  tenantId?: string;
  userId?: string;
  onInsert?: (text: string) => void;
  onNoteCreated?: (noteId: string) => void;
}

// =============================================================================
// SUGGESTION BUTTONS
// =============================================================================

const SUGGESTIONS = [
  'Read article',
  'Tidy with AI',
  'Add illustrations',
  'Complete writing',
  'Freely communicate',
];

// =============================================================================
// COMPONENT
// =============================================================================

export const AITab: React.FC<AITabProps> = ({
  noteId,
  noteContent,
  theme,
  colors,
  tenantId = 'default',
  userId = CONTACT_ZERO.id,
  onInsert,
  onNoteCreated,
}) => {
  const [messages, setMessages] = useState<LittleLordMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState('Gemini');
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build context for Little Lord
  const buildContext = useCallback((): LittleLordContext => {
    return {
      selectedContactId: CONTACT_ZERO.id,
      editorContent: noteContent || null,
    };
  }, [noteContent]);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = createInitialLittleLordMessage(tenantId, userId, buildContext());
      setMessages([initialMessage]);
    }
  }, [tenantId, userId, buildContext, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus input when component mounts or when messages reset
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Get last assistant message
  const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  const handleSend = async (message?: string) => {
    const trimmed = (message || input).trim();
    if (!trimmed || loading) return;

    const userMessage: LittleLordMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await invokeLittleLordWithHistory(
        {
          tenantId,
          userId,
          userMessage: trimmed,
          recentContext: buildContext(),
        },
        nextMessages
      );

      const assistantMessage: LittleLordMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages, assistantMessage]);
    } catch (err: any) {
      console.error('Little Lord error:', err);
      const errorMessage: LittleLordMessage = {
        role: 'assistant',
        content: 'I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Action handlers
  const handleInsert = () => {
    if (lastAssistantMessage && onInsert) {
      onInsert(lastAssistantMessage.content);
    }
  };

  const handleCopy = async () => {
    if (lastAssistantMessage) {
      await navigator.clipboard.writeText(lastAssistantMessage.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveAsDoc = () => {
    if (lastAssistantMessage) {
      const newNote = createNote({
        title: 'LittleLord Response',
        content: lastAssistantMessage.content,
        folderId: 'inbox',
      });
      if (newNote) {
        onNoteCreated?.(newNote.id);
      }
    }
  };

  const displayName = getLittleLordDisplayName();

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header with "What can I help you with?" */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <h3 className="text-sm font-medium mb-1" style={{ color: colors.text }}>
          What can I help you with?
        </h3>
      </div>

      {/* Suggestion Buttons */}
      {messages.length <= 1 && !loading && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSend(suggestion)}
              className="px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                background: colors.hover,
                color: colors.text,
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-3"
      >
        {messages.map((message, index) => (
          <MotionDiv
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: message.role === 'assistant' ? `${colors.accent}20` : colors.hover,
              }}
            >
              {message.role === 'assistant' ? (
                <Crown size={12} style={{ color: colors.accent }} />
              ) : (
                <User size={12} style={{ color: colors.textMuted }} />
              )}
            </div>

            {/* Message */}
            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className="inline-block px-3 py-2 rounded-lg text-xs max-w-[85%]"
                style={{
                  background: message.role === 'assistant' ? colors.hover : colors.accent,
                  color: message.role === 'assistant' ? colors.text : '#ffffff',
                  textAlign: 'left',
                }}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          </MotionDiv>
        ))}

        {/* Loading */}
        {loading && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `${colors.accent}20` }}
            >
              <Crown size={12} style={{ color: colors.accent }} />
            </div>
            <div className="flex-1">
              <div
                className="inline-block px-3 py-2 rounded-lg"
                style={{ background: colors.hover }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: colors.textMuted }}>
                  <Loader2 size={12} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </div>

      {/* Action Buttons */}
      {lastAssistantMessage && !loading && (
        <div className="px-4 py-2 border-t flex flex-wrap gap-2" style={{ borderColor: colors.border }}>
          <ActionButton
            icon={<Plus size={12} />}
            label="Insert"
            onClick={handleInsert}
            disabled={!onInsert}
            colors={colors}
          />
          <ActionButton
            icon={<FileText size={12} />}
            label="Save as Doc"
            onClick={handleSaveAsDoc}
            colors={colors}
          />
          <ActionButton
            icon={copied ? <Check size={12} /> : <Copy size={12} />}
            label={copied ? 'Copied!' : 'Copy'}
            onClick={handleCopy}
            colors={colors}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t" style={{ borderColor: colors.border }}>
        {/* Model Selector */}
        <div className="mb-2 relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors w-full"
            style={{ background: colors.hover, color: colors.text }}
          >
            <span className="flex-1 text-left">{selectedModel}</span>
            <ChevronDown size={12} style={{ color: colors.textMuted }} />
          </button>

          {showModelMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowModelMenu(false)} />
              <div
                className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-lg shadow-lg overflow-hidden"
                style={{ background: colors.sidebar, border: `1px solid ${colors.border}` }}
              >
                {['Gemini', 'GPT-4', 'Claude'].map((model) => (
                  <button
                    key={model}
                    onClick={() => { setSelectedModel(model); setShowModelMenu(false); }}
                    className="w-full px-3 py-2 text-xs text-left transition-colors"
                    style={{
                      background: selectedModel === model ? colors.hover : 'transparent',
                      color: colors.text,
                    }}
                  >
                    {model}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything..."
            rows={2}
            className="w-full px-3 py-2 pr-10 rounded-lg text-xs resize-none outline-none border"
            style={{
              background: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors disabled:opacity-40"
            style={{ background: colors.accent, color: '#fff' }}
          >
            <Send size={12} />
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: colors.textMuted }}>
          Press Enter to send
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// ACTION BUTTON
// =============================================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  colors: Record<string, string>;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, disabled, colors }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    style={{ background: colors.hover, color: colors.text }}
  >
    {icon}
    {label}
  </button>
);

export default AITab;
