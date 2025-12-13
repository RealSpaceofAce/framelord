// =============================================================================
// PERSONALITY AND TESTS CARD — Displays psychometric profiles
// =============================================================================
// Shows Big Five, MBTI, DISC, and Dark Trait profiles for a contact.
// Data is pulled from the psychometricStore.
// =============================================================================

import React, { useMemo } from 'react';
import {
  Brain,
  Lock,
  ChevronRight,
  User,
  Target,
  AlertTriangle,
  Info,
} from 'lucide-react';

// Stores
import { getContactById } from '@/services/contactStore';
import { psychometricStore } from '@/services/psychometricStore';

// Plan Config
import {
  type PlanTier,
  type FeatureKey,
  canUseFeature,
  getRequiredPlan,
  PLAN_NAMES,
  LOCKED_FEATURE_TEASERS,
} from '@/config/planConfig';

// Types
interface PersonalityAndTestsCardProps {
  contactId: string;
  plan?: PlanTier;
  onExpandClick?: () => void;
}

/**
 * Locked Feature Overlay
 */
const LockedOverlay: React.FC<{
  featureKey: FeatureKey;
  currentPlan: PlanTier;
}> = ({ featureKey, currentPlan }) => {
  const hasAccess = canUseFeature(currentPlan, featureKey);

  if (hasAccess) return null;

  const requiredPlan = getRequiredPlan(featureKey);
  const teaser = LOCKED_FEATURE_TEASERS[featureKey];

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
      <div className="text-center px-4">
        <Lock size={20} className="mx-auto mb-2 text-gray-500" />
        {teaser ? (
          <>
            <p className="text-sm font-medium text-gray-300 mb-1">{teaser.title}</p>
            <p className="text-[10px] text-gray-500 max-w-[180px] mx-auto mb-2">{teaser.description}</p>
          </>
        ) : null}
        <p className="text-[10px] text-[#4433FF] uppercase tracking-wider">
          {PLAN_NAMES[requiredPlan]} required
        </p>
      </div>
    </div>
  );
};

/**
 * Big Five Trait Bar
 */
const TraitBar: React.FC<{
  label: string;
  value: number;
  lowLabel: string;
  highLabel: string;
}> = ({ label, value, lowLabel, highLabel }) => {
  const percentage = Math.round(value * 100);
  const barColor = percentage >= 60 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 font-medium">{label}</span>
        <span className="text-[10px] text-gray-500">{percentage}%</span>
      </div>
      <div className="relative h-1.5 bg-[#1b2c45] rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-[8px] text-gray-600">{lowLabel}</span>
        <span className="text-[8px] text-gray-600">{highLabel}</span>
      </div>
    </div>
  );
};

/**
 * MBTI Type Display
 */
