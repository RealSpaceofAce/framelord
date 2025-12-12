// =============================================================================
// AI FEEDBACK WIDGET — Reusable component for capturing user feedback on AI outputs
// =============================================================================
// Drop this component anywhere AI content is shown to capture thumbs up/down.
// It automatically wires to the aiMemoryStore feedback system.
//
// Usage:
//   <AIFeedbackWidget memoryId={report.memoryId} contactId={contactId} system="framescan" />
//
// The memoryId links feedback to a specific AI memory record.
// If memoryId is null, feedback is still captured but not linked to a specific memory.
// =============================================================================

import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { addFeedback } from '../../services/aiMemoryStore';
import type { AISystemId, AIFeedbackKind } from '../../types/aiMemory';

// =============================================================================
// TYPES
// =============================================================================

export interface AIFeedbackWidgetProps {
  /** The memory record ID this feedback is about (null if not linked) */
  memoryId: string | null;
  /** The contact context for this feedback */
  contactId: string | null;
  /** Which AI system produced this output */
  system: AISystemId;
  /** Optional callback when feedback is submitted */
  onFeedback?: (kind: AIFeedbackKind, rating: number | null) => void;
  /** Compact mode (icons only, no labels) */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AIFeedbackWidget({
  memoryId,
  contactId,
  system,
  onFeedback,
  compact = false,
  className = '',
}: AIFeedbackWidgetProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const handleThumbsUp = useCallback(() => {
    if (submitted) return;

    addFeedback({
      memoryId,
      contactId,
      kind: 'thumbs_up',
      rating: 5,
      comment: null,
      source: { system, key: memoryId || 'unknown' },
    });

    setSubmitted('up');
    onFeedback?.('thumbs_up', 5);
  }, [submitted, memoryId, contactId, system, onFeedback]);

  const handleThumbsDown = useCallback(() => {
    if (submitted) return;

    addFeedback({
      memoryId,
      contactId,
      kind: 'thumbs_down',
      rating: 1,
      comment: null,
      source: { system, key: memoryId || 'unknown' },
    });

    setSubmitted('down');
    setShowComment(true);
    onFeedback?.('thumbs_down', 1);
  }, [submitted, memoryId, contactId, system, onFeedback]);

  const handleSubmitComment = useCallback(() => {
    if (!comment.trim()) return;

    addFeedback({
      memoryId,
      contactId,
      kind: 'comment',
      rating: null,
      comment: comment.trim(),
      source: { system, key: memoryId || 'unknown' },
    });

    setComment('');
    setShowComment(false);
    onFeedback?.('comment', null);
  }, [comment, memoryId, contactId, system, onFeedback]);

  // Already submitted - show thank you state
  if (submitted && !showComment) {
    return (
      <div className={`ai-feedback-widget ai-feedback-submitted ${className}`}>
        <span className="ai-feedback-thanks">
          {submitted === 'up' ? '👍 Thanks!' : '👎 Noted'}
        </span>
      </div>
    );
  }

  return (
    <div className={`ai-feedback-widget ${className}`}>
      <div className="ai-feedback-buttons">
        <button
          type="button"
          className={`ai-feedback-btn ${submitted === 'up' ? 'active' : ''}`}
          onClick={handleThumbsUp}
          disabled={submitted !== null}
          title="This was helpful"
        >
          <ThumbsUp size={compact ? 14 : 16} />
          {!compact && <span>Helpful</span>}
        </button>

        <button
          type="button"
          className={`ai-feedback-btn ${submitted === 'down' ? 'active' : ''}`}
          onClick={handleThumbsDown}
          disabled={submitted !== null}
          title="This needs improvement"
        >
          <ThumbsDown size={compact ? 14 : 16} />
          {!compact && <span>Not helpful</span>}
        </button>

        {!compact && (
          <button
            type="button"
            className="ai-feedback-btn"
            onClick={() => setShowComment(!showComment)}
            title="Add a comment"
          >
            <MessageSquare size={16} />
          </button>
        )}
      </div>

      {showComment && (
        <div className="ai-feedback-comment">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={submitted === 'down'
              ? "What could be improved?"
              : "Add your feedback..."
            }
            rows={2}
          />
          <button
            type="button"
            className="ai-feedback-submit"
            onClick={handleSubmitComment}
            disabled={!comment.trim()}
          >
            Submit
          </button>
        </div>
      )}

      <style>{`
        .ai-feedback-widget {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-feedback-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .ai-feedback-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 12px;
          transition: all 0.15s ease;
        }

        .ai-feedback-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .ai-feedback-btn.active {
          background: rgba(56, 189, 248, 0.2);
          color: rgb(56, 189, 248);
          border-color: rgb(56, 189, 248);
        }

        .ai-feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-feedback-thanks {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .ai-feedback-comment {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-feedback-comment textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          font-size: 13px;
          resize: vertical;
        }

        .ai-feedback-comment textarea:focus {
          outline: none;
          border-color: rgb(56, 189, 248);
        }

        .ai-feedback-submit {
          align-self: flex-end;
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          background: rgb(56, 189, 248);
          color: white;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .ai-feedback-submit:hover:not(:disabled) {
          background: rgb(14, 165, 233);
        }

        .ai-feedback-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default AIFeedbackWidget;
