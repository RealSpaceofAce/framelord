// =============================================================================
// PERSONAL INTEL CARD — Intelligence summary for a contact
// =============================================================================
// Displays key intel about a contact:
// - How do they speak / what triggers them
// - What do they want
// - What is their weakness
// - What was the last notable thing that happened
// Supports in-place editing of personal intel fields.
// =============================================================================

import React, { useMemo, useState } from 'react';
import {
  Eye,
  Target,
  AlertTriangle,
  History,
  Brain,
  Lock,
  ChevronRight,
  Edit2,
  Save,
  X,
  Sparkles,
} from 'lucide-react';

// Stores
import { getContactById, updatePersonalIntel, getPersonalIntel } from '@/services/contactStore';
import { getInteractionsByContactId, getLastNotableInteractionForContact } from '@/services/interactionStore';
import { getNotesByContactId } from '@/services/noteStore';
import { getReportsForContact } from '@/services/frameScanReportStore';
import { psychometricStore } from '@/services/psychometricStore';

// Types
interface PersonalIntelCardProps {
  contactId: string;
  tier?: 'free' | 'basic' | 'pro' | 'elite';
  onExpandClick?: () => void;
  onRefresh?: () => void;
  onNavigateToTimeline?: (interactionId?: string) => void;
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
 * Editable Intel Section
 */
const EditableIntelSection: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (value: string) => void;
}> = ({ icon, label, value, placeholder, isEditing, editValue, onEditValueChange }) => {
  return (
    <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold text-gray-400 uppercase">{label}</span>
      </div>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-transparent text-sm text-white placeholder-gray-600 border border-[#1b2c45] rounded px-2 py-1 focus:outline-none focus:border-[#4433FF] resize-none"
        />
      ) : (
        <p className="text-sm text-white">
          {value || <span className="text-gray-500 italic">{placeholder}</span>}
        </p>
      )}
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
  onRefresh,
  onNavigateToTimeline,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get fresh data on each render or when refreshKey changes
  const contact = useMemo(() => getContactById(contactId), [contactId, refreshKey]);
  const personalIntel = useMemo(() => getPersonalIntel(contactId), [contactId, refreshKey]);
  const profile = psychometricStore.getProfile(contactId);

  // Edit form state
  const [editHowTheySpeak, setEditHowTheySpeak] = useState(personalIntel?.howTheySpeak || '');
  const [editWatchFor, setEditWatchFor] = useState(personalIntel?.watchFor || '');

  // Get last notable interaction
  const lastNotable = useMemo(() => {
    return getLastNotableInteractionForContact(contactId);
  }, [contactId, refreshKey]);

  // Reset edit values when entering edit mode
  const handleStartEditing = () => {
    setEditHowTheySpeak(personalIntel?.howTheySpeak || '');
    setEditWatchFor(personalIntel?.watchFor || '');
    setIsEditing(true);
  };

  // Save changes
  const handleSave = () => {
    updatePersonalIntel(contactId, {
      howTheySpeak: editHowTheySpeak.trim() || undefined,
      watchFor: editWatchFor.trim() || undefined,
    });
    setIsEditing(false);
    setRefreshKey(k => k + 1);
    onRefresh?.();
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditHowTheySpeak(personalIntel?.howTheySpeak || '');
    setEditWatchFor(personalIntel?.watchFor || '');
  };

  if (!contact) {
    return (
      <div className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  // Derive intel from psychometric data if no manual intel
  const derivedCommunicationStyle = profile?.bigFive ? (
    profile.bigFive.extraversion > 0.6 ? 'Direct and energetic communicator' :
    profile.bigFive.extraversion < 0.4 ? 'Reserved, prefers written communication' :
    'Balanced communication style'
  ) : null;

  const derivedWatchFor = profile?.bigFive ? (
    profile.bigFive.neuroticism > 0.6 ? 'May be sensitive to criticism or pressure' :
    profile.bigFive.agreeableness < 0.4 ? 'May push back on soft approaches' :
    null
  ) : null;

  // Use manual intel if available, otherwise derived
  const howTheySpeak = personalIntel?.howTheySpeak || derivedCommunicationStyle || '';
  const watchFor = personalIntel?.watchFor || derivedWatchFor || '';

  const hasAnyData = howTheySpeak || watchFor || (contact.tags && contact.tags.length > 0) || lastNotable;

  return (
    <div className="relative bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
      <LockedOverlay requiredTier="pro" currentTier={tier} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Personal Intel</span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1b2c45] rounded transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleSave}
                className="p-1.5 text-green-400 hover:text-white hover:bg-green-500/20 rounded transition-colors"
                title="Save"
              >
                <Save size={14} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleStartEditing}
                className="p-1.5 text-gray-400 hover:text-[#4433FF] hover:bg-[#1b2c45] rounded transition-colors"
                title="Edit intel"
              >
                <Edit2 size={14} />
              </button>
              {onExpandClick && (
                <button
                  onClick={onExpandClick}
                  className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
                >
                  Expand <ChevronRight size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Intel Sections */}
      <div className="space-y-3">
        {/* Communication Style - Editable */}
        <EditableIntelSection
          icon={<Eye size={12} className="text-blue-400" />}
          label="How they speak"
          value={howTheySpeak}
          placeholder="Not enough data yet"
          isEditing={isEditing}
          editValue={editHowTheySpeak}
          onEditValueChange={setEditHowTheySpeak}
        />

        {/* Watch For - Editable */}
        {(watchFor || isEditing) && (
          <EditableIntelSection
            icon={<AlertTriangle size={12} className="text-yellow-400" />}
            label="Watch for"
            value={watchFor}
            placeholder="Triggers, sensitivities..."
            isEditing={isEditing}
            editValue={editWatchFor}
            onEditValueChange={setEditWatchFor}
          />
        )}

        {/* Tagged Interests (from contact tags) - Read only for now */}
        {contact.tags && contact.tags.length > 0 && !isEditing && (
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
        {lastNotable && !isEditing && (
          <div
            className="p-3 bg-[#0a111d] rounded-lg border border-[#112035] cursor-pointer hover:border-[#4433FF]/50 transition-colors"
            onClick={() => onNavigateToTimeline?.(lastNotable.id)}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <History size={12} className="text-cyan-400" />
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Last notable</span>
              {lastNotable.isNotable && (
                <span className="text-[8px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded uppercase">Notable</span>
              )}
            </div>
            <p className="text-sm text-white line-clamp-2">{lastNotable.summary}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {lastNotable.type} · {new Date(lastNotable.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!hasAnyData && !isEditing && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No intel gathered yet</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Click edit to add intelligence about this contact
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonalIntelCard;
