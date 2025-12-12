// =============================================================================
// USE AI FEEDBACK HOOK — Track implicit and explicit feedback on AI outputs
// =============================================================================
// This hook provides functions to easily track various types of user feedback
// on AI-generated content. It's designed to be used alongside AI output displays.
//
// Usage:
//   const { trackAction, trackCopy, trackDismiss } = useAIFeedback({
//     memoryId: report.memoryId,
//     contactId: contactId,
//     system: 'framescan',
//   });
//
//   // Later in your component:
//   <button onClick={trackAction}>Take Action</button>
//   <button onClick={trackDismiss}>Dismiss</button>
// =============================================================================

import { useCallback } from 'react';
import { addFeedback } from '../services/aiMemoryStore';
import type { AISystemId, AIFeedbackKind } from '../types/aiMemory';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAIFeedbackOptions {
  /** The memory record ID this feedback is about */
  memoryId: string | null;
  /** The contact context for this feedback */
  contactId: string | null;
  /** Which AI system produced this output */
  system: AISystemId;
  /** Optional callback when any feedback is tracked */
  onFeedback?: (kind: AIFeedbackKind) => void;
}

export interface UseAIFeedbackReturn {
  /** Track that the user took the suggested action */
  trackAction: () => void;
  /** Track that the user ignored the suggestion */
  trackIgnore: () => void;
  /** Track that the user asked for regeneration */
  trackRegenerate: () => void;
  /** Track that the user copied AI-generated text */
  trackCopy: () => void;
  /** Track that the user shared/exported AI content */
  trackShare: () => void;
  /** Track that the user dismissed the AI output */
  trackDismiss: () => void;
  /** Track that the user asked a follow-up question */
  trackFollowUp: () => void;
  /** Track that the user edited AI-generated content */
  trackEdit: (editedContent?: string) => void;
  /** Track that the user overrode AI output with their own */
  trackOverride: (userContent?: string) => void;
  /** Generic function to track any feedback kind */
  track: (kind: AIFeedbackKind, options?: { rating?: number; comment?: string }) => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAIFeedback({
  memoryId,
  contactId,
  system,
  onFeedback,
}: UseAIFeedbackOptions): UseAIFeedbackReturn {
  const track = useCallback(
    (kind: AIFeedbackKind, options?: { rating?: number; comment?: string }) => {
      addFeedback({
        memoryId,
        contactId,
        kind,
        rating: options?.rating ?? null,
        comment: options?.comment ?? null,
        source: { system, key: memoryId || 'unknown' },
      });
      onFeedback?.(kind);
    },
    [memoryId, contactId, system, onFeedback]
  );

  const trackAction = useCallback(() => {
    track('action_taken');
  }, [track]);

  const trackIgnore = useCallback(() => {
    track('action_ignored');
  }, [track]);

  const trackRegenerate = useCallback(() => {
    track('regenerate');
  }, [track]);

  const trackCopy = useCallback(() => {
    track('copied');
  }, [track]);

  const trackShare = useCallback(() => {
    track('shared');
  }, [track]);

  const trackDismiss = useCallback(() => {
    track('dismissed');
  }, [track]);

  const trackFollowUp = useCallback(() => {
    track('follow_up');
  }, [track]);

  const trackEdit = useCallback(
    (editedContent?: string) => {
      track('user_edit', { comment: editedContent });
    },
    [track]
  );

  const trackOverride = useCallback(
    (userContent?: string) => {
      track('user_override', { comment: userContent });
    },
    [track]
  );

  return {
    trackAction,
    trackIgnore,
    trackRegenerate,
    trackCopy,
    trackShare,
    trackDismiss,
    trackFollowUp,
    trackEdit,
    trackOverride,
    track,
  };
}

export default useAIFeedback;
