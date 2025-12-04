// =============================================================================
// LITTLE LORD GLOBAL MODAL — Universal modal for Little Lord
// =============================================================================
// Full-screen modal that can be invoked from anywhere via keyboard shortcut
// or floating button. Receives contextual payload automatically.
// =============================================================================

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown } from 'lucide-react';
import { LittleLordChat } from './LittleLordChat';
import type { LittleLordContext } from '../../services/littleLord/types';
import { getLittleLordDisplayName } from '../../services/littleLord';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordGlobalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  context?: LittleLordContext;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordGlobalModal: React.FC<LittleLordGlobalModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  userId,
  context,
}) => {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const displayName = getLittleLordDisplayName();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <MotionDiv
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-3xl bg-[#0E0E0E] border border-[#333] rounded-xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#222] bg-gradient-to-r from-[#4433FF]/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                      <Crown size={20} className="text-[#4433FF]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{displayName}</h2>
                      <p className="text-xs text-gray-400">Your Apex Frame coach</p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Chat Interface */}
              <div className="p-6">
                <LittleLordChat
                  tenantId={tenantId}
                  userId={userId}
                  context={context}
                  height="60vh"
                  showHeader={false}
                  className="border-none"
                />
              </div>

              {/* Footer hint */}
              <div className="px-6 py-3 border-t border-[#222] bg-[#0A0A0A]">
                <p className="text-[10px] text-gray-500 text-center">
                  Press Esc to close • Cmd+K then "LL" to summon from anywhere
                </p>
              </div>
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
};

export default LittleLordGlobalModal;
