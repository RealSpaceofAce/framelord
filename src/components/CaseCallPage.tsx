import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Calendar, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Reveal } from './Reveal';
import {
  submitCaseCallApplication,
  CASE_CALL_QUESTIONS,
  type SubmitCaseCallApplicationInput,
} from '../stores/caseCallApplicationStore';

const MotionDiv = motion.div as any;

type FormState = 'form' | 'submitting' | 'success';

interface CaseCallPageProps {
  onBack: () => void;
}

export const CaseCallPage: React.FC<CaseCallPageProps> = ({ onBack }) => {
  const [formState, setFormState] = useState<FormState>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    CASE_CALL_QUESTIONS.forEach((q) => {
      const answer = answers[q.id] || '';
      if (answer.length < q.minLength) {
        newErrors[q.id] = `Please provide at least ${q.minLength} characters`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormState('submitting');

    try {
      const input: SubmitCaseCallApplicationInput = {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim() || undefined,
        answers: CASE_CALL_QUESTIONS.map((q) => ({
          question: q.question,
          answer: answers[q.id] || '',
        })),
      };

      await submitCaseCallApplication(input);
      setFormState('success');
    } catch (error) {
      console.error('[CaseCallPage] Submission failed:', error);
      setErrors({ submit: 'Failed to submit. Please try again.' });
      setFormState('form');
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors((prev) => {
        const { [questionId]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  if (formState === 'success') {
    return (
      <div className="min-h-screen pt-24 px-4 pb-12 relative z-20 flex flex-col items-center justify-center app-neon">
        <Reveal width="100%" className="max-w-xl mx-auto text-center">
          <MotionDiv
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 mx-auto mb-8 bg-green-500/20 rounded-full flex items-center justify-center"
          >
            <CheckCircle size={40} className="text-green-400" />
          </MotionDiv>

          <h1 className="text-3xl md:text-4xl font-display text-white mb-4">
            Application Received
          </h1>

          <p className="text-fl-text mb-8">
            Thank you for your interest in a case call. We'll review your
            application and reach out within 24-48 hours to schedule a time.
          </p>

          <Button variant="primary" onClick={onBack}>
            Return to Home
          </Button>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 relative z-20 app-neon">
      {/* Header */}
      <Reveal width="100%" className="max-w-4xl mx-auto text-center mb-12">
        <div className="flex items-center justify-center gap-2 text-fl-primary mb-4">
          <Phone size={20} />
          <span className="text-xs font-bold tracking-[0.3em] uppercase">
            Strategic Consultation
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-display text-white mb-4">
          BOOK A{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-fl-primary to-fl-secondary">
            CASE CALL
          </span>
        </h1>
        <p className="text-fl-text max-w-xl mx-auto">
          A focused 30-minute call to break down a specific frame challenge and
          map out your next moves.
        </p>
      </Reveal>

      {/* Form */}
      <Reveal width="100%" delay={0.2} className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="glass-card rounded-2xl p-8 space-y-6 border border-[#1f2f45]">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className={`w-full bg-fl-navy/60 border ${
                    errors.name ? 'border-red-500' : 'border-fl-secondary/30'
                  } rounded-lg px-4 py-3 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-secondary focus:ring-1 focus:ring-fl-secondary transition-all`}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={`w-full bg-fl-navy/60 border ${
                    errors.email ? 'border-red-500' : 'border-fl-secondary/30'
                  } rounded-lg px-4 py-3 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-secondary focus:ring-1 focus:ring-fl-secondary transition-all`}
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">
                Phone (optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full bg-fl-navy/60 border border-fl-secondary/30 rounded-lg px-4 py-3 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-secondary focus:ring-1 focus:ring-fl-secondary transition-all"
              />
            </div>

            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
                Tell us about your situation
              </h3>
            </div>

            {/* Questions */}
            {CASE_CALL_QUESTIONS.map((q) => (
              <div key={q.id}>
                <label className="block text-sm text-white mb-2">
                  {q.question}
                </label>
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={3}
                  maxLength={q.maxLength}
                  className={`w-full bg-fl-navy/60 border ${
                    errors[q.id] ? 'border-red-500' : 'border-fl-secondary/30'
                  } rounded-lg px-4 py-3 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-secondary focus:ring-1 focus:ring-fl-secondary transition-all resize-none`}
                />
                <div className="flex justify-between mt-1">
                  {errors[q.id] ? (
                    <p className="text-xs text-red-400">{errors[q.id]}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-gray-500">
                    {(answers[q.id] || '').length}/{q.maxLength}
                  </span>
                </div>
              </div>
            ))}

            {errors.submit && (
              <p className="text-sm text-red-400 text-center">{errors.submit}</p>
            )}

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={formState === 'submitting'}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {formState === 'submitting' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Application
                    <ArrowRight size={18} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Reveal>

      {/* Info Box */}
      <Reveal width="100%" delay={0.4} className="max-w-2xl mx-auto mt-8">
        <div className="flex items-start gap-4 p-4 bg-fl-secondary/5 rounded-lg border border-fl-secondary/20">
          <Calendar size={24} className="text-fl-secondary shrink-0 mt-1" />
          <div>
            <h4 className="text-sm font-bold text-white mb-1">
              What happens next?
            </h4>
            <p className="text-sm text-fl-text">
              After reviewing your application, we'll send you a link to book a
              30-minute call at a time that works for both of us. These calls
              are focused diagnostic sessions designed to give you clarity and
              actionable next steps.
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  );
};

export default CaseCallPage;
