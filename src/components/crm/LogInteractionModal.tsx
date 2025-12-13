// =============================================================================
// LOG INTERACTION MODAL — Manual interaction logging for contacts
// =============================================================================
// A modal for manually logging interactions with contacts.
// Includes fields for type, direction, date, summary, and flags.
// =============================================================================

import React, { useState } from 'react';
import { X, Phone, Users, MessageSquare, Mail, AtSign, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InteractionType, InteractionDirection } from '@/types';
import { createInteraction } from '@/services/interactionStore';
import { CONTACT_ZERO } from '@/services/contactStore';

interface LogInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  onSuccess?: () => void;
}

const interactionTypes: { value: InteractionType; label: string; icon: React.ReactNode }[] = [
  { value: 'call', label: 'Call', icon: <Phone size={14} /> },
  { value: 'meeting', label: 'Meeting', icon: <Users size={14} /> },
  { value: 'email', label: 'Email', icon: <Mail size={14} /> },
  { value: 'message', label: 'Message', icon: <MessageSquare size={14} /> },
  { value: 'dm', label: 'DM', icon: <AtSign size={14} /> },
  { value: 'other', label: 'Other', icon: <Activity size={14} /> },
];

const directions: { value: InteractionDirection; label: string }[] = [
  { value: 'outbound', label: 'Outbound (I initiated)' },
  { value: 'inbound', label: 'Inbound (They initiated)' },
];

export const LogInteractionModal: React.FC<LogInteractionModalProps> = ({
  isOpen,
  onClose,
  contactId,
  contactName,
  onSuccess,
}) => {
  const [type, setType] = useState<InteractionType>('call');
  const [direction, setDirection] = useState<InteractionDirection>('outbound');
  const [occurredAt, setOccurredAt] = useState(() => {
    // Default to now in local datetime format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [summary, setSummary] = useState('');
  const [isNotable, setIsNotable] = useState(false);
  const [affectsFrame, setAffectsFrame] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSubmitting(true);

    try {
      createInteraction({
        contactId,
        authorContactId: CONTACT_ZERO.id,
        type,
        summary: summary.trim(),
        occurredAt: new Date(occurredAt).toISOString(),
      });

      // Reset form
      setSummary('');
      setIsNotable(false);
      setAffectsFrame(false);

      // Notify success
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create interaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-6 w-full max-w-lg mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Log Interaction</h2>
              <p className="text-xs text-gray-500">with {contactName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#1b2c45] rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Interaction Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {interactionTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      type === t.value
                        ? 'border-[#4433FF] bg-[#4433FF]/20 text-white'
                        : 'border-[#1b2c45] bg-[#0a111d] text-gray-400 hover:border-[#2a3f5f] hover:text-gray-300'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Direction
              </label>
              <div className="grid grid-cols-2 gap-2">
                {directions.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDirection(d.value)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                      direction === d.value
                        ? 'border-[#4433FF] bg-[#4433FF]/20 text-white'
                        : 'border-[#1b2c45] bg-[#0a111d] text-gray-400 hover:border-[#2a3f5f] hover:text-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date/Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                When
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a111d] border border-[#1b2c45] rounded-lg text-white text-sm focus:outline-none focus:border-[#4433FF]"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Summary
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What happened? Key points, outcomes, next steps..."
                rows={4}
                className="w-full px-3 py-2 bg-[#0a111d] border border-[#1b2c45] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#4433FF] resize-none"
              />
            </div>

            {/* Flags */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNotable}
                  onChange={(e) => setIsNotable(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1b2c45] bg-[#0a111d] text-[#4433FF] focus:ring-[#4433FF]"
                />
                <span className="text-sm text-gray-300">Mark as notable</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={affectsFrame}
                  onChange={(e) => setAffectsFrame(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1b2c45] bg-[#0a111d] text-[#4433FF] focus:ring-[#4433FF]"
                />
                <span className="text-sm text-gray-300">Affects frame</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b2c45]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!summary.trim() || isSubmitting}
                className="px-4 py-2 bg-[#4433FF] text-white text-sm font-semibold rounded-lg hover:bg-[#5544FF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Interaction'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogInteractionModal;
