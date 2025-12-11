import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Shield,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import {
  IntakeMetrics,
  IntakeSession,
  FrameAxis,
  FrameFlag,
  FlagSeverity,
  FrameType,
  IntakeTier,
  AnalysisIntegrity,
} from '../../types/businessFrame';
import { getSeverityColor, getAxisLabel, isAnalysisComplete } from '../../services/frameAnalysisStore';
import { Button } from '../Button';

const MotionDiv = motion.div as any;

interface IntakeResultsProps {
  metrics: IntakeMetrics;
  session: IntakeSession;
  onContinue?: () => void; // Continue to next tier
  onFinish?: () => void; // Save & return later
  onEnterDashboard?: () => void; // Enter FrameLord (go to dashboard)
  onChooseAnotherModule?: () => void; // For Tier 2: choose another module
}

// Integrity indicator helper
const getIntegrityInfo = (integrity: AnalysisIntegrity): { label: string; color: string; bgColor: string } => {
  switch (integrity) {
    case 'live':
      return {
        label: 'Live analysis active',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
      };
    case 'partial':
      return {
        label: 'Partial analysis (some axes placeholder)',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10 border-amber-500/30',
      };
    case 'placeholder':
    default:
      return {
        label: 'Placeholder values (engine not configured)',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30',
      };
  }
};

