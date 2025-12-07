import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  glow = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-8 py-4 rounded-lg font-semibold tracking-wider transition-all duration-300 transform hover:-translate-y-1 font-sans";
  
  const variants = {
    primary: "bg-fl-primary text-white hover:bg-fl-secondary border border-transparent",
    secondary: "bg-fl-deepPurple text-white hover:bg-fl-darkPurple border border-fl-primary/30",
    outline: "bg-transparent border border-fl-primary/50 text-fl-primary hover:border-fl-primary hover:bg-fl-primary/10"
  };

  const glowEffect = glow ? "shadow-[0_0_20px_rgba(68,51,255,0.4)] hover:shadow-[0_0_40px_rgba(68,51,255,0.6)]" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${glowEffect} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};