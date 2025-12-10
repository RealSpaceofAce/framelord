// =============================================================================
// LITTLE LORD PROVIDER — Global state management for Little Lord
// =============================================================================
// Provides global access to Little Lord invocation throughout the app.
// Manages modal state, keyboard shortcuts, and contextual payload gathering.
// =============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { LittleLordGlobalModal } from './LittleLordGlobalModal';
import { LittleLordFloatingButton } from './LittleLordFloatingButton';
import type { LittleLordContext, LittleLordInvocationSource } from '../../services/littleLord/types';
import { CONTACT_ZERO } from '../../services/contactStore';
import { getLittleLordShortcut } from '../../lib/settings/userSettings';
import { loadLittleLord } from '@/lib/agents/loadLittleLord';
import { runLittleLord as runLittleLordCore, type LittleLordRunOutput } from '@/lib/agents/runLittleLord';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface LittleLordSpec {
  name: string;
  version: string;
  model: string;
  corpus: { path: string; format: string; delimiter: string; retrieval: any };
  identity: { role: string; tone: string; behavior: string[] };
  doctrine: { source: string; use: string[]; no_output: string[] };
  inputs: any;
  outputs: any;
  event_protocol: any;
  reasoning_rules: any;
  safety: { forbidden: string[]; allowed: string[] };
}

interface LittleLordData {
  spec: LittleLordSpec;
  corpus: string;
}

interface LittleLordContextType {
  /** Open Little Lord with optional context */
  open: (source: LittleLordInvocationSource, context?: LittleLordContext) => void;
  /** Close Little Lord */
  close: () => void;
  /** Whether Little Lord is currently open */
  isOpen: boolean;
  /** Current context */
  currentContext?: LittleLordContext;
  /** Little Lord spec and corpus data */
  littleLord: LittleLordData;
  /** Run Little Lord with a message and context */
  runLittleLord: (message: string, context?: LittleLordContext) => Promise<LittleLordRunOutput>;
}

const LittleLordContext = createContext<LittleLordContextType | undefined>(undefined);

// =============================================================================
// PROVIDER PROPS
// =============================================================================

export interface LittleLordProviderProps {
  children: React.ReactNode;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** User ID (usually Contact Zero ID) */
  userId: string;
  /** Whether to show the floating button */
  showFloatingButton?: boolean;
  /** Current view ID for context-aware behavior */
  currentViewId?: LittleLordContext['viewId'];
  /** Currently selected contact ID */
  selectedContactId?: string | null;
  /** Optional callback when Little Lord is invoked */
  onInvoke?: (source: LittleLordInvocationSource, context?: LittleLordContext) => void;
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export const LittleLordProvider: React.FC<LittleLordProviderProps> = ({
  children,
  tenantId,
  userId,
  showFloatingButton = true,
  currentViewId,
  selectedContactId,
  onInvoke,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState<LittleLordContext | undefined>();
  const [invocationSource, setInvocationSource] = useState<LittleLordInvocationSource>('global_command');

  // Initialize Little Lord spec and corpus
  const { spec, corpus } = loadLittleLord();
  const littleLord: LittleLordData = { spec: spec as LittleLordSpec, corpus };

  const open = useCallback(
    (source: LittleLordInvocationSource, context?: LittleLordContext) => {
      // Merge provider-level context with invocation-specific context
      const mergedContext: LittleLordContext = {
        viewId: currentViewId,
        selectedContactId: selectedContactId ?? undefined,
        ...context,
      };
      setInvocationSource(source);
      setCurrentContext(mergedContext);
      setIsOpen(true);
      onInvoke?.(source, mergedContext);
    },
    [onInvoke, currentViewId, selectedContactId]
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Run Little Lord with a message
  const runLittleLord = useCallback(
    async (message: string, context?: LittleLordContext): Promise<LittleLordRunOutput> => {
      return runLittleLordCore({
        message,
        context,
        spec: littleLord.spec as any,
        corpus: littleLord.corpus,
      });
    },
    [littleLord]
  );

  // Handle keyboard shortcut (Cmd/Ctrl + K, then LL)
  useEffect(() => {
    let cmdKPressed = false;
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        cmdKPressed = true;

        // Reset after 2 seconds if second key not pressed
        timeout = setTimeout(() => {
          cmdKPressed = false;
        }, 2000);
        return;
      }

      // If Cmd+K was just pressed, check for "LL"
      if (cmdKPressed) {
        if (e.key.toLowerCase() === 'l') {
          clearTimeout(timeout);
          // Wait for second 'L'
          const secondKeyHandler = (e2: KeyboardEvent) => {
            if (e2.key.toLowerCase() === 'l') {
              open('keyboard_shortcut');
              window.removeEventListener('keydown', secondKeyHandler);
            }
            cmdKPressed = false;
          };
          window.addEventListener('keydown', secondKeyHandler, { once: true });
          setTimeout(() => {
            window.removeEventListener('keydown', secondKeyHandler);
            cmdKPressed = false;
          }, 1000);
        } else {
          cmdKPressed = false;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [open]);

  // Handle dedicated Little Lord keyboard shortcut (configurable, default: Cmd+L)
  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      // Get current user preference
      const pref = getLittleLordShortcut();

      // Skip if disabled
      if (!pref.enabled) return;

      // Check if we're in an input field where shortcuts might be disruptive
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow shortcut even in inputs for Little Lord (user can disable if conflicts)
      // This matches the spec requirement: "deliberately allow the shortcut even inside inputs if that is acceptable"

      // Check modifier + key match
      const modifierMatches =
        (pref.modifier === 'meta' && e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) ||
        (pref.modifier === 'ctrl' && e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) ||
        (pref.modifier === 'alt' && e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) ||
        (pref.modifier === 'shift' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey);

      const keyMatches = e.key.toLowerCase() === pref.key.toLowerCase();

      if (modifierMatches && keyMatches) {
        e.preventDefault();
        open('keyboard_shortcut');
      }
    };

    window.addEventListener('keydown', handleGlobalShortcut);
    return () => {
      window.removeEventListener('keydown', handleGlobalShortcut);
    };
  }, [open]);

  const value: LittleLordContextType = {
    open,
    close,
    isOpen,
    currentContext,
    littleLord,
    runLittleLord,
  };

  return (
    <LittleLordContext.Provider value={value}>
      {children}

      {/* Floating Button */}
      {showFloatingButton && !isOpen && (
        <LittleLordFloatingButton onClick={() => open('floating_button')} />
      )}

      {/* Global Modal */}
      <LittleLordGlobalModal
        isOpen={isOpen}
        onClose={close}
        tenantId={tenantId}
        userId={userId}
        context={currentContext}
      />
    </LittleLordContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access Little Lord from anywhere in the app.
 *
 * @example
 * const littleLord = useLittleLord();
 * littleLord.open('notes_panel', { selectedContactId: 'c_123' });
 */
export function useLittleLord(): LittleLordContextType {
  const context = useContext(LittleLordContext);
  if (!context) {
    throw new Error('useLittleLord must be used within LittleLordProvider');
  }
  return context;
}
