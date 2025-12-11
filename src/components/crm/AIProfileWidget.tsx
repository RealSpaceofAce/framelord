// =============================================================================
// AI PROFILE WIDGET — Big Five, MBTI, DISC, and Dark Trait profile visualization
// =============================================================================
// Displays speculative personality and behavioral risk profiles for a contact.
// Shows horizontal bars for Big Five traits with confidence indicator.
// Shows MBTI type inference status.
// Shows DISC behavioral style inference status.
// Shows dark trait behavioral risk assessment.
// Prompts user to add more notes if insufficient data.
// =============================================================================

import React, { useEffect, useState } from 'react';
import { Brain, AlertCircle, FileText, Fingerprint, Target, ShieldAlert } from 'lucide-react';
import { updateBigFiveProfileForContact } from '@/lib/psychometricBigFiveClient';
import { updateMbtiProfileForContact } from '@/lib/psychometricMbtiClient';
import { updateDiscProfileForContact } from '@/lib/psychometricDiscClient';
import { updateDarkTraitProfileForContact } from '@/lib/psychometricDarkTraitClient';
import { psychometricStore } from '@/services/psychometricStore';
import type { PsychometricProfile, BigFiveScores } from '@/types/psychometrics';

interface AIProfileWidgetProps {
  contactId: string;
  contactName: string;
}

/**
 * Display labels for Big Five traits.
 */
const TRAIT_LABELS: Record<keyof Omit<BigFiveScores, 'confidence'>, { name: string; lowLabel: string; highLabel: string }> = {
  openness: { name: 'Openness', lowLabel: 'Practical', highLabel: 'Curious' },
  conscientiousness: { name: 'Conscientiousness', lowLabel: 'Flexible', highLabel: 'Organized' },
  extraversion: { name: 'Extraversion', lowLabel: 'Reserved', highLabel: 'Outgoing' },
  agreeableness: { name: 'Agreeableness', lowLabel: 'Challenging', highLabel: 'Cooperative' },
  neuroticism: { name: 'Neuroticism', lowLabel: 'Stable', highLabel: 'Sensitive' },
};

/**
 * TraitBar component - displays a single Big Five trait as a horizontal bar.
 */
