// =============================================================================
// NEXT MOVE CARD — AI-powered action suggestions for a contact
// =============================================================================
// Shows AI-generated recommendations for what to do next with this contact:
// - Suggested actions based on history
// - Talking points based on recent interactions
// - Follow-up reminders
// =============================================================================

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Lock,
  RefreshCw,
  MessageSquare,
  Phone,
  Calendar,
  Gift,
  AlertCircle,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

// Stores
import { getContactById } from '@/services/contactStore';
import { getInteractionsByContactId } from '@/services/interactionStore';
import { getOpenTasksByContactId } from '@/services/taskStore';
import { getNotesByContactId } from '@/services/noteStore';
import { getReportsForContact } from '@/services/frameScanReportStore';
import { psychometricStore } from '@/services/psychometricStore';

// Types
interface NextMoveCardProps {
  contactId: string;
  tier?: 'free' | 'basic' | 'pro' | 'elite';
  onCreateTask?: (title: string) => void;
  onLogInteraction?: () => void;
}

type UserTier = 'free' | 'basic' | 'pro' | 'elite';

interface SuggestedAction {
  id: string;
  type: 'call' | 'message' | 'meeting' | 'follow_up' | 'gift' | 'check_in';
  title: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Locked Feature Overlay
 */
const LockedOverlay: React.FC<{ requiredTier: UserTier; currentTier: UserTier }> = ({
  requiredTier,
  currentTier
}) => {
  const tierLevels: Record<UserTier, number> = { free: 0, basic: 1, pro: 2, elite: 3 };
  const isLocked = tierLevels[currentTier] < tierLevels[requiredTier];

  if (!isLocked) return null;

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="text-center">
        <Lock size={20} className="mx-auto mb-2 text-gray-500" />
        <p className="text-xs text-gray-400 uppercase tracking-wider">{requiredTier}+ required</p>
      </div>
    </div>
  );
};

/**
 * Get action icon based on type
 */
const getActionIcon = (type: SuggestedAction['type']) => {
  switch (type) {
    case 'call': return <Phone size={14} className="text-green-400" />;
    case 'message': return <MessageSquare size={14} className="text-blue-400" />;
    case 'meeting': return <Calendar size={14} className="text-purple-400" />;
    case 'follow_up': return <ArrowRight size={14} className="text-yellow-400" />;
    case 'gift': return <Gift size={14} className="text-pink-400" />;
    case 'check_in': return <MessageSquare size={14} className="text-cyan-400" />;
    default: return <Lightbulb size={14} className="text-gray-400" />;
  }
};

/**
 * Generate suggested actions based on contact data
 */
const generateSuggestions = (
  contactId: string,
  interactions: ReturnType<typeof getInteractionsByContactId>,
  openTasks: ReturnType<typeof getOpenTasksByContactId>,
  notes: ReturnType<typeof getNotesByContactId>
): SuggestedAction[] => {
  const suggestions: SuggestedAction[] = [];
  const now = new Date();

  // Check last interaction date
  const lastInteraction = interactions
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];

  if (lastInteraction) {
    const daysSinceContact = Math.floor(
      (now.getTime() - new Date(lastInteraction.occurredAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceContact > 30) {
      suggestions.push({
        id: 'check_in_overdue',
        type: 'check_in',
        title: 'Check in',
        reason: `It's been ${daysSinceContact} days since you last connected`,
        priority: 'high',
      });
    } else if (daysSinceContact > 14) {
      suggestions.push({
        id: 'check_in_due',
        type: 'check_in',
        title: 'Schedule a catch-up',
        reason: `Been ${daysSinceContact} days since last contact`,
        priority: 'medium',
      });
    }
  } else {
    // No interactions yet
    suggestions.push({
      id: 'first_contact',
      type: 'call',
      title: 'Make first contact',
      reason: 'No interactions logged yet',
      priority: 'high',
    });
  }

  // Check for overdue tasks
  const overdueTasks = openTasks.filter(t => {
    if (!t.dueAt) return false;
    return new Date(t.dueAt) < now;
  });

  if (overdueTasks.length > 0) {
    suggestions.push({
      id: 'overdue_tasks',
      type: 'follow_up',
      title: 'Address overdue tasks',
      reason: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`,
      priority: 'high',
    });
  }

  // If they had a recent call, suggest follow-up
  const recentCalls = interactions.filter(i => {
    if (i.type !== 'call') return false;
    const daysSince = Math.floor(
      (now.getTime() - new Date(i.occurredAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 7;
  });

  if (recentCalls.length > 0 && suggestions.length < 3) {
    suggestions.push({
      id: 'follow_up_call',
      type: 'follow_up',
      title: 'Send follow-up',
      reason: 'Recent call may benefit from a recap email',
      priority: 'low',
    });
  }

  return suggestions.slice(0, 3);
};

/**
 * Next Move Card Component
 */
export const NextMoveCard: React.FC<NextMoveCardProps> = ({
  contactId,
  tier = 'pro',
  onCreateTask,
  onLogInteraction,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const contact = getContactById(contactId);

  // Get data for suggestions
  const interactions = useMemo(() => {
    return getInteractionsByContactId(contactId);
  }, [contactId]);

  const openTasks = useMemo(() => {
    return getOpenTasksByContactId(contactId);
  }, [contactId]);

  const notes = useMemo(() => {
    return getNotesByContactId(contactId);
  }, [contactId]);

  // Generate AI suggestions
  const suggestions = useMemo(() => {
    return generateSuggestions(contactId, interactions, openTasks, notes);
  }, [contactId, interactions, openTasks, notes]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh (in real implementation, this would call AI service)
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!contact) {
    return (
      <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
      <LockedOverlay requiredTier="elite" currentTier={tier} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[#4433FF]" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Move AI</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`p-1.5 rounded-lg border border-[#1b2c45] hover:bg-[#1b2c45] transition-colors ${
            isRefreshing ? 'opacity-50' : ''
          }`}
        >
          <RefreshCw size={12} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map(suggestion => (
            <div
              key={suggestion.id}
              className="p-3 bg-[#0a111d] rounded-lg border border-[#112035] hover:border-[#4433FF]/50 transition-colors cursor-pointer group"
              onClick={() => {
                if (suggestion.type === 'follow_up' && onCreateTask) {
                  onCreateTask(suggestion.title);
                } else if (onLogInteraction) {
                  onLogInteraction();
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  suggestion.priority === 'high' ? 'bg-red-500/20' :
                  suggestion.priority === 'medium' ? 'bg-yellow-500/20' :
                  'bg-gray-500/20'
                }`}>
                  {getActionIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white font-medium group-hover:text-[#4433FF] transition-colors">
                      {suggestion.title}
                    </p>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-[#4433FF] transition-colors" />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{suggestion.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
            <Sparkles size={20} className="text-green-400" />
          </div>
          <p className="text-sm text-gray-400">All caught up!</p>
          <p className="text-[10px] text-gray-500 mt-1">No immediate actions needed</p>
        </div>
      )}

      {/* Talking Points Section (future enhancement) */}
      <div className="mt-4 pt-4 border-t border-[#1b2c45]">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare size={12} className="text-gray-500" />
          <span className="text-[9px] font-semibold text-gray-500 uppercase">Talking Points</span>
        </div>
        <p className="text-xs text-gray-500 italic">
          Coming soon: AI-generated conversation starters based on recent activity
        </p>
      </div>
    </div>
  );
};

export default NextMoveCard;
