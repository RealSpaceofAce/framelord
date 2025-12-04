// =============================================================================
// APPLICATION PAGES — /apply/coaching and /apply/beta
// =============================================================================
// Application forms for coaching and beta programs.
// Stores submissions and triggers AI evaluation stubs.
// =============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, FlaskConical, Send, CheckCircle, AlertCircle, ArrowLeft 
} from 'lucide-react';
import type { UserScope, CoachingApplicationForm, BetaApplicationForm } from '../types/multiTenant';
import { 
  submitCoachingApplication, 
  evaluateCoachingApplicationStub,
  getCoachingApplicationsForUser 
} from '../stores/coachingStore';
import { 
  submitBetaApplication, 
  evaluateBetaApplicationStub,
  getBetaApplicationsForUser 
} from '../stores/betaProgramStore';
import { getLatestFrameHealth } from '../stores/frameHealthStore';

const MotionDiv = motion.div as any;

// =============================================================================
// COACHING APPLICATION PAGE
// =============================================================================

interface CoachingApplicationPageProps {
  userScope: UserScope;
  onBack?: () => void;
}

export const CoachingApplicationPage: React.FC<CoachingApplicationPageProps> = ({
  userScope,
  onBack,
}) => {
  const [form, setForm] = useState<CoachingApplicationForm>({
    name: '',
    email: '',
    businessContext: '',
    frameChallenges: '',
    goals: '',
    commitmentHoursPerWeek: undefined,
    incomeBand: undefined,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user already has a pending application
  const existingApplications = getBetaApplicationsForUser(userScope.tenantId, userScope.userId);
  const hasPendingApplication = existingApplications.some(a => a.status === 'SUBMITTED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (!form.businessContext.trim() || !form.frameChallenges.trim() || !form.goals.trim()) {
      setError('Please complete all text fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current frame health snapshot
      const frameHealth = getLatestFrameHealth(userScope.tenantId, userScope.userId);

      // Submit application
      const application = submitCoachingApplication({
        tenantId: userScope.tenantId,
        userId: userScope.userId,
        form,
        frameHealthSnapshot: frameHealth ?? undefined,
      });

      // Trigger AI evaluation (stub)
      evaluateCoachingApplicationStub(application);

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessScreen
        title="Application Submitted!"
        message="Thank you for applying. We'll review your application and get back to you within 2-3 business days."
        onBack={onBack}
      />
    );
  }

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
                <h1 className="text-xl font-bold text-white">Apply for Coaching</h1>
                <p className="text-xs text-gray-500">Personalized frame mastery coaching</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card title="Your Information">
            <div className="space-y-4">
              <FormField
                label="Full Name *"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="John Smith"
              />
              <FormField
                label="Email *"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="john@example.com"
              />
            </div>
          </Card>

          {/* Application Questions */}
          <Card title="Tell Us About Yourself">
            <div className="space-y-4">
              <FormTextArea
                label="Business/Life Context *"
                value={form.businessContext}
                onChange={(v) => setForm({ ...form, businessContext: v })}
                placeholder="Describe your current professional situation and life context..."
                rows={4}
              />
              <FormTextArea
                label="Frame Challenges *"
                value={form.frameChallenges}
                onChange={(v) => setForm({ ...form, frameChallenges: v })}
                placeholder="What frame challenges are you facing? Where do you feel stuck?"
                rows={4}
              />
              <FormTextArea
                label="Goals *"
                value={form.goals}
                onChange={(v) => setForm({ ...form, goals: v })}
                placeholder="What outcomes would make this coaching successful for you?"
                rows={4}
              />
            </div>
          </Card>

          {/* Optional Fields */}
          <Card title="Additional Information (Optional)">
            <div className="space-y-4">
              <FormField
                label="Hours per week you can commit"
                type="number"
                value={form.commitmentHoursPerWeek?.toString() || ''}
                onChange={(v) => setForm({ ...form, commitmentHoursPerWeek: v ? parseInt(v) : undefined })}
                placeholder="e.g., 5"
              />
              <FormSelect
                label="Income Band"
                value={form.incomeBand || ''}
                onChange={(v) => setForm({ ...form, incomeBand: v || undefined })}
                options={[
                  { value: '', label: 'Select...' },
                  { value: 'under_50k', label: 'Under $50,000' },
                  { value: '50k_100k', label: '$50,000 - $100,000' },
                  { value: '100k_200k', label: '$100,000 - $200,000' },
                  { value: '200k_500k', label: '$200,000 - $500,000' },
                  { value: 'over_500k', label: 'Over $500,000' },
                ]}
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
            disabled={isSubmitting || hasPendingApplication}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#4433FF] text-white font-bold rounded-lg hover:bg-[#5544FF] disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>

          {hasPendingApplication && (
            <p className="text-center text-xs text-yellow-400">
              You already have a pending application.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// BETA APPLICATION PAGE
// =============================================================================

interface BetaApplicationPageProps {
  userScope: UserScope;
  onBack?: () => void;
}

export const BetaApplicationPage: React.FC<BetaApplicationPageProps> = ({
  userScope,
  onBack,
}) => {
  const [form, setForm] = useState<BetaApplicationForm>({
    motivation: '',
    expectedUsagePerWeek: 0,
    businessContext: '',
    acceptsUseItOrLoseIt: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingApplications = getBetaApplicationsForUser(userScope.tenantId, userScope.userId);
  const hasPendingApplication = existingApplications.some(a => a.status === 'SUBMITTED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!form.motivation.trim() || !form.businessContext.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (form.expectedUsagePerWeek < 1) {
      setError('Please specify expected usage hours');
      return;
    }

    if (!form.acceptsUseItOrLoseIt) {
      setError('You must accept the "use it or lose it" policy');
      return;
    }

    setIsSubmitting(true);

    try {
      const application = submitBetaApplication({
        tenantId: userScope.tenantId,
        userId: userScope.userId,
        form,
      });

      evaluateBetaApplicationStub(application);

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessScreen
        title="Beta Application Submitted!"
        message="Thank you for your interest in the beta program. We'll review your application and notify you within 1-2 business days."
        onBack={onBack}
      />
    );
  }

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
                <p className="text-xs text-gray-500">Early access to FrameLord features</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card title="Why do you want to join the beta?">
            <FormTextArea
              label="Your Motivation *"
              value={form.motivation}
              onChange={(v) => setForm({ ...form, motivation: v })}
              placeholder="Why are you interested in FrameLord and what do you hope to achieve?"
              rows={4}
            />
          </Card>

          <Card title="Your Context">
            <div className="space-y-4">
              <FormTextArea
                label="Business/Life Context *"
                value={form.businessContext}
                onChange={(v) => setForm({ ...form, businessContext: v })}
                placeholder="Tell us about your situation and how you plan to use FrameLord..."
                rows={4}
              />
              <FormField
                label="Expected hours per week *"
                type="number"
                value={form.expectedUsagePerWeek.toString()}
                onChange={(v) => setForm({ ...form, expectedUsagePerWeek: parseInt(v) || 0 })}
                placeholder="e.g., 5"
              />
            </div>
          </Card>

          <Card title="Beta Agreement">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={form.acceptsUseItOrLoseIt}
                onChange={(e) => setForm({ ...form, acceptsUseItOrLoseIt: e.target.checked })}
                className="mt-1"
              />
              <div>
                <div className="text-sm text-white font-medium">
                  I understand the "Use It or Lose It" policy
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Beta access requires regular usage. If you become inactive for more than 
                  14 days, your beta access may be revoked. You can always re-apply later.
                </p>
              </div>
            </div>
          </Card>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle size={16} className="text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || hasPendingApplication}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>

          {hasPendingApplication && (
            <p className="text-center text-xs text-yellow-400">
              You already have a pending application.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

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

const SuccessScreen: React.FC<{
  title: string;
  message: string;
  onBack?: () => void;
}> = ({ title, message, onBack }) => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
    <MotionDiv
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-md w-full text-center"
    >
      <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] p-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-2 bg-[#1A1A1D] border border-[#333] text-white rounded-lg text-sm hover:border-[#4433FF] transition-colors"
          >
            Back to App
          </button>
        )}
      </div>
    </MotionDiv>
  </div>
);

export default { CoachingApplicationPage, BetaApplicationPage };

