import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuestionCard } from './QuestionCard';
import { AnswerInput } from './AnswerInput';
import { IntakeProgress } from './IntakeProgress';
import { IntakeResults } from './IntakeResults';
import {
  IntakeTier,
  IntakeModule,
  IntakeMetrics,
  IntakeSession,
  QuestionDefinition,
} from '../../types/businessFrame';
import {
  startSession,
  recordAnswer,
  completeSession,
  updateAnswerAnalysis,
  updateSessionMetrics,
  getSessionById,
  storeIntakeProfileData,
  markTier1GateCompleted,
} from '../../services/intakeStore';
import { onIntakeCompleted, onTier2ModuleCompleted, onIntakeSessionCompleted } from '../../services/intakeNotificationService';
import { analyzeAnswer, computeSessionMetrics } from '../../services/frameAnalysisStore';
import { Loader2, Terminal, Info } from 'lucide-react';
import spec from '../../../docs/specs/business_frame_spec.json';
import { LittleLordOrbView, SpiritState } from '../littleLord/LittleLordOrbView';
import { ShinyText } from './ShinyText';
import { needsTier1Intake } from '../../lib/intakeGate';

const MotionDiv = motion.div as any;

// --- ACCESS GATE INTERSTITIAL COMPONENT ---

type GatePhase = 'analyzing' | 'granted';

interface Tier1AccessGateProps {
  onViewResults: () => void;
}

