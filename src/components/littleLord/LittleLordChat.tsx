// =============================================================================
// LITTLE LORD CHAT — Universal chat interface component
// =============================================================================
// Can be embedded anywhere in the app. Maintains conversation state and
// handles invocation, event dispatch, and UI rendering.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Bot, User, Sparkles, Crown, AlertOctagon, ShieldAlert } from 'lucide-react';
import type { GuardrailViolation } from '../../lib/agents/runLittleLord';
import {
  createInitialLittleLordMessage,
  getLittleLordDisplayName,
} from '../../services/littleLord';
import type { LittleLordMessage, LittleLordContext } from '../../services/littleLord/types';
import { CONTACT_ZERO, getContactById } from '../../services/contactStore';
import { createTask, updateTask } from '../../services/taskStore';
import { createNote } from '../../services/noteStore';
import { createInteraction } from '../../services/interactionStore';
import {
  createWant,
  updateWant,
  addStep,
  addMetricType,
  logMetricValue,
  logMetrics,
  logIteration,
  attachPrimaryContact,
  detachPrimaryContact,
  createRejectedShould,
  type WantStatus,
  type WantValidation,
  type WantDirectness,
} from '../../services/wantStore';
import {
  logIterationEntry,
  addDoctrineNote,
  createScopeForWant,
  type IterationAction,
} from '../../services/wantScopeStore';
import { useLittleLord } from './LittleLordProvider';
import type { LittleLordEvent } from '@/lib/agents/runLittleLord';

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
  // Access Little Lord context including runLittleLord function
  const { littleLord, runLittleLord } = useLittleLord();

  const [messages, setMessages] = useState<LittleLordMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Respect gate state
  const [respectViolation, setRespectViolation] = useState<GuardrailViolation | null>(null);
  const [respectAcknowledged, setRespectAcknowledged] = useState(false);
  const [respectInput, setRespectInput] = useState('');

  // Dispatch event to the appropriate store
  const dispatchEventToStore = (event: LittleLordEvent) => {
    const { type, payload } = event;
    const contactId = (payload.contactId as string) || context?.selectedContactId as string || CONTACT_ZERO.id;

    switch (type) {
      // Task events
      case 'task.create':
        createTask({
          title: payload.title as string || 'Untitled Task',
          contactId,
          dueAt: payload.dueDate as string | undefined,
        });
        console.log('[Little Lord] Created task:', payload.title);
        break;

      case 'task.update':
        if (payload.taskId) {
          const fields = payload.fields as Record<string, unknown> | undefined;
          updateTask(payload.taskId as string, {
            title: fields?.title as string | undefined,
            status: fields?.status as 'open' | 'done' | 'blocked' | undefined,
            dueAt: fields?.dueAt as string | undefined,
            contactId: fields?.contactId as string | undefined,
          });
          console.log('[Little Lord] Updated task:', payload.taskId);
        }
        break;

      // Note events
      case 'contact.note':
        createNote({
          content: payload.note as string || '',
          targetContactId: contactId,
          authorContactId: CONTACT_ZERO.id,
        });
        console.log('[Little Lord] Created note for contact:', contactId);
        break;

      // Interaction events
      case 'interaction.log':
        createInteraction({
          contactId,
          authorContactId: CONTACT_ZERO.id,
          type: 'other',
          summary: payload.summary as string || '',
        });
        console.log('[Little Lord] Logged interaction:', payload.summary);
        break;

      // Want events
      case 'want.create': {
        const newWant = createWant({
          title: payload.title as string || 'Untitled Want',
          reason: payload.reason as string || '',
          deadline: payload.deadline as string | undefined,
          status: (payload.status as WantStatus) || 'not_started',
          primaryContactId: payload.primaryContactId as string | undefined,
          metricTypes: payload.metricTypes as string[] | undefined,
        });
        // Immediately create a Scope for the new Want
        createScopeForWant(newWant.id);
        console.log('[Little Lord] Created Want:', payload.title, 'with Scope');
        break;
      }

      case 'want.update':
        if (payload.wantId) {
          updateWant(payload.wantId as string, {
            title: payload.title as string | undefined,
            reason: payload.reason as string | undefined,
            deadline: payload.deadline as string | undefined,
            status: payload.status as WantStatus | undefined,
          });
          console.log('[Little Lord] Updated Want:', payload.wantId);
        }
        break;

      case 'want.addStep':
        if (payload.wantId) {
          addStep(payload.wantId as string, {
            title: payload.title as string || 'Untitled Step',
            deadline: payload.deadline as string | undefined,
          });
          console.log('[Little Lord] Added step to Want:', payload.wantId);
        }
        break;

      case 'want.addMetricType':
        if (payload.wantId && payload.metricName) {
          addMetricType(payload.wantId as string, payload.metricName as string);
          console.log('[Little Lord] Added metric type:', payload.metricName, 'to Want:', payload.wantId);
        }
        break;

      case 'want.logMetricValue':
        if (payload.wantId && payload.metricName) {
          const date = (payload.date as string) || new Date().toISOString().split('T')[0];
          logMetricValue(
            payload.wantId as string,
            date,
            payload.metricName as string,
            payload.value as number | string | boolean | null
          );
          console.log('[Little Lord] Logged metric value:', payload.metricName, '=', payload.value);
        }
        break;

      case 'want.logMetrics':
        if (payload.wantId) {
          logMetrics(payload.wantId as string, {
            hoursWorked: payload.hoursWorked as number | null ?? null,
            income: payload.income as number | null ?? null,
            sleep: payload.sleep as number | null ?? null,
            workout: payload.workout as boolean | null ?? null,
            carbs: payload.carbs as number | null ?? null,
            protein: payload.protein as number | null ?? null,
            fat: payload.fat as number | null ?? null,
            calories: payload.calories as number | null ?? null,
            caloriesBurned: payload.caloriesBurned as number | null ?? null,
            deficit: payload.deficit as number | null ?? null,
            weight: payload.weight as number | null ?? null,
          });
          console.log('[Little Lord] Logged metrics for Want:', payload.wantId);
        }
        break;

      case 'want.logIteration':
        if (payload.wantId && payload.feedback) {
          logIteration(payload.wantId as string, payload.feedback as string);
          console.log('[Little Lord] Logged iteration for Want:', payload.wantId);
        }
        break;

      case 'want.attachContact':
        if (payload.wantId && payload.primaryContactId) {
          // Optionally include directness check from response
          const directnessCheck = payload.directnessCheck as WantDirectness | undefined;
          attachPrimaryContact(
            payload.wantId as string,
            payload.primaryContactId as string,
            directnessCheck
          );
          console.log('[Little Lord] Attached contact:', payload.primaryContactId, 'to Want:', payload.wantId);
        }
        break;

      case 'want.detachContact':
        if (payload.wantId) {
          detachPrimaryContact(payload.wantId as string);
          console.log('[Little Lord] Detached contact from Want:', payload.wantId);
        }
        break;

      // Scope events
      case 'scope.logEntry':
        if (payload.wantId && payload.action && payload.feedback) {
          logIterationEntry(payload.wantId as string, {
            action: payload.action as IterationAction,
            feedback: payload.feedback as string,
            consequence: payload.consequence as string || '',
            source: 'little_lord',
            relatedStepId: payload.relatedStepId as string | undefined,
            relatedMetricName: payload.relatedMetricName as string | undefined,
          });
          console.log('[Little Lord] Logged scope entry:', payload.action, 'for Want:', payload.wantId);
        }
        break;

      case 'scope.addDoctrineNote':
        if (payload.wantId && payload.note) {
          addDoctrineNote(payload.wantId as string, payload.note as string);
          console.log('[Little Lord] Added doctrine note to Want:', payload.wantId);
        }
        break;

      default:
        console.log('[Little Lord] Unknown event type:', type);
    }
  };

  // Initialize with greeting and handle suggestedPrompt
  // Resets when selectedContactId OR wantCreation context changes
  useEffect(() => {
    const initialMessage = createInitialLittleLordMessage(tenantId, userId, context);
    setMessages([initialMessage]);

    // If context includes suggestedPrompt, pre-fill the input
    // This supports the New Want flow where we seed an initial message
    const suggestedPrompt = context?.suggestedPrompt as string | undefined;
    if (suggestedPrompt) {
      setInput(suggestedPrompt);
    } else {
      // Clear input if no suggested prompt (e.g., switching contexts)
      setInput('');
    }
  }, [tenantId, userId, context?.selectedContactId, context?.suggestedPrompt, context?.wantCreation]);

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
      // Use provider's runLittleLord function
      const response = await runLittleLord(trimmed, context);

      const assistantMessage: LittleLordMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages, assistantMessage]);

      // Handle guardrail violations
      if (response.guardrail && response.guardrail.blocked) {
        console.log('[Little Lord] Guardrail triggered:', response.guardrail.kind);

        // For disrespect violations, activate the respect gate
        if (response.guardrail.kind === 'disrespect') {
          setRespectViolation(response.guardrail);
          setRespectAcknowledged(false);
          return; // Stop further processing
        }

        // For other guardrail violations, just log and don't dispatch events
        return;
      }

      // Handle validation result (Should vs Want check)
      if (response.validation) {
        console.log('[Little Lord] Want validation:', response.validation);
        // If a Should was rejected, create a rejected record
        if (!response.validation.isValidWant && response.event?.type === 'want.create') {
          const payload = response.event.payload;
          createRejectedShould({
            title: payload.title as string || 'Rejected Should',
            reason: payload.reason as string || '',
            rejectionReason: response.validation.reason,
          });
          console.log('[Little Lord] Rejected Should:', payload.title, '-', response.validation.reason);
          // Don't dispatch the want.create event for rejected shoulds
          return;
        }
      }

      // Handle directness check result
      if (response.directnessCheck) {
        console.log('[Little Lord] Directness check:', response.directnessCheck);
        // If indirect attachment was attempted, log the failure
        if (!response.directnessCheck.isDirect && response.event?.type === 'want.attachContact') {
          console.log('[Little Lord] Blocked indirect contact attachment:', response.directnessCheck.failingReason);
          // Don't dispatch the attachment event
          return;
        }
      }

      // Dispatch event to store if present
      if (response.event) {
        dispatchEventToStore(response.event);
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

  // Handle respect gate acknowledgment
  const handleRespectAcknowledge = () => {
    if (respectInput.trim().toUpperCase() === 'AGREE') {
      setRespectAcknowledged(true);
      setRespectViolation(null);
      setRespectInput('');
    }
  };

  const handleRespectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRespectAcknowledge();
    }
  };

  // Check if respect gate is blocking interaction
  const isRespectGateActive = respectViolation !== null && !respectAcknowledged;

  const displayName = getLittleLordDisplayName();
  const isContactZero = !context?.selectedContactId || context?.selectedContactId === CONTACT_ZERO.id;

  return (
    <div className={`bg-[#0A0A0A] border border-[#222] rounded-lg overflow-hidden flex flex-col ${className}`} style={{ height }}>
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-[#222] bg-[#0E0E0E] shrink-0">
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
        className="overflow-y-auto p-4 space-y-4 flex-1 min-h-0"
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

      {/* Respect Gate Banner */}
      {isRespectGateActive && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-t border-red-500/50 bg-red-500/10 shrink-0"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-500/20 rounded-full shrink-0">
              <ShieldAlert size={20} className="text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-400 mb-1">
                Guardrail Triggered: Disrespect Detected
              </h4>
              <p className="text-xs text-red-300/80 mb-3">
                {respectViolation?.message || 'Disrespectful content toward FrameLord, its founder, or its doctrine has been detected.'}
              </p>
              <blockquote className="pl-3 border-l-2 border-red-500/50 text-xs text-gray-400 italic mb-3">
                "The Apex maintains frame through sovereign choice, not through attacking others.
                If you have substantive feedback, frame it constructively."
              </blockquote>
              <p className="text-xs text-gray-500 mb-2">
                To continue, type <span className="text-red-400 font-mono">AGREE</span> below:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={respectInput}
                  onChange={(e) => setRespectInput(e.target.value)}
                  onKeyDown={handleRespectKeyDown}
                  placeholder="Type AGREE to continue"
                  className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-red-500/30 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
                  autoFocus
                />
                <button
                  onClick={handleRespectAcknowledge}
                  disabled={respectInput.trim().toUpperCase() !== 'AGREE'}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Input */}
      <div className={`p-3 border-t border-[#222] bg-[#0E0E0E] shrink-0 ${isRespectGateActive ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isContactZero ? 'Ask about your frame...' : 'Ask about this contact...'}
            rows={2}
            disabled={isRespectGateActive}
            className="flex-1 bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#4433FF] resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim() || isRespectGateActive}
            className="px-3 bg-[#4433FF] text-white rounded hover:bg-[#5544FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-gray-600 mt-1.5 text-center">
          {isRespectGateActive
            ? 'Interaction locked until respect gate is acknowledged'
            : 'Press Enter to send • Shift+Enter for new line'}
        </p>
      </div>
    </div>
  );
};

export default LittleLordChat;
