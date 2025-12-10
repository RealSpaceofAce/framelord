// =============================================================================
// FRAME SCAN CONTEXT HELP — Help icon with context requirements popup
// =============================================================================
// Reusable component that explains what context is needed for accurate scans.
// Used across public landing scanner, internal scan module, and contact view.
// Uses React Portal to render popup outside of parent stacking contexts.
// =============================================================================

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HelpCircle, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

interface FrameScanContextHelpProps {
  /** Optional className for positioning the help icon */
  className?: string;
  /** Size of the help icon (default: 16) */
  iconSize?: number;
}

export const FrameScanContextHelp: React.FC<FrameScanContextHelpProps> = ({
  className = '',
  iconSize = 16,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Update popover position when button is clicked
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position below the button, aligned to the right
      setPopoverPosition({
        top: rect.bottom + 8,
        left: Math.max(16, rect.right - 320), // 320 = popover width, 16 = min margin
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Popover content rendered via Portal
  const popoverContent = isOpen ? (
    <AnimatePresence>
      <MotionDiv
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: -5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -5 }}
        transition={{ duration: 0.15 }}
        className="fixed w-80 rounded-lg overflow-hidden"
        style={{
          top: popoverPosition.top,
          left: popoverPosition.left,
          zIndex: 99999,
          backgroundColor: '#111111',
          border: '1px solid #333333',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(51, 51, 51, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ backgroundColor: '#1A1A1A', borderColor: '#333333' }}
        >
          <div className="flex items-center gap-2 text-[#4433FF]">
            <AlertCircle size={16} />
            <span className="text-sm font-semibold">Context Required</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-400 hover:text-white transition-colors rounded"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3" style={{ backgroundColor: '#111111' }}>
          <p className="text-sm text-gray-300">
            For accurate frame analysis, include:
          </p>

          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#4433FF] font-bold mt-0.5">WHO</span>
              <span className="text-gray-400">
                Who is being scanned? (yourself, a partner, client, prospect, etc.)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4433FF] font-bold mt-0.5">WHAT</span>
              <span className="text-gray-400">
                What is this? (profile photo, DM screenshot, email, call transcript, etc.)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4433FF] font-bold mt-0.5">WHEN</span>
              <span className="text-gray-400">
                When did this happen? (rough timeframe helps with context)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#4433FF] font-bold mt-0.5">WHY</span>
              <span className="text-gray-400">
                Why are you scanning? (what you're trying to understand or decide)
              </span>
            </li>
          </ul>

          {/* Warning */}
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}
          >
            <p className="text-xs text-yellow-400">
              Without this context, scans may be rejected or produce less accurate results.
            </p>
          </div>
        </div>
      </MotionDiv>
    </AnimatePresence>
  ) : null;

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Help Icon Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full text-gray-400 hover:text-[#4433FF] hover:bg-[#4433FF]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4433FF]/50"
        title="Context requirements for accurate scans"
        aria-label="Help: Context requirements"
        aria-expanded={isOpen}
      >
        <HelpCircle size={iconSize} />
      </button>

      {/* Popover rendered via Portal at document body */}
      {ReactDOM.createPortal(popoverContent, document.body)}
    </div>
  );
};

export default FrameScanContextHelp;
