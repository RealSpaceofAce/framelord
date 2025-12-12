// =============================================================================
// PERSONAL INTEL CARD — Intelligence summary for a contact
// =============================================================================
// Displays key intel about a contact:
// - How do they speak / what triggers them
// - What do they want
// - What is their weakness
// - What was the last notable thing that happened
// =============================================================================

import React, { useMemo } from 'react';
import {
  Eye,
  Target,
  AlertTriangle,
  History,
  Brain,
  Lock,
  ChevronRight,
} from 'lucide-react';

// Stores
import { getContactById } from '@/services/contactStore';
import { getInteractionsByContactId } from '@/services/interactionStore';
import { getNotesByContactId } from '@/services/noteStore';
import { getReportsForContact } from '@/services/frameScanReportStore';
import { psychometricStore } from '@/services/psychometricStore';

// Types
interface PersonalIntelCardProps {
  contactId: string;
  tier?: 'free' | 'basic' | 'pro' | 'elite';
  onExpandClick?: () => void;
}

// User tier for gating
type UserTier = 'free' | 'basic' | 'pro' | 'elite';

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
 * Personal Intel Card Component
 */
export const PersonalIntelCard: React.FC<PersonalIntelCardProps> = ({
  contactId,
  tier = 'pro',
  onExpandClick,
}) => {
  const contact = getContactById(contactId);
  const profile = psychometricStore.getProfile(contactId);

  // Get recent interactions for "last notable thing"
  const interactions = useMemo(() => {
    return getInteractionsByContactId(contactId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 3);
  }, [contactId]);

  // Get notes for context
  const notes = useMemo(() => {
    return getNotesByContactId(contactId).slice(0, 3);
  }, [contactId]);

  // Get FrameScan reports
  const reports = useMemo(() => {
    return getReportsForContact(contactId).slice(0, 3);
  }, [contactId]);

  if (!contact) {
    return (
      <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  // Derive intel from available data
  const communicationStyle = profile?.bigFive ? (
    profile.bigFive.extraversion > 0.6 ? 'Direct and energetic communicator' :
    profile.bigFive.extraversion < 0.4 ? 'Reserved, prefers written communication' :
    'Balanced communication style'
  ) : null;

  const potentialTriggers = profile?.bigFive ? (
    profile.bigFive.neuroticism > 0.6 ? 'May be sensitive to criticism or pressure' :
    profile.bigFive.agreeableness < 0.4 ? 'May push back on soft approaches' :
    null
  ) : null;

  const lastNotable = interactions[0];

  return (
    <div className="relative bg-[#0c1424]/80 border border-[#1b2c45] rounded-xl p-4">
      <LockedOverlay requiredTier="pro" currentTier={tier} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Personal Intel</span>
        </div>
        {onExpandClick && (
          <button
            onClick={onExpandClick}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            Expand <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Intel Sections */}
      <div className="space-y-3">
        {/* Communication Style */}
        <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
          <div className="flex items-center gap-2 mb-1.5">
            <Eye size={12} className="text-blue-400" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase">How they speak</span>
          </div>
          <p className="text-sm text-white">
            {communicationStyle || 'Not enough data yet'}
          </p>
        </div>

        {/* Triggers/Sensitivities */}
        {potentialTriggers && (
          <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={12} className="text-yellow-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Watch for</span>
            </div>
            <p className="text-sm text-white">{potentialTriggers}</p>
          </div>
        )}

        {/* What they want (from contact tags/notes) */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
            <div className="flex items-center gap-2 mb-1.5">
              <Target size={12} className="text-green-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Tagged interests</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.slice(0, 5).map(tag => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-[#1b2c45] rounded text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Last Notable Interaction */}
        {lastNotable && (
          <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
            <div className="flex items-center gap-2 mb-1.5">
              <History size={12} className="text-cyan-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Last notable</span>
            </div>
            <p className="text-sm text-white line-clamp-2">{lastNotable.summary}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {new Date(lastNotable.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!communicationStyle && !potentialTriggers && (!contact.tags || contact.tags.length === 0) && !lastNotable && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No intel gathered yet</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Add notes and interactions to build intelligence
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalIntelCard;
