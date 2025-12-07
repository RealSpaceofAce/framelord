import React, { useRef, useState, useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface InteractiveHeadlineProps {
  text: string;
  className?: string;
  highlightWords?: string[];
}

export const InteractiveHeadline: React.FC<InteractiveHeadlineProps> = ({ 
  text, 
  className = "",
  highlightWords = []
}) => {
  const words = text.split(" ");

  return (
    <h1 className={`flex flex-wrap justify-center gap-x-4 gap-y-2 ${className}`}>
      {words.map((word, i) => {
        const isHighlight = highlightWords.includes(word.replace(/[.,]/g, '')); // Simple cleanup for matching
        return (
          <Word key={i} word={word} isHighlight={isHighlight} />
        );
      })}
    </h1>
  );
};

const Word: React.FC<{ word: string; isHighlight: boolean }> = ({ word, isHighlight }) => {
  return (
    <span className="flex whitespace-nowrap">
      {word.split("").map((char, i) => (
        <Letter key={i} char={char} isHighlight={isHighlight} />
      ))}
    </span>
  );
};

const Letter: React.FC<{ char: string; isHighlight: boolean }> = ({ char, isHighlight }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(1000);
  
  // Physics for the morph effect - Stiff but bouncy
  const springConfig = { damping: 12, stiffness: 200, mass: 0.8 };
  const d = useSpring(distance, springConfig);

  // Map distance to visual properties
  // EXTREME MORPH: Wider range [0, 250], Larger scale [1.8, 1]
  const scale = useTransform(d, [0, 250], [1.8, 1]);
  const y = useTransform(d, [0, 250], [-20, 0]);
  const opacity = useTransform(d, [0, 400], [1, 0.8]); 
  
  useEffect(() => {
    const calculateDistance = (x: number, y: number) => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.hypot(x - centerX, y - centerY);
            setDistance(dist);
        }
    }

    const handleMouseMove = (e: MouseEvent) => {
      calculateDistance(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length > 0) {
            calculateDistance(e.touches[0].clientX, e.touches[0].clientY);
        }
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
    };
  }, []);

  return (
    <motion.span
      ref={ref}
      style={{ scale, y, opacity } as any}
      className={`
        inline-block origin-bottom transition-colors duration-100 cursor-default select-none
        ${isHighlight 
            ? `text-transparent bg-clip-text bg-gradient-to-br from-fl-primary to-fl-accent` 
            : `text-white`}
      `}
    >
        <span className={`${distance < 150 ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]' : ''} transition-all duration-200`}>
             {char}
        </span>
    </motion.span>
  );
};