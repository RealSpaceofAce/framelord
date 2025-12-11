import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Target } from 'lucide-react';
import { QuestionDefinition, IntakeTier, IntakeModule } from '../../types/businessFrame';

const MotionDiv = motion.div as any;

interface QuestionCardProps {
  question: QuestionDefinition;
  questionNumber: number;
  totalQuestions: number;
  tier: IntakeTier;
  module?: IntakeModule;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  tier,
  module,
}) => {
  const isTier2 = tier === 2;

  // Get tier/module badge styling
  const getBadgeStyles = () => {
    if (isTier2 && module) {
      switch (module) {
        case IntakeModule.MONEY:
          return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
        case IntakeModule.AUTHORITY:
          return 'bg-amber-500/20 border-amber-500/50 text-amber-400';
        case IntakeModule.OPERATIONS:
          return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
        default:
          return 'bg-fl-primary/20 border-fl-primary/50 text-fl-primary';
      }
    }
    return 'bg-fl-primary/20 border-fl-primary/50 text-fl-primary';
  };

  // Get module display name
  const getModuleName = () => {
    if (!module) return '';
    return module.charAt(0).toUpperCase() + module.slice(1);
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Tier/Module Badge */}
          <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${getBadgeStyles()}`}>
            {isTier2 && module ? `Tier 2: ${getModuleName()}` : 'Tier 1: Gateway'}
          </div>

          {/* Question Counter */}
          <div className="text-xs font-mono text-fl-gray">
            Question {questionNumber} of {totalQuestions}
          </div>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="bg-fl-navy/30 border border-fl-primary/20 rounded-lg p-8 relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-fl-primary/10 to-transparent" />

        <div className="relative z-10">
          <p className="text-white text-lg md:text-xl font-medium leading-relaxed">
            {question.prompt}
          </p>
        </div>
      </div>

      {/* What This Reveals Section */}
      {question.targetAxes && question.targetAxes.length > 0 && (
        <MotionDiv
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 0.2 }}
          className="bg-fl-black/40 border border-fl-gray/20 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Target size={16} className="text-fl-accent mt-0.5 shrink-0" />
            <div className="flex-grow">
              <h4 className="text-sm font-bold text-fl-accent uppercase tracking-wide mb-2">
                What This Reveals
              </h4>
              <div className="flex flex-wrap gap-2">
                {question.targetAxes.map((axis) => (
                  <span
                    key={axis}
                    className="text-xs px-2 py-1 bg-fl-primary/10 border border-fl-primary/30 rounded text-fl-primary font-medium"
                  >
                    {axis.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Helper Hint (Collapsed by default, can expand) */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer text-xs text-fl-gray hover:text-fl-primary transition-colors">
          <HelpCircle size={14} />
          <span>Need help? Click for guidance</span>
        </summary>
        <MotionDiv
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-4 bg-fl-navy/20 border border-fl-primary/20 rounded-lg text-sm text-fl-text leading-relaxed"
        >
          <p>
            <span className="font-bold text-fl-primary">How to answer:</span> Be specific and honest.
            Avoid generalizations. Include actual phrases you use or situations you've encountered.
            The analysis is most accurate when you provide real examples from your communication.
          </p>
        </MotionDiv>
      </details>
    </MotionDiv>
  );
};