const TraitBar: React.FC<{
  trait: keyof Omit<BigFiveScores, 'confidence'>;
  value: number;
  labels: { name: string; lowLabel: string; highLabel: string };
}> = ({ trait, value, labels }) => {
  // Convert 0-1 to percentage
  const percentage = Math.round(value * 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-[#6b92b9]">{labels.lowLabel}</span>
        <span className="text-white font-medium">{labels.name}</span>
        <span className="text-[#6b92b9]">{labels.highLabel}</span>
      </div>
      <div className="h-2 bg-[#0d1627] rounded-full overflow-hidden border border-[#1f2f45]">
        <div
          className="h-full bg-gradient-to-r from-[#34f5ff] to-[#7a5dff] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * AIProfileWidget - Displays Big Five profile for a contact.
 */
export const AIProfileWidget: React.FC<AIProfileWidgetProps> = ({
  contactId,
  contactName,
}) => {
  const [profile, setProfile] = useState<PsychometricProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evidenceCount, setEvidenceCount] = useState(0);

  // Load/update profile when contactId changes
  useEffect(() => {
    if (!contactId || contactId === 'contact_zero') {
      setIsLoading(false);
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        // Update all four profiles (they share the same evidence pool)
        await updateBigFiveProfileForContact(contactId);
        await updateMbtiProfileForContact(contactId);
        await updateDiscProfileForContact(contactId);
        await updateDarkTraitProfileForContact(contactId);

        // Get the combined profile from store
        const updatedProfile = psychometricStore.getProfile(contactId);
        setProfile(updatedProfile);
        setEvidenceCount(psychometricStore.getEvidenceCount(contactId));
      } catch (error) {
        console.error('Failed to load AI profile:', error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [contactId]);

  // Don't show for Contact Zero
  if (contactId === 'contact_zero') {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-[#8beaff]" />
          <div className="h-4 w-24 bg-[#1f2f45] rounded" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-6 bg-[#1f2f45] rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Insufficient data state
  if (!profile || profile.status === 'insufficient_data') {
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-[#8beaff]" />
          <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
            AI Profile
          </h3>
        </div>

        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle size={32} className="text-[#6b92b9] mb-3" />
          <p className="text-sm text-white mb-2">Big Five profile: still building.</p>
          <p className="text-sm text-white mb-2">MBTI-style profile: still building.</p>
          <p className="text-sm text-white mb-2">DISC-style profile: still building.</p>
          <p className="text-sm text-white mb-2">Dark trait risk profile: still building.</p>
          <p className="text-xs text-[#6b92b9] max-w-[240px]">
            Add more notes or FrameScans about {contactName} to give the AI more context for personality inference.
          </p>
        </div>
      </div>
    );
  }

  // Profile display (speculative or confirmed)
  const { bigFive } = profile;
  const traits: Array<keyof Omit<BigFiveScores, 'confidence'>> = [
    'openness',
    'conscientiousness',
    'extraversion',
    'agreeableness',
    'neuroticism',
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Brain size={16} className="text-[#8beaff]" />
        <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">
          AI Profile
        </h3>
        <span className="text-[11px] text-[#7fa6d1] ml-auto flex items-center gap-1">
          <FileText size={10} />
          {evidenceCount} source{evidenceCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Big Five Trait Bars */}
      <div className="space-y-4">
        {traits.map((trait) => (
          <TraitBar
            key={trait}
            trait={trait}
            value={bigFive[trait]}
            labels={TRAIT_LABELS[trait]}
          />
        ))}
      </div>

      {/* Big Five Status/Confidence Footer */}
      <div className="mt-4 pt-3 border-t border-[#1f2f45]">
        <p className="text-[10px] text-[#6b92b9]">
          {profile.status === 'speculative' ? (
            <>
              <span className="text-amber-400">Speculative</span>
              {' '}• confidence: {bigFive.confidence}
            </>
          ) : profile.status === 'confirmed' ? (
            <>
              <span className="text-emerald-400">Confirmed</span>
              {' '}• validated profile
            </>
          ) : null}
        </p>
      </div>

      {/* MBTI Section */}
      <div className="mt-6 pt-4 border-t border-[#1f2f45]">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint size={14} className="text-[#8beaff]" />
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">
            MBTI-Style Type
          </h4>
        </div>

        {!profile.mbti ? (
          <p className="text-xs text-[#6b92b9]">MBTI-style profile: not inferred yet.</p>
        ) : (
          <div className="space-y-2">
            {/* Primary Type */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Primary type:</span>
              <span className="text-sm font-mono text-white">
                {profile.mbti.primaryType ?? 'Unknown'}
              </span>
              {profile.mbti.primaryType && (
                <span className="text-[9px] text-amber-400">(speculative)</span>
              )}
            </div>

            {/* Candidate Types */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Candidates:</span>
              <span className="text-xs font-mono text-[#7fa6d1]">
                {profile.mbti.candidateTypes.length > 0
                  ? profile.mbti.candidateTypes.join(', ')
                  : 'none yet'}
              </span>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Confidence:</span>
              <span className="text-[10px] text-[#7fa6d1]">
                {profile.mbti.confidence}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* DISC Section */}
      <div className="mt-6 pt-4 border-t border-[#1f2f45]">
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-[#8beaff]" />
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">
            DISC-Style Type
          </h4>
        </div>

        {!profile.disc ? (
          <p className="text-xs text-[#6b92b9]">DISC-style profile: not inferred yet.</p>
        ) : (
          <div className="space-y-2">
            {/* Type */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Type:</span>
              <span className="text-sm font-mono text-white">
                {profile.disc.type ?? 'Unknown'}
              </span>
              {profile.disc.type && (
                <span className="text-[9px] text-amber-400">(speculative)</span>
              )}
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Confidence:</span>
              <span className="text-[10px] text-[#7fa6d1]">
                {profile.disc.confidence}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dark Trait Risk Section */}
      <div className="mt-6 pt-4 border-t border-[#1f2f45]">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={14} className="text-[#8beaff]" />
          <h4 className="text-[10px] font-bold text-white uppercase tracking-[0.15em]">
            Behavioral Risk Signals
          </h4>
        </div>

        {!profile.darkTraits ? (
          <p className="text-xs text-[#6b92b9]">Dark trait risk profile: not inferred yet.</p>
        ) : (
          <div className="space-y-2">
            {/* Overall Risk */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Overall risk:</span>
              <span className={`text-sm font-mono ${
                profile.darkTraits.overallRisk === 'high' ? 'text-red-400' :
                profile.darkTraits.overallRisk === 'medium' ? 'text-amber-400' :
                profile.darkTraits.overallRisk === 'low' ? 'text-emerald-400' :
                'text-[#7fa6d1]'
              }`}>
                {profile.darkTraits.overallRisk}
              </span>
              {profile.darkTraits.overallRisk !== 'insufficient' && (
                <span className="text-[9px] text-amber-400">(speculative)</span>
              )}
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#6b92b9]">Confidence:</span>
              <span className="text-[10px] text-[#7fa6d1]">
                {profile.darkTraits.confidence}
              </span>
            </div>

            {/* Signal Breakdown */}
            <div className="mt-3 pt-2 border-t border-[#1f2f45]/50 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#6b92b9]">Narcissism signals:</span>
                <span className="text-[10px] font-mono text-[#7fa6d1]">
                  {Math.round(profile.darkTraits.narcissism * 100)} / 100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#6b92b9]">Manipulation signals:</span>
                <span className="text-[10px] font-mono text-[#7fa6d1]">
                  {Math.round(profile.darkTraits.machiavellianism * 100)} / 100
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#6b92b9]">Callousness signals:</span>
                <span className="text-[10px] font-mono text-[#7fa6d1]">
                  {Math.round(profile.darkTraits.psychopathy * 100)} / 100
                </span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="mt-3 pt-2 border-t border-[#1f2f45]/50">
              <p className="text-[9px] text-[#6b92b9] italic">
                All scores are speculative and based on notes and FrameScans you have added.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