export const IntakeResults: React.FC<IntakeResultsProps> = ({
  metrics,
  session,
  onContinue,
  onFinish,
  onEnterDashboard,
  onChooseAnotherModule,
}) => {
  const [expandedFlags, setExpandedFlags] = useState<Set<FrameFlag>>(new Set());

  const toggleFlag = (flagCode: FrameFlag) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(flagCode)) {
      newExpanded.delete(flagCode);
    } else {
      newExpanded.add(flagCode);
    }
    setExpandedFlags(newExpanded);
  };

  // Check if this is a Tier 2 session
  const isTier2 = session.tier === IntakeTier.TIER_2;

  // Check if analysis is complete (non-zero scores)
  const analysisComplete = isAnalysisComplete(metrics);

  // Frame Type Display
  const getFrameTypeColor = (type: FrameType): string => {
    switch (type) {
      case 'power':
        return 'text-emerald-400';
      case 'analyst':
        return 'text-blue-400';
      case 'supplicant':
        return 'text-orange-400';
      case 'mixed':
        return 'text-amber-400';
      default:
        return 'text-fl-gray';
    }
  };

  const getFrameTypeLabel = (type: FrameType): string => {
    return type.charAt(0).toUpperCase() + type.slice(1) + ' Frame';
  };

  // Score Color
  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Severity Icon
  const getSeverityIcon = (severity: FlagSeverity) => {
    switch (severity) {
      case FlagSeverity.CRITICAL:
        return <AlertTriangle size={16} className="text-red-500" />;
      case FlagSeverity.WARN:
        return <AlertTriangle size={16} className="text-amber-500" />;
      case FlagSeverity.INFO:
        return <Info size={16} className="text-blue-500" />;
      default:
        return <Info size={16} className="text-fl-gray" />;
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <MotionDiv
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl font-display font-bold text-white mb-2">
            Assessment Complete
          </h2>
          <p className="text-fl-text">
            {isTier2
              ? 'Your module responses have been recorded.'
              : 'Your frame analysis is ready. Review your results below.'}
          </p>
        </MotionDiv>
      </div>

      {/* Tier 2: Blueprint Module Results */}
      {isTier2 && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Scoring Placeholder Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
            <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold text-amber-400 mb-2">
              Scoring Engine in Development
            </h3>
            <p className="text-fl-text text-sm max-w-lg mx-auto">
              Your answers are saved and will be re-analyzed when scoring is implemented for this module.
            </p>
          </div>

          {/* Case Call Recommendation */}
          <div className="bg-fl-primary/10 border border-fl-primary/30 rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-fl-primary/20 rounded-full flex items-center justify-center mx-auto">
              <Shield size={32} className="text-fl-primary" />
            </div>
            <h3 className="text-xl font-display font-bold text-white">
              Ready for Expert Analysis?
            </h3>
            <p className="text-fl-text text-sm max-w-lg mx-auto">
              Your Blueprint responses reveal patterns that benefit from direct expert review. A <span className="text-fl-primary font-medium">Case Call</span> gives you personalized frame strategy based on your specific situation.
            </p>
            <p className="text-fl-gray text-xs">
              45-minute deep-dive session with frame analysis and actionable recommendations.
            </p>
          </div>
        </MotionDiv>
      )}

      {/* Analysis Incomplete Warning (Tier 1 only) */}
      {!isTier2 && !analysisComplete && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center"
        >
          <AlertTriangle size={48} className="text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-display font-bold text-amber-400 mb-3">
            Analysis Incomplete
          </h3>
          <p className="text-fl-text max-w-lg mx-auto">
            Unable to compute frame metrics. Please provide more detailed answers to complete the analysis.
          </p>
        </MotionDiv>
      )}

      {/* Frame Score Overview (Tier 1 only, when analysis is complete) */}
      {!isTier2 && analysisComplete && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-fl-navy/30 border border-fl-primary/20 rounded-xl p-8"
        >
          {/* Analysis Integrity Indicator */}
          {metrics.analysisIntegrity && (
            <div className="flex justify-center mb-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${getIntegrityInfo(metrics.analysisIntegrity).bgColor}`}>
                <div className={`w-2 h-2 rounded-full ${metrics.analysisIntegrity === 'live' ? 'bg-emerald-400' : metrics.analysisIntegrity === 'partial' ? 'bg-amber-400' : 'bg-red-400'}`} />
                <span className={getIntegrityInfo(metrics.analysisIntegrity).color}>
                  {getIntegrityInfo(metrics.analysisIntegrity).label}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Overall Score */}
            <div className="flex flex-col items-center justify-center text-center">
              <span className="text-fl-gray text-xs uppercase tracking-wider mb-3">
                Overall Frame Score
              </span>
              <div className={`text-7xl font-display font-bold ${getScoreColor(metrics.overallFrameScore)}`}>
                {metrics.overallFrameScore}
              </div>
              <div className="mt-4 text-sm text-fl-text">
                {metrics.overallFrameScore >= 70
                  ? 'Strong authority signals detected'
                  : metrics.overallFrameScore >= 40
                  ? 'Room for improvement identified'
                  : 'Critical frame weaknesses present'}
              </div>
            </div>

            {/* Frame Type */}
            <div className="flex flex-col items-center justify-center text-center border-l border-fl-gray/20">
              <span className="text-fl-gray text-xs uppercase tracking-wider mb-3">
                Frame Classification
              </span>
              <div className={`text-3xl font-display font-bold ${getFrameTypeColor(metrics.frameType)}`}>
                {getFrameTypeLabel(metrics.frameType)}
              </div>
              <div className="mt-4 text-sm text-fl-text max-w-xs">
                {metrics.frameType === 'power' && 'You operate from high status and command authority'}
                {metrics.frameType === 'analyst' && 'You lead with data and neutral positioning'}
                {metrics.frameType === 'supplicant' && 'You operate from low status, seeking permission'}
                {metrics.frameType === 'mixed' && 'Your frame shifts between patterns inconsistently'}
              </div>
            </div>
          </div>

          {/* Self-Rating vs System Analysis Gauge (Apex Frame) */}
          {metrics.selfRatedFrameScore !== undefined && (
            <div className="mt-8 pt-6 border-t border-fl-gray/20">
              <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
                {/* Self-rated Frame */}
                <div className="text-center">
                  <span className="text-fl-gray text-xs uppercase tracking-wider block mb-2">
                    Self-Rated Frame
                  </span>
                  <div className="text-4xl font-display font-bold text-fl-primary">
                    {metrics.selfRatedFrameScore}
                  </div>
                  <span className="text-fl-gray/50 text-xs">/ 10</span>
                </div>

                {/* System Analysis */}
                <div className="text-center border-l border-fl-gray/20">
                  <span className="text-fl-gray text-xs uppercase tracking-wider block mb-2">
                    System Analysis
                  </span>
                  <div className={`text-4xl font-display font-bold ${getScoreColor(metrics.overallFrameScore)}`}>
                    {(metrics.overallFrameScore / 10).toFixed(1)}
                  </div>
                  <span className="text-fl-gray/50 text-xs">/ 10</span>
                </div>
              </div>

              {/* Comparison insight */}
              <div className="text-center mt-4">
                <p className="text-xs text-fl-gray/70">
                  {metrics.selfRatedFrameScore > (metrics.overallFrameScore / 10)
                    ? 'Your self-assessment is higher than the system reading. Blind spots may exist.'
                    : metrics.selfRatedFrameScore < (metrics.overallFrameScore / 10)
                    ? 'You underestimate yourself. The system sees more strength than you claim.'
                    : 'Your self-assessment aligns with the system analysis.'}
                </p>
              </div>
            </div>
          )}
        </MotionDiv>
      )}

      {/* Axis Breakdown (Tier 1 only, when analysis is complete) */}
      {!isTier2 && analysisComplete && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-fl-black/40 border border-fl-gray/20 rounded-xl p-6"
        >
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <Shield size={20} className="text-fl-primary" />
            Axis Breakdown
          </h3>

          <div className="space-y-4">
            {Object.entries(metrics.axisScores).map(([axisId, score], idx) => {
              const axis = axisId as FrameAxis;
              const label = getAxisLabel(score);

              return (
                <MotionDiv
                  key={axis}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="bg-fl-navy/20 border border-fl-primary/10 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white uppercase tracking-wide">
                      {axis.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-fl-gray uppercase">{label}</span>
                      <span className={`text-lg font-bold font-mono ${getScoreColor(score)}`}>
                        {score}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 bg-fl-navy rounded-full overflow-hidden">
                    <MotionDiv
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.6 + idx * 0.05 }}
                      className={`h-full ${
                        score >= 70
                          ? 'bg-green-500'
                          : score >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                </MotionDiv>
              );
            })}
          </div>
        </MotionDiv>
      )}

      {/* Active Flags (Tier 1 only, when analysis is complete) */}
      {!isTier2 && analysisComplete && metrics.activeFlags.length > 0 && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-fl-black/40 border border-fl-gray/20 rounded-xl p-6"
        >
          <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-500" />
            Active Flags ({metrics.activeFlags.length})
          </h3>

          <div className="space-y-3">
            {metrics.activeFlags.map((flag, idx) => (
              <MotionDiv
                key={flag.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + idx * 0.05 }}
                className="border rounded-lg overflow-hidden"
                style={{ borderColor: getSeverityColor(flag.severity) }}
              >
                <button
                  onClick={() => toggleFlag(flag.code)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-fl-navy/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(flag.severity)}
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">
                        {flag.code.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-fl-gray">
                        Confidence: {Math.round(flag.confidence * 100)}%
                      </div>
                    </div>
                  </div>

                  {expandedFlags.has(flag.code) ? (
                    <ChevronUp size={18} className="text-fl-gray" />
                  ) : (
                    <ChevronDown size={18} className="text-fl-gray" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedFlags.has(flag.code) && (
                    <MotionDiv
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-4 pb-4 border-t"
                      style={{ borderColor: getSeverityColor(flag.severity) }}
                    >
                      <div className="pt-3 text-sm text-fl-text space-y-2">
                        <p className="font-medium">Evidence:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          {flag.evidence.map((answerId) => (
                            <li key={answerId}>Answer ID: {answerId}</li>
                          ))}
                        </ul>
                      </div>
                    </MotionDiv>
                  )}
                </AnimatePresence>
              </MotionDiv>
            ))}
          </div>
        </MotionDiv>
      )}

      {/* Access Granted Summary (Tier 1 only) */}
      {!isTier2 && analysisComplete && (
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-fl-navy/20 border border-fl-primary/10 rounded-xl p-6 text-center space-y-4"
        >
          <h3 className="text-lg font-display font-bold text-white">
            Your Baseline Is Locked In
          </h3>
          <p className="text-fl-text text-sm max-w-lg mx-auto">
            This intake establishes your frame profile baseline. FrameLord will now track your frame leaks and authority signals over time, giving you visibility into patterns you can't see yourself.
          </p>
          <p className="text-fl-gray text-xs">
            Want deeper diagnostics? The <span className="text-fl-primary font-medium">Apex Blueprint</span> test unlocks module-level analysis for Money, Authority, and Operations.
          </p>
        </MotionDiv>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 justify-center pt-8">
        {/* Tier 1 Primary: Enter FrameLord (go to dashboard) */}
        {!isTier2 && analysisComplete && (onEnterDashboard || onFinish) && (
          <Button
            onClick={onEnterDashboard || onFinish}
            glow
            className="group flex items-center gap-2"
          >
            Enter FrameLord
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        )}

        {/* Tier 1 Secondary: Take Blueprint Test (Tier 2) */}
        {onContinue && !isTier2 && analysisComplete && (
          <Button
            onClick={onContinue}
            variant="secondary"
            className="flex items-center gap-2"
          >
            Take Blueprint Test Now
            <ArrowRight size={16} />
          </Button>
        )}

        {/* Tier 1 Tertiary: Save & Return Later */}
        {onFinish && !isTier2 && analysisComplete && onEnterDashboard && (
          <Button
            onClick={onFinish}
            variant="outline"
            className="border-fl-gray/30 text-fl-gray hover:text-white hover:border-fl-gray"
          >
            Save & Return Later
          </Button>
        )}

        {/* Tier 2 Primary: Book a Case Call */}
        {isTier2 && (
          <Button
            onClick={() => window.open('https://calendly.com/framelord/case-call', '_blank')}
            glow
            className="group flex items-center gap-2"
          >
            Book a Case Call
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        )}

        {/* Tier 2 Secondary: Run Another Module */}
        {isTier2 && onChooseAnotherModule && (
          <Button
            onClick={onChooseAnotherModule}
            variant="secondary"
            className="flex items-center gap-2"
          >
            Run Another Module
          </Button>
        )}

        {/* Tier 2 Tertiary / Fallback: Return to Dashboard */}
        {onFinish && (isTier2 || !analysisComplete) && (
          <Button
            onClick={onFinish}
            variant="outline"
            className="border-fl-gray/30 text-fl-gray hover:text-white hover:border-fl-gray"
          >
            Return to Dashboard
          </Button>
        )}
      </div>
    </MotionDiv>
  );
};
