// =============================================================================
// APPLICATION PAGES — /apply/coaching, /apply/beta, /application, /betaprogram
// =============================================================================
// AI-powered application + booking flow for coaching and beta programs.
// Multi-step: Form → AI Evaluation → Scheduling → Confirmation
// =============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, FlaskConical, Send, CheckCircle, AlertCircle, ArrowLeft,
  Calendar, Clock, Phone, Mail, ChevronRight, Loader2, Check
} from 'lucide-react';
import type { UserScope } from '../types/multiTenant';
import type {
  CoachingApplicationFormV2,
  BetaApplicationFormV2,
  ApplicationStep,
  TimeSlot,
  SubmitApplicationResponse,
  DecisionMakerStatus,
  BudgetReadiness,
  StartTimeline,
} from '../types/applicationTypes';
import {
  submitCoachingApplicationApi,
  submitBetaApplicationApi,
  suggestSlotsApi,
  bookSlotsApi,
  formatSlotForDisplay,
} from '../api/applicationApi';
import { getLatestFrameHealth } from '../stores/frameHealthStore';

const MotionDiv = motion.div as any;

// =============================================================================
// SCROLL TO TOP ON MOUNT
// =============================================================================

function useScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
}

// =============================================================================
// COACHING APPLICATION PAGE
// =============================================================================

interface CoachingApplicationPageProps {
  userScope?: UserScope;
  onBack?: () => void;
}

