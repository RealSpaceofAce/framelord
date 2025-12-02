import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const MotionDiv = motion.div as any;

interface RevealProps {
  children: React.ReactNode;
  width?: 'fit-content' | '100%';
  delay?: number;
  className?: string;
}

export const Reveal: React.FC<RevealProps> = ({ children, width = 'fit-content', delay = 0, className = "" }) => {
  const ref = useRef(null);
  // Adjusted margin to -10% for mobile reliability, ensuring content reveals sooner
  const isInView = useInView(ref, { once: true, margin: "-10% 0px -10% 0px" });

  return (
    <div ref={ref} style={{ position: 'relative', width }} className={className}>
      <MotionDiv
        variants={{
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        transition={{ duration: 0.8, delay: delay, ease: [0.25, 0.25, 0.25, 0.75] }}
      >
        {children}
      </MotionDiv>
    </div>
  );
};