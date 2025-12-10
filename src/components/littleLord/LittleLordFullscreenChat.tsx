// =============================================================================
// LITTLE LORD FULLSCREEN CHAT — Immersive orb experience
// =============================================================================
// Fullscreen layout with centered orb and fading message stream.
// Used when Little Lord modal is maximized.
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Crown, User, Minimize2, X, ShieldAlert } from 'lucide-react';
import { LittleLordOrbView, type SpiritState } from './LittleLordOrbView';
import type { GuardrailViolation } from '../../lib/agents/runLittleLord';
import {
  createInitialLittleLordMessage,
  getLittleLordDisplayName,
} from '../../services/littleLord';
import type { LittleLordMessage, LittleLordContext } from '../../services/littleLord/types';
import { CONTACT_ZERO } from '../../services/contactStore';
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
// STYLES
// =============================================================================

const fullscreenStyles = `
  .ll-message-fade-mask {
    mask-image: linear-gradient(to top, black 0%, black 50%, transparent 100%);
    -webkit-mask-image: linear-gradient(to top, black 0%, black 50%, transparent 100%);
  }
`;

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordFullscreenChatProps {
  tenantId: string;
  userId: string;
  context?: LittleLordContext;
  onClose: () => void;
  onMinimize: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordFullscreenChat: React.FC<LittleLordFullscreenChatProps> = ({
  tenantId,
  userId,
  context,
  onClose,
  onMinimize,
}) => {
  const { runLittleLord } = useLittleLord();

  const [messages, setMessages] = useState<LittleLordMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Respect gate state
  const [respectViolation, setRespectViolation] = useState<GuardrailViolation | null>(null);
  const [respectAcknowledged, setRespectAcknowledged] = useState(false);
  const [respectInput, setRespectInput] = useState('');

  // Spirit state for orb
  const spiritState: SpiritState = {
    isThinking: loading,
    isSpeaking: false,
    emotion: 'neutral'
  };

  // Dispatch event to store (same as LittleLordChat)
  const dispatchEventToStore = (event: LittleLordEvent) => {
    const { type, payload } = event;
    const contactId = (payload.contactId as string) || context?.selectedContactId as string || CONTACT_ZERO.id;

    switch (type) {
      case 'task.create':
        createTask({
          title: payload.title as string || 'Untitled Task',
          contactId,
          dueAt: payload.dueDate as string | undefined,
        });
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
        }
        break;
      case 'contact.note':
        createNote({
          content: payload.note as string || '',
          targetContactId: contactId,
          authorContactId: CONTACT_ZERO.id,
        });
        break;
      case 'interaction.log':
        createInteraction({
          contactId,
          authorContactId: CONTACT_ZERO.id,
          type: 'other',
          summary: payload.summary as string || '',
        });
        break;
      case 'want.create': {
        const newWant = createWant({
          title: payload.title as string || 'Untitled Want',
          reason: payload.reason as string || '',
          deadline: payload.deadline as string | undefined,
          status: (payload.status as WantStatus) || 'not_started',
          primaryContactId: payload.primaryContactId as string | undefined,
          metricTypes: payload.metricTypes as string[] | undefined,
        });
        createScopeForWant(newWant.id);
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
        }
        break;
      case 'want.addStep':
        if (payload.wantId) {
          addStep(payload.wantId as string, {
            title: payload.title as string || 'Untitled Step',
            deadline: payload.deadline as string | undefined,
          });
        }
        break;
      case 'want.addMetricType':
        if (payload.wantId && payload.metricName) {
          addMetricType(payload.wantId as string, payload.metricName as string);
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
        }
        break;
      case 'want.logIteration':
        if (payload.wantId && payload.feedback) {
          logIteration(payload.wantId as string, payload.feedback as string);
        }
        break;
      case 'want.attachContact':
        if (payload.wantId && payload.primaryContactId) {
          const directnessCheck = payload.directnessCheck as WantDirectness | undefined;
          attachPrimaryContact(
            payload.wantId as string,
            payload.primaryContactId as string,
            directnessCheck
          );
        }
        break;
      case 'want.detachContact':
        if (payload.wantId) {
          detachPrimaryContact(payload.wantId as string);
        }
        break;
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
        }
        break;
      case 'scope.addDoctrineNote':
        if (payload.wantId && payload.note) {
          addDoctrineNote(payload.wantId as string, payload.note as string);
        }
        break;
    }
  };

  // Initialize messages
  useEffect(() => {
    const initialMessage = createInitialLittleLordMessage(tenantId, userId, context);
    setMessages([initialMessage]);

    const suggestedPrompt = context?.suggestedPrompt as string | undefined;
    if (suggestedPrompt) {
      setInput(suggestedPrompt);
    } else {
      setInput('');
    }
  }, [tenantId, userId, context?.selectedContactId, context?.suggestedPrompt, context?.wantCreation]);

  // Auto-scroll
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

    try {
      const response = await runLittleLord(trimmed, context);

      const assistantMessage: LittleLordMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages([...nextMessages, assistantMessage]);

      // Handle guardrails
      if (response.guardrail && response.guardrail.blocked) {
        if (response.guardrail.kind === 'disrespect') {
          setRespectViolation(response.guardrail);
          setRespectAcknowledged(false);
          return;
        }
        return;
      }

      // Handle validation
      if (response.validation) {
        if (!response.validation.isValidWant && response.event?.type === 'want.create') {
          const payload = response.event.payload;
          createRejectedShould({
            title: payload.title as string || 'Rejected Should',
            reason: payload.reason as string || '',
            rejectionReason: response.validation.reason,
          });
          return;
        }
      }

      // Handle directness check
      if (response.directnessCheck) {
        if (!response.directnessCheck.isDirect && response.event?.type === 'want.attachContact') {
          return;
        }
      }

      // Dispatch event
      if (response.event) {
        dispatchEventToStore(response.event);
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

  // Respect gate handlers
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

  const isRespectGateActive = respectViolation !== null && !respectAcknowledged;
  const displayName = getLittleLordDisplayName();

  return (
    <>
      {/* Inject styles */}
      <style>{fullscreenStyles}</style>

      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col overflow-hidden"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#0A0A0A] to-black z-0 pointer-events-none" />

        {/* Header */}
        <div className="relative z-20 shrink-0 px-6 py-4 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
              <Crown size={20} className="text-[#4433FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{displayName}</h2>
              <p className="text-xs text-gray-500">Immersive Mode</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
              title="Exit fullscreen"
            >
              <Minimize2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-gray-400 hover:text-red-400"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Orb - positioned in upper portion */}
          <div className="absolute top-0 left-0 right-0 h-[60%] flex items-center justify-center pointer-events-auto z-10">
            <div className="w-full h-full max-w-[500px] max-h-[500px]">
              <LittleLordOrbView state={spiritState} />
            </div>
          </div>

          {/* Messages - below orb with fade mask */}
          <div
            ref={chatScrollRef}
            className="absolute bottom-0 left-0 right-0 h-[35%] overflow-y-auto ll-message-fade-mask z-20 pointer-events-auto px-4 pb-4"
          >
            <div className="max-w-2xl mx-auto space-y-4 pt-8">
              {messages.map((message, index) => (
                <MotionDiv
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      message.role === 'assistant'
                        ? 'bg-[#4433FF]/30 border border-[#4433FF]/50'
                        : 'bg-white/10'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <Crown size={14} className="text-[#4433FF]" />
                    ) : (
                      <User size={14} className="text-gray-400" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={`inline-block px-4 py-3 rounded-2xl text-sm max-w-[85%] backdrop-blur-md ${
                        message.role === 'assistant'
                          ? 'bg-white/5 border border-white/10 text-gray-200 text-left'
                          : 'bg-[#4433FF]/80 text-white'
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
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-[#4433FF]/30 border border-[#4433FF]/50 flex items-center justify-center">
                    <Crown size={14} className="text-[#4433FF]" />
                  </div>
                  <div className="flex-1">
                    <div className="inline-block px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 size={14} className="animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                </MotionDiv>
              )}
            </div>
          </div>
        </div>

        {/* Respect Gate Banner */}
        {isRespectGateActive && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-30 p-4 border-t border-red-500/50 bg-red-500/10 shrink-0"
          >
            <div className="max-w-2xl mx-auto flex items-start gap-3">
              <div className="p-2 bg-red-500/20 rounded-full shrink-0">
                <ShieldAlert size={20} className="text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-red-400 mb-1">
                  Guardrail Triggered: Disrespect Detected
                </h4>
                <p className="text-xs text-red-300/80 mb-3">
                  {respectViolation?.message || 'Disrespectful content detected.'}
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Type <span className="text-red-400 font-mono">AGREE</span> to continue:
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

        {/* Input area */}
        <div className={`relative z-30 shrink-0 p-4 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/5 ${isRespectGateActive ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#4433FF] to-[#6655FF] rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur" />

              <div className="relative flex items-center gap-3 bg-[#1A1A1A]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Speak to LL..."
                  rows={1}
                  disabled={isRespectGateActive}
                  className="flex-1 bg-transparent text-white px-3 py-2 focus:outline-none placeholder-gray-500 text-sm resize-none disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim() || isRespectGateActive}
                  className="p-3 bg-[#4433FF] text-white rounded-xl hover:bg-[#5544FF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 text-center">
              Press Enter to send
            </p>
          </div>
        </div>
      </MotionDiv>
    </>
  );
};

export default LittleLordFullscreenChat;
