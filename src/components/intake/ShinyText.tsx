import React from 'react';
import './ShinyText.css';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  className?: string;
  speed?: number; // seconds per animation cycle
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  className = '',
  speed = 5,
}) => {
  const animationDuration = `${speed}s`;

  return (
    <span
      className={`shiny-text ${disabled ? 'disabled' : ''} ${className}`}
      style={{ animationDuration }}
    >
      {text}
    </span>
  );
};