export const CoachingApplicationPage: React.FC<CoachingApplicationPageProps> = ({
  userScope,
  onBack,
}) => {
  useScrollToTop();
  
  const [step, setStep] = useState<ApplicationStep>('FORM');
  const [applicationId, setApplicationId] = useState<string>('');
  const [aiSummary, setAiSummary] = useState<SubmitApplicationResponse['aiSummary']>();
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState<CoachingApplicationFormV2>({
    name: '',
    email: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    businessModel: '',
    currentMonthlyRevenue: '',
    targetMonthlyRevenue: '',
    mainFrameProblems: '',
    topBusinessConstraints: '',
    decisionMakerStatus: 'SOLE_DECISION_MAKER',
    budgetReadiness: 'CAN_PAY_IN_FULL',
    startTimeline: 'IMMEDIATELY',
    previousCoachingExperience: '',
    biggestRisksOrConcerns: '',
    whyNow: '',
    dealBreakers: '',
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('SUBMITTING');
    
    const tenantId = userScope?.tenantId || 'public';
    const userId = userScope?.userId || `anon_${Date.now()}`;
    
    // Get frame signals if available
    const frameSignals = userScope 
      ? getLatestFrameHealth(userScope.tenantId, userScope.userId) 
      : undefined;
    
    const result = await submitCoachingApplicationApi(tenantId, userId, form, frameSignals ?? undefined);
    
    if (result.success) {
      setApplicationId(result.applicationId);
      setAiSummary(result.aiSummary);
      setStep('THANK_YOU');
    } else {
      setError(result.error || 'Failed to submit application');
      setStep('FORM');
    }
  };
  
  const handleSchedulingComplete = () => {
    setStep('CONFIRMATION');
  };
  
  // Step rendering
  if (step === 'SUBMITTING') {
    return <LoadingScreen message="Evaluating your application..." />;
  }
  
  if (step === 'THANK_YOU') {
    return (
      <ThankYouStep
        applicationType="coaching"
        applicationId={applicationId}
        email={form.email}
        phone={form.phone}
        onProceedToScheduling={() => setStep('SCHEDULING')}
      />
    );
  }
  
  if (step === 'SCHEDULING') {
    return (
      <SchedulingStep
        applicationType="coaching"
        applicationId={applicationId}
        email={form.email}
        phone={form.phone}
        onComplete={handleSchedulingComplete}
        onBack={() => setStep('THANK_YOU')}
      />
    );
  }
  
  if (step === 'CONFIRMATION') {
    return (
      <ConfirmationStep
        applicationType="coaching"
        onBack={onBack}
      />
    );
  }
  
  // Form step
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 text-gray-400 hover:text-white">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                <Target size={20} className="text-[#4433FF]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apply for Apex Coaching</h1>
                <p className="text-xs text-gray-500">High-ticket frame mastery coaching</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <Card title="Your Information">
            <div className="space-y-4">
              <FormField
                label="Full Name *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="John Smith"
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="john@example.com"
                />
                <FormField
                  label="Phone *"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
          </Card>

          {/* Business Context */}
          <Card title="Your Business">
            <div className="space-y-4">
              <FormTextArea
                label="What do you do and who do you sell to? *"
                value={form.businessModel}
                onChange={(v) => setForm({ ...form, businessModel: v })}
                placeholder="Describe your business model, products/services, and target market..."
                rows={3}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Current Monthly Revenue *"
                  value={form.currentMonthlyRevenue}
                  onChange={(v) => setForm({ ...form, currentMonthlyRevenue: v })}
                  placeholder="e.g., $50,000"
                />
                <FormField
                  label="Target Monthly Revenue *"
                  value={form.targetMonthlyRevenue}
                  onChange={(v) => setForm({ ...form, targetMonthlyRevenue: v })}
                  placeholder="e.g., $200,000"
                />
              </div>
              <FormTextArea
                label="Top Business Constraints"
                value={form.topBusinessConstraints || ''}
                onChange={(v) => setForm({ ...form, topBusinessConstraints: v })}
                placeholder="Time, team, market, skill gaps..."
                rows={2}
              />
            </div>
          </Card>

          {/* Frame & Challenges */}
          <Card title="Frame Challenges">
            <div className="space-y-4">
              <FormTextArea
                label="Where does your frame collapse? *"
                value={form.mainFrameProblems}
                onChange={(v) => setForm({ ...form, mainFrameProblems: v })}
                placeholder="Relationships, leadership, offers, sales conversations, negotiations..."
                rows={4}
              />
              <FormTextArea
                label="Why are you applying now? *"
                value={form.whyNow}
                onChange={(v) => setForm({ ...form, whyNow: v })}
                placeholder="What changed? Why not 6 months ago?"
                rows={3}
              />
            </div>
          </Card>

          {/* Decision & Budget */}
          <Card title="Decision & Investment Readiness">
            <div className="space-y-4">
              <FormSelect
                label="Decision Making Authority *"
                value={form.decisionMakerStatus}
                onChange={(v) => setForm({ ...form, decisionMakerStatus: v as DecisionMakerStatus })}
                options={[
                  { value: 'SOLE_DECISION_MAKER', label: 'I am the sole decision maker' },
                  { value: 'JOINT_DECISION_MAKER', label: 'I make decisions jointly with someone' },
                  { value: 'NOT_DECISION_MAKER', label: 'I need to consult others first' },
                ]}
              />
              <FormSelect
                label="Budget Readiness *"
                value={form.budgetReadiness}
                onChange={(v) => setForm({ ...form, budgetReadiness: v as BudgetReadiness })}
                options={[
                  { value: 'CAN_PAY_IN_FULL', label: 'Can pay in full now' },
                  { value: 'CAN_PAY_WITH_FINANCING', label: 'Can pay with financing/payment plan' },
                  { value: 'NEED_TO_MOVE_MONEY_FIRST', label: 'Need to move money first' },
                  { value: 'NO_ACTIVE_BUDGET', label: 'No active budget right now' },
                ]}
              />
              <FormSelect
                label="When are you ready to start? *"
                value={form.startTimeline}
                onChange={(v) => setForm({ ...form, startTimeline: v as StartTimeline })}
                options={[
                  { value: 'IMMEDIATELY', label: 'Immediately' },
                  { value: 'WITHIN_30_DAYS', label: 'Within 30 days' },
                  { value: 'WITHIN_90_DAYS', label: 'Within 90 days' },
                  { value: 'SOMEDAY_UNSPECIFIED', label: 'Someday (not sure when)' },
                ]}
              />
            </div>
          </Card>

          {/* Additional Context */}
          <Card title="Additional Context (Optional)">
            <div className="space-y-4">
              <FormTextArea
                label="Previous coaching or program experience"
                value={form.previousCoachingExperience || ''}
                onChange={(v) => setForm({ ...form, previousCoachingExperience: v })}
                placeholder="What worked? What didn't?"
                rows={2}
              />
              <FormTextArea
                label="Biggest risks or concerns"
                value={form.biggestRisksOrConcerns || ''}
                onChange={(v) => setForm({ ...form, biggestRisksOrConcerns: v })}
                placeholder="What are you worried about?"
                rows={2}
              />
              <FormTextArea
                label="Deal breakers"
                value={form.dealBreakers || ''}
                onChange={(v) => setForm({ ...form, dealBreakers: v })}
                placeholder="Anything that would make this not work for you?"
                rows={2}
              />
            </div>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#4433FF] text-white font-bold rounded-lg hover:bg-[#5544FF] transition-colors"
          >
            <Send size={16} />
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// BETA APPLICATION PAGE
// =============================================================================

interface BetaApplicationPageProps {
  userScope?: UserScope;
  onBack?: () => void;
}

export const BetaApplicationPage: React.FC<BetaApplicationPageProps> = ({
  userScope,
  onBack,
}) => {
  useScrollToTop();
  
  const [step, setStep] = useState<ApplicationStep>('FORM');
  const [applicationId, setApplicationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState<BetaApplicationFormV2>({
    name: '',
    email: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    role: '',
    businessStage: '',
    currentSystems: '',
    reasonForBeta: '',
    usageIntent: '',
    expectedSessionsPerWeek: 3,
    feedbackStyle: '',
    acceptsUseItOrLoseIt: false,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('SUBMITTING');
    
    const tenantId = userScope?.tenantId || 'public';
    const userId = userScope?.userId || `anon_${Date.now()}`;
    
    const result = await submitBetaApplicationApi(tenantId, userId, form);
    
    if (result.success) {
      setApplicationId(result.applicationId);
      setStep('THANK_YOU');
    } else {
      setError(result.error || 'Failed to submit application');
      setStep('FORM');
    }
  };
  
  const handleSchedulingComplete = () => {
    setStep('CONFIRMATION');
  };
  
  // Step rendering
  if (step === 'SUBMITTING') {
    return <LoadingScreen message="Evaluating your application..." />;
  }
  
  if (step === 'THANK_YOU') {
    return (
      <ThankYouStep
        applicationType="beta"
        applicationId={applicationId}
        email={form.email}
        phone={form.phone}
        onProceedToScheduling={() => setStep('SCHEDULING')}
      />
    );
  }
  
  if (step === 'SCHEDULING') {
    return (
      <SchedulingStep
        applicationType="beta"
        applicationId={applicationId}
        email={form.email}
        phone={form.phone}
        onComplete={handleSchedulingComplete}
        onBack={() => setStep('THANK_YOU')}
      />
    );
  }
  
  if (step === 'CONFIRMATION') {
    return (
      <ConfirmationStep
        applicationType="beta"
        onBack={onBack}
      />
    );
  }
  
  // Form step
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 text-gray-400 hover:text-white">
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
                <FlaskConical size={20} className="text-green-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Apply for Beta</h1>
                <p className="text-xs text-gray-500">Early access to FrameLord</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Info */}
          <Card title="Your Information">
            <div className="space-y-4">
              <FormField
                label="Full Name *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="John Smith"
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  placeholder="john@example.com"
                />
                <FormField
                  label="Phone *"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
          </Card>

          {/* Your Context */}
          <Card title="Your Context">
            <div className="space-y-4">
              <FormField
                label="Your Role"
                value={form.role || ''}
                onChange={(v) => setForm({ ...form, role: v })}
                placeholder="Founder, coach, agency owner, operator..."
              />
              <FormField
                label="Business Stage"
                value={form.businessStage || ''}
                onChange={(v) => setForm({ ...form, businessStage: v })}
                placeholder="Pre-revenue, early revenue, established, scaling..."
              />
              <FormTextArea
                label="Current Systems"
                value={form.currentSystems || ''}
                onChange={(v) => setForm({ ...form, currentSystems: v })}
                placeholder="What do you currently use for notes, CRM, tasks?"
                rows={2}
              />
            </div>
          </Card>

          {/* Beta Application */}
          <Card title="Why Beta?">
            <div className="space-y-4">
              <FormTextArea
                label="Why do you want into the FrameLord beta? *"
                value={form.reasonForBeta}
                onChange={(v) => setForm({ ...form, reasonForBeta: v })}
                placeholder="What specifically draws you to FrameLord?"
                rows={3}
              />
              <FormTextArea
                label="How do you plan to use FrameLord day-to-day? *"
                value={form.usageIntent}
                onChange={(v) => setForm({ ...form, usageIntent: v })}
                placeholder="Describe your intended workflow..."
                rows={3}
              />
              <FormField
                label="Expected sessions per week *"
                type="number"
                value={form.expectedSessionsPerWeek.toString()}
                onChange={(v) => setForm({ ...form, expectedSessionsPerWeek: parseInt(v) || 0 })}
                placeholder="e.g., 5"
              />
              <FormTextArea
                label="How do you normally give product feedback?"
                value={form.feedbackStyle || ''}
                onChange={(v) => setForm({ ...form, feedbackStyle: v })}
                placeholder="Bug reports, feature requests, direct messages..."
                rows={2}
              />
            </div>
          </Card>

          {/* Agreement */}
          <Card title="Beta Agreement">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.acceptsUseItOrLoseIt}
                onChange={(e) => setForm({ ...form, acceptsUseItOrLoseIt: e.target.checked })}
                className="mt-1 w-4 h-4 accent-green-500"
              />
              <div>
                <div className="text-sm text-white font-medium">
                  I understand the "Use It or Lose It" policy *
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Beta access requires regular usage. If you become inactive for more than 
                  14 days, your beta access may be revoked. You can always re-apply later.
                </p>
              </div>
            </div>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!form.acceptsUseItOrLoseIt}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// THANK YOU STEP
// =============================================================================

const ThankYouStep: React.FC<{
  applicationType: 'coaching' | 'beta';
  applicationId: string;
  email: string;
  phone: string;
  onProceedToScheduling: () => void;
}> = ({ applicationType, applicationId, email, phone, onProceedToScheduling }) => {
  const isCoaching = applicationType === 'coaching';
  const callDuration = isCoaching ? '45 minutes' : '10 minutes';
  const callType = isCoaching ? 'Apex Coaching Discovery Call' : 'FrameLord Beta Call';
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg w-full"
      >
        <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-8">
          <div className={`w-16 h-16 ${isCoaching ? 'bg-[#4433FF]/20' : 'bg-green-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <CheckCircle size={32} className={isCoaching ? 'text-[#4433FF]' : 'text-green-400'} />
          </div>
          
          <h1 className="text-xl font-bold text-white text-center mb-2">
            Application Received!
          </h1>
          
          <p className="text-sm text-gray-400 text-center mb-6">
            Thank you for applying. Your application is now being reviewed by our team.
          </p>
          
          <div className="bg-[#1A1A1D] rounded-lg p-4 mb-6">
            <h3 className="text-sm font-bold text-white mb-3">Next Step: Schedule Your Call</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <Clock size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                <span>Your {callType} will be {callDuration}</span>
              </li>
              <li className="flex items-start gap-2">
                <Calendar size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                <span>Propose at least 2 times within the next 2 days</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                <span>This will be a phone call (not Zoom)</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-[#2A2A2A]">
              We'll review your application and proposed times, then text and email you if approved with the confirmed time.
            </p>
          </div>
          
          <button
            onClick={onProceedToScheduling}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 ${
              isCoaching ? 'bg-[#4433FF] hover:bg-[#5544FF]' : 'bg-green-500 hover:bg-green-600'
            } text-white font-bold rounded-lg transition-colors`}
          >
            Propose Call Times
            <ChevronRight size={16} />
          </button>
        </div>
      </MotionDiv>
    </div>
  );
};

// =============================================================================
// SCHEDULING STEP
// =============================================================================

const SchedulingStep: React.FC<{
  applicationType: 'coaching' | 'beta';
  applicationId: string;
  email: string;
  phone: string;
  onComplete: () => void;
  onBack: () => void;
}> = ({ applicationType, applicationId, email, phone, onComplete, onBack }) => {
  const isCoaching = applicationType === 'coaching';
  const bookingType = isCoaching ? 'COACHING' : 'BETA';
  
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [confirmedPhone, setConfirmedPhone] = useState(phone);
  const [phoneConfirmed, setPhoneConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch available slots
  useEffect(() => {
    const { slots } = suggestSlotsApi({ bookingType: bookingType as any });
    setAvailableSlots(slots);
    setIsLoading(false);
  }, [bookingType]);
  
  const toggleSlot = (slot: TimeSlot) => {
    setSelectedSlots(prev => {
      const exists = prev.some(s => s.start === slot.start);
      if (exists) {
        return prev.filter(s => s.start !== slot.start);
      }
      return [...prev, slot];
    });
  };
  
  const handleSubmit = async () => {
    setError(null);
    
    if (selectedSlots.length < 2) {
      setError('Please select at least 2 time slots');
      return;
    }
    
    if (!phoneConfirmed) {
      setError('Please confirm your phone number');
      return;
    }
    
    setIsSubmitting(true);
    
    const result = bookSlotsApi({
      applicationId,
      bookingType: bookingType as any,
      selectedSlots,
      phone: confirmedPhone,
      email,
      phoneConfirmed,
    });
    
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || 'Failed to book slots');
    }
    
    setIsSubmitting(false);
  };
  
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 text-gray-400 hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className={`p-2 ${isCoaching ? 'bg-[#4433FF]/20 border-[#4433FF]/30' : 'bg-green-500/20 border-green-500/30'} rounded-lg border`}>
                <Calendar size={20} className={isCoaching ? 'text-[#4433FF]' : 'text-green-400'} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Propose Call Times</h1>
                <p className="text-xs text-gray-500">
                  Select at least 2 times that work for you
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Confirm Phone */}
        <Card title="Confirm Your Phone Number">
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              We'll call you at this number. Make sure it's correct.
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <FormField
                  label="Phone Number"
                  type="tel"
                  value={confirmedPhone}
                  onChange={setConfirmedPhone}
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={phoneConfirmed}
                onChange={(e) => setPhoneConfirmed(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
              <label className="text-sm text-gray-400">
                I confirm this is the correct phone number for the call
              </label>
            </div>
          </div>
        </Card>

        {/* Available Slots */}
        <div className="mt-6">
          <Card title={`Available Times (Select at least 2)`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No available slots in the next 2 days. Please try again later.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {availableSlots.map((slot, index) => {
                  const isSelected = selectedSlots.some(s => s.start === slot.start);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleSlot(slot)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? isCoaching
                            ? 'bg-[#4433FF]/20 border-[#4433FF] text-white'
                            : 'bg-green-500/20 border-green-500 text-white'
                          : 'bg-[#1A1A1D] border-[#333] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <span className="text-sm">{formatSlotForDisplay(slot)}</span>
                      {isSelected && (
                        <Check size={16} className={isCoaching ? 'text-[#4433FF]' : 'text-green-400'} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            
            {selectedSlots.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                <p className="text-xs text-gray-500 mb-2">Selected times ({selectedSlots.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSlots.map((slot, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded ${
                        isCoaching ? 'bg-[#4433FF]/20 text-[#4433FF]' : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {formatSlotForDisplay(slot)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle size={16} className="text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedSlots.length < 2 || !phoneConfirmed}
          className={`mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 ${
            isCoaching ? 'bg-[#4433FF] hover:bg-[#5544FF]' : 'bg-green-500 hover:bg-green-600'
          } text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit Proposed Times
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// CONFIRMATION STEP
// =============================================================================

const ConfirmationStep: React.FC<{
  applicationType: 'coaching' | 'beta';
  onBack?: () => void;
}> = ({ applicationType, onBack }) => {
  const isCoaching = applicationType === 'coaching';
  
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <MotionDiv
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-lg w-full text-center"
      >
        <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-8">
          <div className={`w-16 h-16 ${isCoaching ? 'bg-[#4433FF]/20' : 'bg-green-500/20'} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Calendar size={32} className={isCoaching ? 'text-[#4433FF]' : 'text-green-400'} />
          </div>
          
          <h1 className="text-xl font-bold text-white mb-2">
            Time Proposals Received!
          </h1>
          
          <p className="text-sm text-gray-400 mb-6">
            We have received your proposed call times and are reviewing your application.
          </p>
          
          <div className="bg-[#1A1A1D] rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-bold text-white mb-3">What happens next:</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <div className={`w-5 h-5 rounded-full ${isCoaching ? 'bg-[#4433FF]/20 text-[#4433FF]' : 'bg-green-500/20 text-green-400'} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
                  1
                </div>
                <span>We review your application and proposed times</span>
              </li>
              <li className="flex items-start gap-2">
                <div className={`w-5 h-5 rounded-full ${isCoaching ? 'bg-[#4433FF]/20 text-[#4433FF]' : 'bg-green-500/20 text-green-400'} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
                  2
                </div>
                <span>If approved, we select a time and confirm via text and email</span>
              </li>
              <li className="flex items-start gap-2">
                <div className={`w-5 h-5 rounded-full ${isCoaching ? 'bg-[#4433FF]/20 text-[#4433FF]' : 'bg-green-500/20 text-green-400'} flex items-center justify-center flex-shrink-0 text-xs font-bold`}>
                  3
                </div>
                <span>We call you at the confirmed time on the phone number you provided</span>
              </li>
            </ul>
          </div>
          
          <p className="text-xs text-gray-500 mb-6">
            Please keep your phone accessible. You'll receive reminders 24 hours and 1 hour before your call.
          </p>
          
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-[#1A1A1D] border border-[#333] text-white rounded-lg text-sm hover:border-gray-500 transition-colors"
            >
              Back to App
            </button>
          )}
        </div>
      </MotionDiv>
    </div>
  );
};

// =============================================================================
// LOADING SCREEN
// =============================================================================

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
    <div className="text-center">
      <Loader2 size={48} className="animate-spin text-[#4433FF] mx-auto mb-4" />
      <p className="text-gray-400">{message}</p>
    </div>
  </div>
);

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-6">
    <h3 className="text-sm font-bold text-white mb-4">{title}</h3>
    {children}
  </div>
);

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none"
    />
  </div>
);

const FormTextArea: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
      {label}
    </label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none resize-none"
    />
  </div>
);

const FormSelect: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, value, onChange, options }) => (
  <div>
    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default { CoachingApplicationPage, BetaApplicationPage };
