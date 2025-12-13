// =============================================================================
// CALL ANALYZER CARD — AI analysis of call transcripts
// =============================================================================
// Shows AI-powered analysis of call recordings and transcripts.
// Displays frame dynamics, talking points, and key insights.
// =============================================================================

import React, { useMemo } from 'react';
import {
  Phone,
  Lock,
  ChevronRight,
  Mic,
  BarChart3,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Upload,
} from 'lucide-react';

// Stores
import { getContactById } from '@/services/contactStore';
import { getInteractionsByContactId } from '@/services/interactionStore';

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
interface CallAnalyzerCardProps {
  contactId: string;
  plan?: PlanTier;
  onExpandClick?: () => void;
  onUploadCall?: () => void;
}

interface CallAnalysis {
  id: string;
  date: string;
  duration: number;
  frameScore: number;
  keyInsights: string[];
  talkingPointsSuggested: string[];
  warnings: string[];
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
 * Format duration in minutes and seconds
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Call Analysis Summary
 */
const CallAnalysisSummary: React.FC<{ analysis: CallAnalysis }> = ({ analysis }) => {
  const scoreColor =
    analysis.frameScore >= 70 ? 'text-green-400' :
    analysis.frameScore >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-3 bg-[#0a111d] rounded-lg border border-[#112035]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Phone size={12} className="text-green-400" />
          <span className="text-xs text-white">
            {new Date(analysis.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500 flex items-center gap-1">
            <Clock size={10} />
            {formatDuration(analysis.duration)}
          </span>
          <span className={`text-sm font-bold ${scoreColor}`}>
            {analysis.frameScore}
          </span>
        </div>
      </div>

      {/* Key Insights */}
      {analysis.keyInsights.length > 0 && (
        <div className="mb-2">
          <p className="text-[9px] text-gray-500 uppercase mb-1">Key Insights</p>
          <div className="space-y-1">
            {analysis.keyInsights.slice(0, 2).map((insight, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 size={10} className="text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-gray-300">{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div>
          <p className="text-[9px] text-gray-500 uppercase mb-1">Watch For</p>
          <div className="space-y-1">
            {analysis.warnings.slice(0, 2).map((warning, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle size={10} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-gray-300">{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Call Analyzer Card Component
 */
export const CallAnalyzerCard: React.FC<CallAnalyzerCardProps> = ({
  contactId,
  plan = 'enterprise_beta',
  onExpandClick,
  onUploadCall,
}) => {
  const contact = getContactById(contactId);
  const interactions = getInteractionsByContactId(contactId);

  // Get call interactions
  const callInteractions = useMemo(() => {
    return interactions
      .filter(i => i.type === 'call')
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 3);
  }, [interactions]);

  // Mock call analyses (in real implementation, this would come from AI analysis)
  const mockAnalyses: CallAnalysis[] = useMemo(() => {
    return callInteractions.map(call => ({
      id: call.id,
      date: call.occurredAt,
      duration: Math.floor(Math.random() * 1800) + 300, // 5-35 min
      frameScore: Math.floor(Math.random() * 40) + 50, // 50-90
      keyInsights: [
        'Maintained frame during price discussion',
        'Good use of silence after key points',
      ],
      talkingPointsSuggested: [
        'Follow up on Q4 projections',
        'Schedule implementation timeline review',
      ],
      warnings: [
        'Consider being more direct on next steps',
      ],
    }));
  }, [callInteractions]);

  if (!contact) {
    return (
      <div className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
        <p className="text-sm text-gray-500">Contact not found</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4">
      <LockedOverlay featureKey="call_analyzer_card" currentPlan={plan} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Mic size={14} className="text-red-400" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Call Analyzer</span>
        </div>
        {onExpandClick && (
          <button
            onClick={onExpandClick}
            className="text-xs text-[#4433FF] hover:text-white flex items-center gap-1"
          >
            All Calls <ChevronRight size={14} />
          </button>
        )}
      </div>

      {mockAnalyses.length === 0 ? (
        <div className="text-center py-6">
          <Phone size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-sm text-gray-500">No calls analyzed yet</p>
          <p className="text-[10px] text-gray-600 mt-1 mb-3">
            Upload a call recording to get AI analysis
          </p>
          {onUploadCall && (
            <button
              onClick={onUploadCall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4433FF] border border-[#4433FF]/30 rounded-lg hover:bg-[#4433FF]/10 transition-colors"
            >
              <Upload size={12} />
              Upload Call
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary Stats */}
          <div className="flex items-center justify-between p-2 bg-[#0a111d] rounded-lg border border-[#112035]">
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-white">{mockAnalyses.length}</div>
              <p className="text-[9px] text-gray-500 uppercase">Calls</p>
            </div>
            <div className="text-center flex-1 border-l border-[#1b2c45]">
              <div className="text-lg font-bold text-green-400">
                {Math.round(
                  mockAnalyses.reduce((sum, a) => sum + a.frameScore, 0) / mockAnalyses.length
                )}
              </div>
              <p className="text-[9px] text-gray-500 uppercase">Avg Score</p>
            </div>
          </div>

          {/* Recent Call Analysis */}
          {mockAnalyses.slice(0, 1).map(analysis => (
            <CallAnalysisSummary key={analysis.id} analysis={analysis} />
          ))}

          {/* Suggested Talking Points */}
          <div className="pt-2 border-t border-[#1b2c45]">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={12} className="text-cyan-400" />
              <span className="text-[9px] font-semibold text-gray-500 uppercase">Next Call Prep</span>
            </div>
            <ul className="space-y-1">
              {mockAnalyses[0]?.talkingPointsSuggested.slice(0, 2).map((point, i) => (
                <li key={i} className="text-[10px] text-gray-400 flex items-start gap-1.5">
                  <span className="text-[#4433FF]">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallAnalyzerCard;
