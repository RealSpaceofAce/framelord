import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import { IntakeTier, IntakeModule } from '../../types/businessFrame';

const MotionDiv = motion.div as any;

interface IntakeProgressProps {
  currentTier: IntakeTier;
  currentModule?: IntakeModule;
  currentQuestion: number;
  totalQuestions: number;
  completedTiers: IntakeTier[];
  estimatedTimeRemaining?: number; // in minutes
}

export const IntakeProgress: React.FC<IntakeProgressProps> = ({
  currentTier,
  currentModule,
  currentQuestion,
  totalQuestions,
  completedTiers,
  estimatedTimeRemaining,
}) => {
  const progressPercent = Math.round((currentQuestion / totalQuestions) * 100);

  // Module status indicators
  const modules: { id: IntakeModule; label: string }[] = [
    { id: IntakeModule.MONEY, label: 'Money' },
    { id: IntakeModule.AUTHORITY, label: 'Authority' },
    { id: IntakeModule.OPERATIONS, label: 'Operations' },
  ];

  const isModuleActive = (module: IntakeModule) => {
    return currentTier === 2 && currentModule === module;
  };

  const isModuleCompleted = (module: IntakeModule) => {
    // This would need actual session data to determine
    // For now, simplified logic
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-fl-text font-medium">Overall Progress</span>
          <span className="text-fl-primary font-mono font-bold">{progressPercent}%</span>
        </div>

        <div className="h-2 bg-fl-navy/50 rounded-full overflow-hidden border border-fl-primary/20">
          <MotionDiv
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-fl-primary to-fl-accent"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-fl-gray">
          <span>
            Question {currentQuestion} of {totalQuestions}
          </span>
          {estimatedTimeRemaining !== undefined && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              ~{estimatedTimeRemaining} min remaining
            </span>
          )}
        </div>
      </div>

      {/* Tier Indicators */}
      <div className="space-y-3">
        {/* Tier 1 */}
        <div className="flex items-center gap-3">
          {completedTiers.includes(1) ? (
            <CheckCircle size={18} className="text-green-500 shrink-0" />
          ) : currentTier === 1 ? (
            <div className="w-4 h-4 rounded-full border-2 border-fl-primary animate-pulse shrink-0" />
          ) : (
            <Circle size={18} className="text-fl-gray/30 shrink-0" />
          )}

          <div className="flex-grow">
            <div className="text-sm font-medium text-white">Tier 1: First-Access Gate</div>
            <div className="text-xs text-fl-gray">Foundation assessment</div>
          </div>

          {currentTier === 1 && (
            <div className="px-2 py-1 bg-fl-primary/20 border border-fl-primary/50 rounded text-xs text-fl-primary font-bold">
              ACTIVE
            </div>
          )}
          {completedTiers.includes(1) && (
            <div className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400 font-bold">
              COMPLETE
            </div>
          )}
        </div>

        {/* Tier 2 - Only show if Tier 1 completed or active */}
        {(completedTiers.includes(1) || currentTier === 2) && (
          <div className="pl-3 border-l-2 border-fl-gray/20 space-y-2">
            <div className="flex items-center gap-3">
              {completedTiers.includes(2) ? (
                <CheckCircle size={18} className="text-green-500 shrink-0" />
              ) : currentTier === 2 ? (
                <div className="w-4 h-4 rounded-full border-2 border-fl-primary animate-pulse shrink-0" />
              ) : (
                <Circle size={18} className="text-fl-gray/30 shrink-0" />
              )}

              <div className="flex-grow">
                <div className="text-sm font-medium text-white">Tier 2: Apex Blueprint</div>
                <div className="text-xs text-fl-gray">Deep-dive modules</div>
              </div>

              {currentTier === 2 && (
                <div className="px-2 py-1 bg-fl-primary/20 border border-fl-primary/50 rounded text-xs text-fl-primary font-bold">
                  ACTIVE
                </div>
              )}
            </div>

            {/* Module Sub-indicators */}
            {currentTier === 2 && (
              <div className="pl-6 space-y-1.5">
                {modules.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    {isModuleCompleted(module.id) ? (
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                    ) : isModuleActive(module.id) ? (
                      <div className="w-3 h-3 rounded-full border-2 border-fl-accent animate-pulse shrink-0" />
                    ) : (
                      <Circle size={14} className="text-fl-gray/30 shrink-0" />
                    )}
                    <span
                      className={
                        isModuleActive(module.id)
                          ? 'text-fl-accent font-medium'
                          : isModuleCompleted(module.id)
                          ? 'text-green-400'
                          : 'text-fl-gray'
                      }
                    >
                      {module.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