const MBTIDisplay: React.FC<{ type: string; confidence: string }> = ({ type, confidence }) => {
  // Map confidence level to percentage
  const confidenceToPercent = (conf: string): number => {
    switch (conf) {
      case 'confirmed': return 95;
      case 'high': return 80;
      case 'medium': return 60;
      case 'low': return 40;
      default: return 20;
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-[#0a111d] rounded-lg border border-[#112035]">
      <div className="flex items-center gap-2">
        <User size={12} className="text-purple-400" />
        <span className="text-[10px] text-gray-500 uppercase">MBTI Type</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-white">{type}</span>
        <span className="text-[9px] text-gray-500">({confidenceToPercent(confidence)}%)</span>
      </div>
    </div>
  );
};

/**
 * DISC Profile Display
 */
const DISCDisplay: React.FC<{
  type: string;
  confidence: string;
}> = ({ type, confidence }) => {
  const typeColors: Record<string, string> = {
    D: 'text-red-400',
    I: 'text-yellow-400',
    S: 'text-green-400',
    C: 'text-blue-400',
    DI: 'text-orange-400',
    ID: 'text-orange-400',
    SC: 'text-teal-400',
    CS: 'text-teal-400',
  };

  const typeDescriptions: Record<string, string> = {
    D: 'Dominance - Direct, decisive',
    I: 'Influence - Outgoing, enthusiastic',
    S: 'Steadiness - Patient, reliable',
    C: 'Conscientiousness - Analytical',
    DI: 'Dominant-Influential',
    ID: 'Influential-Dominant',
    SC: 'Steady-Conscientious',
    CS: 'Conscientious-Steady',
  };

  return (
    <div className="p-2 bg-[#0a111d] rounded-lg border border-[#112035]">
      <div className="flex items-center gap-2 mb-2">
        <Target size={12} className="text-cyan-400" />
        <span className="text-[10px] text-gray-500 uppercase">DISC Profile</span>
      </div>
      <div className="text-center py-2">
        <div className={`text-2xl font-bold ${typeColors[type] || 'text-gray-400'}`}>
          {type}
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          {typeDescriptions[type] || 'Unknown type'}
        </p>
        <span className="text-[9px] text-gray-600">
          Confidence: {confidence}
        </span>
      </div>
    </div>
  );
};

/**
 * Personality And Tests Card Component
 */
export const PersonalityAndTestsCard: React.FC<PersonalityAndTestsCardProps> = ({
  contactId,
  plan = 'ultra_beta',
  onExpandClick,
}) => {
  const contact = getContactById(contactId);
  const profile = psychometricStore.getProfile(contactId);

  // Determine what data is available
  const hasBigFive = profile?.bigFive && Object.keys(profile.bigFive).length > 0;
  const hasMBTI = profile?.mbti?.primaryType;
  const hasDISC = profile?.disc?.type;
  const hasDarkTraits = profile?.darkTraits && Object.keys(profile.darkTraits).length > 0;

  const hasAnyData = hasBigFive || hasMBTI || hasDISC || hasDarkTraits;

  if (!contact) {
    return (
      <div className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
      <LockedOverlay featureKey="personality_tests_card" currentPlan={plan} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-purple-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Personality</span>
        </div>
        {onExpandClick && (
          <button
            onClick={onExpandClick}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            Details <ChevronRight size={14} />
          </button>
        )}
      </div>

      {!hasAnyData ? (
        <div className="text-center py-6">
          <Brain size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-sm text-gray-500">No personality data yet</p>
          <p className="text-[10px] text-gray-600 mt-1">
            Profile will be inferred from interactions
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Big Five Summary */}
          {hasBigFive && profile?.bigFive && (
            <div className="p-2 bg-[#0a111d] rounded-lg border border-[#112035]">
              <div className="flex items-center gap-2 mb-2">
                <Info size={12} className="text-blue-400" />
                <span className="text-[10px] text-gray-500 uppercase">Big Five</span>
              </div>
              <TraitBar
                label="Openness"
                value={profile.bigFive.openness || 0}
                lowLabel="Practical"
                highLabel="Creative"
              />
              <TraitBar
                label="Conscientiousness"
                value={profile.bigFive.conscientiousness || 0}
                lowLabel="Flexible"
                highLabel="Organized"
              />
              <TraitBar
                label="Extraversion"
                value={profile.bigFive.extraversion || 0}
                lowLabel="Reserved"
                highLabel="Outgoing"
              />
              <TraitBar
                label="Agreeableness"
                value={profile.bigFive.agreeableness || 0}
                lowLabel="Challenging"
                highLabel="Cooperative"
              />
              <TraitBar
                label="Neuroticism"
                value={profile.bigFive.neuroticism || 0}
                lowLabel="Stable"
                highLabel="Sensitive"
              />
            </div>
          )}

          {/* MBTI */}
          {hasMBTI && profile?.mbti && (
            <MBTIDisplay
              type={profile.mbti.primaryType || 'Unknown'}
              confidence={profile.mbti.confidence || 'insufficient'}
            />
          )}

          {/* DISC */}
          {hasDISC && profile?.disc && profile.disc.type && (
            <DISCDisplay
              type={profile.disc.type}
              confidence={profile.disc.confidence || 'insufficient'}
            />
          )}

          {/* Dark Traits Warning */}
          {hasDarkTraits && profile?.darkTraits && (
            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-red-400" />
                <span className="text-[10px] text-red-400 uppercase font-medium">Dark Traits Detected</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Some concerning patterns observed. View details for more information.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PersonalityAndTestsCard;
