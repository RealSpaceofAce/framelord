// =============================================================================
// LITTLE LORD FLOATING BUTTON — Global summon button
// =============================================================================
// Fixed position button that opens the Little Lord global modal.
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Sparkles } from 'lucide-react';

const MotionButton = motion.button as any;

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordFloatingButtonProps {
  onClick: () => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const LittleLordFloatingButton: React.FC<LittleLordFloatingButtonProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <MotionButton
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-[#4433FF] to-[#6655FF] rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-105 transition-all group ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Crown size={24} className="text-white" />

      {/* Pulsing glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#4433FF] opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Tooltip */}
      <div className="absolute right-full mr-3 px-3 py-1.5 bg-[#1A1A1A] border border-[#333] rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Little Lord
        <div className="absolute top-1/2 -translate-y-1/2 left-full w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-[#333]" />
      </div>
    </MotionButton>
  );
};

export default LittleLordFloatingButton;
