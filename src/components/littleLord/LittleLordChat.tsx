// =============================================================================
// LITTLE LORD CHAT — Universal chat interface component
// =============================================================================
// Can be embedded anywhere in the app. Maintains conversation state and
// handles invocation, event dispatch, and UI rendering.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Bot, User, Sparkles, Crown } from 'lucide-react';
import {
  invokeLittleLordWithHistory,
  createInitialLittleLordMessage,
  getLittleLordDisplayName,
} from '../../services/littleLord';
import { dispatchLittleLordEvent } from '../../services/littleLord/eventDispatch';
import type { LittleLordMessage, LittleLordContext } from '../../services/littleLord/types';
import { CONTACT_ZERO } from '../../services/contactStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordChatProps {
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** User ID (usually Contact Zero ID) */
  userId: string;
  /** Optional context to pass to Little Lord */
  context?: LittleLordContext;
  /** Optional CSS class for container */
  className?: string;
  /** Optional height override (default: 400px) */
  height?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Optional callback when a message is sent */
  onMessageSent?: (message: string) => void;
  /** Optional callback when an event is emitted */
  onEventEmitted?: (eventData: any) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordChat: React.FC<LittleLordChatProps> = ({
  tenantId,
  userId,
  context,
  className = '',
  height = '400px',
  showHeader = true,
  onMessageSent,
  onEventEmitted,
}) => {
  const [messages, setMessages] = useState<LittleLordMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    const initialMessage = createInitialLittleLordMessage(tenantId, userId, context);
    setMessages([initialMessage]);
  }, [tenantId, userId, context?.selectedContactId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
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

    onMessageSent?.(trimmed);

    try {
      const response = await invokeLittleLordWithHistory(
        {
          tenantId,
          userId,
          userMessage: trimmed,
          recentContext: context,
        },
        nextMessages
      );

      const assistantMessage: LittleLordMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages, assistantMessage]);

      // Dispatch event if present
      if (response.event) {
        dispatchLittleLordEvent(tenantId, userId, response.event);
        onEventEmitted?.(response.event);
      }
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

  const displayName = getLittleLordDisplayName();
  const isContactZero = !context?.selectedContactId || context?.selectedContactId === CONTACT_ZERO.id;

  return (
    <div className={`bg-[#0A0A0A] border border-[#222] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-[#222] bg-[#0E0E0E]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#4433FF]/20 rounded border border-[#4433FF]/30">
              <Crown size={14} className="text-[#4433FF]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{displayName}</h3>
              <p className="text-[10px] text-gray-500">
                {isContactZero ? 'Your Apex Frame coach' : 'Frame dynamics advisor'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatScrollRef}
        className="overflow-y-auto p-4 space-y-4"
        style={{ height }}
      >
        {messages.map((message, index) => (
          <MotionDiv
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'assistant'
                  ? 'bg-[#4433FF]/20 border border-[#4433FF]/30'
                  : 'bg-[#333]'
              }`}
            >
              {message.role === 'assistant' ? (
                <Crown size={14} className="text-[#4433FF]" />
              ) : (
                <User size={14} className="text-gray-400" />
              )}
            </div>

            {/* Message Bubble */}
            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
              <div
                className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[85%] ${
                  message.role === 'assistant'
                    ? 'bg-[#1A1A1A] text-gray-200 text-left'
                    : 'bg-[#4433FF] text-white'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          </MotionDiv>
        ))}

        {/* Loading indicator */}
        {loading && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-[#4433FF]/20 border border-[#4433FF]/30 flex items-center justify-center">
              <Crown size={14} className="text-[#4433FF]" />
            </div>
            <div className="flex-1">
              <div className="inline-block px-3 py-2 rounded-lg bg-[#1A1A1A]">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 size={14} className="animate-spin" />
                  Thinking...
                </div>
              </div>
            </div>
          </MotionDiv>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#222] bg-[#0E0E0E]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isContactZero ? 'Ask about your frame...' : 'Ask about this contact...'}
            rows={2}
            className="flex-1 bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 bg-[#4433FF] text-white rounded hover:bg-[#5544FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-gray-600 mt-1.5 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default LittleLordChat;