const Tier1AccessGate: React.FC<Tier1AccessGateProps> = ({ onViewResults }) => {
  const [phase, setPhase] = useState<GatePhase>('analyzing');

  useEffect(() => {
    // Show "Analyzing..." for 1.5 seconds, then switch to "granted" phase
    const timer = setTimeout(() => {
      setPhase('granted');
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <MotionDiv
      key="tier-1-access-gate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <AnimatePresence mode="wait">
        {phase === 'analyzing' && (
          <MotionDiv
            key="analyzing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Little Lord Orb in scanning mode */}
            <div className="w-[200px] h-[200px] relative">
              <LittleLordOrbView
                state={{ isThinking: true, isSpeaking: false, emotion: 'contemplative' }}
              />
            </div>

            {/* Analyzing text with shimmer effect */}
            <div className="space-y-4">
              <ShinyText
                text="Analyzing your intake..."
                speed={3}
                className="text-base md:text-lg"
              />

              {/* Scan bar animation */}
              <div className="w-64 h-1 bg-fl-navy/50 rounded-full overflow-hidden mx-auto">
                <MotionDiv
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                  className="w-1/2 h-full bg-gradient-to-r from-transparent via-fl-primary to-transparent"
                />
              </div>
            </div>
          </MotionDiv>
        )}

        {phase === 'granted' && (
          <MotionDiv
            key="granted"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col items-center gap-8"
          >
            {/* Success checkmark */}
            <MotionDiv
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-400"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </MotionDiv>

            {/* ACCESS GRANTED text */}
            <MotionDiv
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 150, damping: 12 }}
            >
              <h1 className="text-5xl md:text-7xl font-display font-bold text-emerald-400 tracking-wider">
                ACCESS GRANTED
              </h1>
            </MotionDiv>

            {/* Subtitle */}
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <p className="text-fl-text text-lg">
                Your frame baseline has been established.
              </p>
            </MotionDiv>

            {/* See your results button */}
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={onViewResults}
                className="px-8 py-4 bg-fl-primary hover:bg-fl-primary/80 text-white rounded-lg font-medium text-lg shadow-[0_0_25px_rgba(68,51,255,0.3)] hover:shadow-[0_0_40px_rgba(68,51,255,0.5)] transition-all"
              >
                See your results
              </button>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};

// --- MAIN INTAKE FLOW COMPONENT ---

interface IntakeFlowProps {
  contactId: string; // Usually Contact Zero ID for self-assessment
  initialTier?: IntakeTier;
  onComplete?: (metrics: IntakeMetrics) => void;
  onAbandon?: () => void;
  onEnterDashboard?: () => void; // Called when user clicks "Enter FrameLord" after intake
  onBookCaseCall?: () => void; // Called when user clicks "Book a Case Call" after Tier 2
}

type FlowState =
  | 'IDLE'
  | 'TIER_1_INTRO'
  | 'TIER_1_QUESTIONS'
  | 'TIER_1_ACCESS_GATE'   // NEW: Access gate interstitial
  | 'TIER_1_RESULTS'
  | 'TIER_2_INTRO'
  | 'TIER_2_MODULE_SELECT'
  | 'TIER_2_QUESTIONS'
  | 'TIER_2_RESULTS'
  | 'COMPLETE';

export const IntakeFlow: React.FC<IntakeFlowProps> = ({
  contactId,
  initialTier = IntakeTier.TIER_1,
  onComplete,
  onAbandon,
  onEnterDashboard,
  onBookCaseCall,
}) => {
  const [flowState, setFlowState] = useState<FlowState>('TIER_1_INTRO');
  const [currentSession, setCurrentSession] = useState<IntakeSession | null>(null);
  const [currentTier, setCurrentTier] = useState<IntakeTier>(initialTier);
  const [currentModule, setCurrentModule] = useState<IntakeModule | undefined>(undefined);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState<QuestionDefinition[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedTiers, setCompletedTiers] = useState<IntakeTier[]>([]);

  // Load questions for current tier/module
  useEffect(() => {
    loadQuestions();
  }, [currentTier, currentModule]);

  const loadQuestions = () => {
    // Load from spec JSON
    const allQuestions = spec.questions as QuestionDefinition[];

    let filtered: QuestionDefinition[] = [];

    if (currentTier === IntakeTier.TIER_1) {
      filtered = allQuestions.filter((q) => q.tier === 1);
    } else if (currentTier === IntakeTier.TIER_2 && currentModule) {
      filtered = allQuestions.filter(
        (q) => q.tier === 2 && q.module === currentModule
      );
    }

    setQuestions(filtered);
    setCurrentQuestionIndex(0);
  };

  // Start session when intro is complete
  const handleStartTier = () => {
    const session = startSession('tenant_demo_001', contactId, currentTier);
    setCurrentSession(session);

    if (currentTier === IntakeTier.TIER_1) {
      setFlowState('TIER_1_QUESTIONS');
    } else if (currentTier === IntakeTier.TIER_2) {
      // FIX: Go to questions after module is selected, not back to module select
      setFlowState('TIER_2_QUESTIONS');
    }
  };

  // Handle answer submission
  const handleAnswerSubmit = async (text: string) => {
    if (!currentSession) return;

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsAnalyzing(true);

    try {
      // Record answer
      const answer = recordAnswer(currentSession.id, currentQuestion.id, text);
      if (!answer) throw new Error('Failed to record answer');

      // Analyze answer
      const analysis = analyzeAnswer(answer);

      // Update answer with analysis
      updateAnswerAnalysis(currentSession.id, answer.id, analysis);

      // Move to next question or show results
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // All questions answered - compute metrics and show results
        const updatedSession = getSessionById(currentSession.id);
        if (updatedSession) {
          const metrics = computeSessionMetrics(updatedSession);
          updateSessionMetrics(currentSession.id, metrics);
          completeSession(currentSession.id);

          // Store intake profile data on Contact Zero
          storeIntakeProfileData(currentSession.id);

          setCurrentSession({ ...updatedSession, metrics });

          // Fire unified notification hook for all intake completions (admin email)
          onIntakeSessionCompleted(currentSession.id);

          if (currentTier === IntakeTier.TIER_1) {
            // Mark Tier 1 gateway as completed (only sets on first completion)
            markTier1GateCompleted(contactId);
            // Fire notification hook for Tier 1 completion (user notification)
            onIntakeCompleted(currentSession.id);
            // Go to access gate interstitial first
            setFlowState('TIER_1_ACCESS_GATE');
            setCompletedTiers([IntakeTier.TIER_1]);
          } else {
            // Fire notification hook for Tier 2 (Apex Blueprint) module completion
            onTier2ModuleCompleted(currentSession.id);
            setFlowState('TIER_2_RESULTS');
            setCompletedTiers([IntakeTier.TIER_1, IntakeTier.TIER_2]);
          }

          if (onComplete && metrics) {
            onComplete(metrics);
          }
        }
      }
    } catch (error) {
      console.error('Error processing answer:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Continue to Tier 2
  const handleContinueToTier2 = () => {
    setCurrentTier(IntakeTier.TIER_2);
    setFlowState('TIER_2_INTRO');
  };

  // Select Tier 2 module
  const handleModuleSelect = (module: IntakeModule) => {
    setCurrentModule(module);
    handleStartTier();
  };

  // Finish and return
  const handleFinish = () => {
    if (onAbandon) {
      onAbandon();
    }
  };

  // Choose another Tier 2 module (return to module selector)
  const handleChooseAnotherModule = () => {
    setCurrentModule(undefined);
    setCurrentQuestionIndex(0);
    setFlowState('TIER_2_MODULE_SELECT');
  };

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 relative z-20">
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Tier 1 Intro */}
          {flowState === 'TIER_1_INTRO' && (
            <div key="tier-1-intro" className="text-center space-y-8">
              {/* Info banner for users who have already completed Tier 1 */}
              {!needsTier1Intake(contactId) && (
                <MotionDiv
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-2xl mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-300">
                      <p className="font-medium mb-1">You have already completed the FrameLord intake.</p>
                      <p className="text-amber-300/80">Re-running it will not affect your access, only your diagnostics. Your existing completion date will be preserved.</p>
                    </div>
                  </div>
                </MotionDiv>
              )}

              {/* Little Lord Orb - 280px centered above heading - appears immediately */}
              <div className="w-[280px] h-[280px] mx-auto mb-4 relative">
                <LittleLordOrbView
                  state={{ isThinking: false, isSpeaking: false, emotion: 'neutral' }}
                />
              </div>

              {/* Text block with delayed fade-in */}
              <MotionDiv
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }}
                className="space-y-6"
              >
                <div className="flex items-center justify-center gap-2 text-fl-primary mb-4">
                  <Terminal size={20} />
                  <span className="text-xs font-bold tracking-[0.3em] uppercase">
                    FrameLord Intake Gateway
                  </span>
                </div>

                <h1 className="text-4xl md:text-6xl font-display text-white mb-4">
                  TIER 1: <span className="text-fl-primary">FIRST-ACCESS GATE</span>
                </h1>

                <div className="text-fl-text max-w-2xl mx-auto text-lg leading-relaxed space-y-4">
                  <p>This is your personal intake into FrameLord.</p>
                  <p>Your answers stay private and encrypted so the system can tune itself to you.</p>
                  <p>Take about five minutes and answer in detail.</p>
                </div>

                <div className="pt-8">
                  <button
                    onClick={handleStartTier}
                    className="px-8 py-4 bg-fl-primary hover:bg-fl-primary/80 text-white rounded-lg font-medium shadow-[0_0_25px_rgba(68,51,255,0.3)] hover:shadow-[0_0_40px_rgba(68,51,255,0.5)] transition-all"
                  >
                    Begin Assessment
                  </button>
                </div>
              </MotionDiv>
            </div>
          )}

          {/* Tier 1 Questions */}
          {flowState === 'TIER_1_QUESTIONS' && currentQuestion && (
            <MotionDiv
              key="tier-1-questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              {/* Progress Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <IntakeProgress
                    currentTier={currentTier}
                    currentModule={currentModule}
                    currentQuestion={currentQuestionIndex + 1}
                    totalQuestions={totalQuestions}
                    completedTiers={completedTiers}
                  />
                </div>
              </div>

              {/* Question & Input Area */}
              <div className="lg:col-span-3 space-y-8">
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  tier={currentTier}
                  module={currentModule}
                />

                <AnswerInput
                  onSubmit={handleAnswerSubmit}
                  isAnalyzing={isAnalyzing}
                  minLength={currentQuestion.minLength ?? 80}
                  maxLength={currentQuestion.maxLength ?? 800}
                  hint={currentQuestion.hint}
                  disabled={isAnalyzing}
                  inputType={currentQuestion.inputType}
                  minValue={currentQuestion.minValue}
                  maxValue={currentQuestion.maxValue}
                />
              </div>
            </MotionDiv>
          )}

          {/* Tier 1 Access Gate Interstitial */}
          {flowState === 'TIER_1_ACCESS_GATE' && (
            <Tier1AccessGate onViewResults={() => setFlowState('TIER_1_RESULTS')} />
          )}

          {/* Tier 1 Results */}
          {flowState === 'TIER_1_RESULTS' && currentSession?.metrics && (
            <MotionDiv
              key="tier-1-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <IntakeResults
                metrics={currentSession.metrics}
                session={currentSession}
                onContinue={handleContinueToTier2}
                onEnterDashboard={onEnterDashboard || handleFinish}
                onFinish={handleFinish}
              />
            </MotionDiv>
          )}

          {/* Tier 2 Intro */}
          {flowState === 'TIER_2_INTRO' && (
            <MotionDiv
              key="tier-2-intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <h1 className="text-4xl md:text-6xl font-display text-white mb-4">
                TIER 2: <span className="text-fl-accent">APEX BLUEPRINT</span>
              </h1>

              <p className="text-fl-text max-w-2xl mx-auto text-lg leading-relaxed">
                Deep-dive into the three pillars of business frame: Money, Authority, and
                Operations. Choose a module to continue.
              </p>

              <div className="pt-8">
                <button
                  onClick={() => setFlowState('TIER_2_MODULE_SELECT')}
                  className="px-8 py-4 bg-fl-accent hover:bg-fl-accent/80 text-white rounded-lg font-medium shadow-[0_0_25px_rgba(255,119,68,0.3)] hover:shadow-[0_0_40px_rgba(255,119,68,0.5)] transition-all"
                >
                  Select Module
                </button>
              </div>
            </MotionDiv>
          )}

          {/* Tier 2 Module Selection */}
          {flowState === 'TIER_2_MODULE_SELECT' && (
            <MotionDiv
              key="tier-2-module-select"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-display font-bold text-white mb-4">
                  Choose Your Module
                </h2>
                <p className="text-fl-text">Select one module to assess in detail</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Money Module */}
                <button
                  onClick={() => handleModuleSelect(IntakeModule.MONEY)}
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-8 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all text-left group"
                >
                  <h3 className="text-2xl font-display font-bold text-emerald-400 mb-3">
                    Money
                  </h3>
                  <p className="text-sm text-fl-text">
                    Pricing confidence, money scripts, value anchoring, and wealth mindset
                  </p>
                </button>

                {/* Authority Module */}
                <button
                  onClick={() => handleModuleSelect(IntakeModule.AUTHORITY)}
                  className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all text-left group"
                >
                  <h3 className="text-2xl font-display font-bold text-amber-400 mb-3">
                    Authority
                  </h3>
                  <p className="text-sm text-fl-text">
                    Status frame, boundary control, power dynamics, and prize positioning
                  </p>
                </button>

                {/* Operations Module */}
                <button
                  onClick={() => handleModuleSelect(IntakeModule.OPERATIONS)}
                  className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-8 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all text-left group"
                >
                  <h3 className="text-2xl font-display font-bold text-blue-400 mb-3">
                    Operations
                  </h3>
                  <p className="text-sm text-fl-text">
                    Say-do gaps, temporal patterns, call reluctance, and execution
                  </p>
                </button>
              </div>
            </MotionDiv>
          )}

          {/* Tier 2 Questions */}
          {flowState === 'TIER_2_QUESTIONS' && currentQuestion && (
            <MotionDiv
              key="tier-2-questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              {/* Progress Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <IntakeProgress
                    currentTier={currentTier}
                    currentModule={currentModule}
                    currentQuestion={currentQuestionIndex + 1}
                    totalQuestions={totalQuestions}
                    completedTiers={completedTiers}
                  />
                </div>
              </div>

              {/* Question & Input Area */}
              <div className="lg:col-span-3 space-y-8">
                <QuestionCard
                  question={currentQuestion}
                  questionNumber={currentQuestionIndex + 1}
                  totalQuestions={totalQuestions}
                  tier={currentTier}
                  module={currentModule}
                />

                <AnswerInput
                  onSubmit={handleAnswerSubmit}
                  isAnalyzing={isAnalyzing}
                  minLength={currentQuestion.minLength ?? 80}
                  maxLength={currentQuestion.maxLength ?? 800}
                  hint={currentQuestion.hint}
                  disabled={isAnalyzing}
                />
              </div>
            </MotionDiv>
          )}

          {/* Tier 2 Results */}
          {flowState === 'TIER_2_RESULTS' && currentSession?.metrics && (
            <MotionDiv
              key="tier-2-results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <IntakeResults
                metrics={currentSession.metrics}
                session={currentSession}
                onFinish={handleFinish}
                onChooseAnotherModule={handleChooseAnotherModule}
                onBookCaseCall={onBookCaseCall}
              />
            </MotionDiv>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-fl-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <div className="bg-fl-navy/50 border border-fl-primary/30 rounded-xl p-8 flex flex-col items-center gap-4">
                <Loader2 size={48} className="animate-spin text-fl-primary" />
                <p className="text-white font-medium">Analyzing your response...</p>
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
