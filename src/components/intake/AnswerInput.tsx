import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send } from 'lucide-react';

const MotionDiv = motion.div as any;

interface AnswerInputProps {
  onSubmit: (text: string) => void;
  isAnalyzing: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  inputType?: 'text' | 'slider';  // Input mode
  minValue?: number;              // For slider
  maxValue?: number;              // For slider
}

export const AnswerInput: React.FC<AnswerInputProps> = ({
  onSubmit,
  isAnalyzing,
  minLength = 80,
  maxLength = 800,
  placeholder = 'Type your answer here...',
  hint,
  disabled = false,
  inputType = 'text',
  minValue = 1,
  maxValue = 10,
}) => {
  const [text, setText] = useState('');
  const [sliderValue, setSliderValue] = useState<number>(Math.ceil((minValue + maxValue) / 2));

  const handleSubmit = () => {
    if (inputType === 'slider') {
      // Slider always has a valid value
      if (isAnalyzing || disabled) return;
      onSubmit(String(sliderValue));
      return;
    }

    const trimmed = text.trim();
    const length = trimmed.length;

    // Simple validation - all questions are mandatory
    const isTooShort = length > 0 && length < minLength;
    const isEmpty = length === 0;
    const isValid = !isEmpty && !isTooShort && length <= maxLength;

    if (!isValid || isAnalyzing || disabled) return;

    onSubmit(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to submit, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Validation logic - simplified to character length only
  const length = text.trim().length;
  const isTooShort = length > 0 && length < minLength;
  const isEmpty = length === 0;
  const isValid = !isEmpty && !isTooShort && length <= maxLength;

  // Progress is relative to maxLength
  const progress = Math.min(100, (length / maxLength) * 100);

  // Visual state for the progress bar
  const getProgressState = (): 'empty' | 'building' | 'ready' | 'overflow' => {
    if (length === 0) return 'empty';
    if (isTooShort) return 'building';
    if (length > maxLength) return 'overflow';
    return 'ready';
  };

  const progressState = getProgressState();

  // Development debugging
  if (process.env.NODE_ENV === 'development' && !isValid && length > 0) {
    console.log('[AnswerInput] Validation:', {
      length,
      minLength,
      maxLength,
      isTooShort,
      isEmpty,
      isValid,
    });
  }

  // For slider input type
  if (inputType === 'slider') {
    const sliderIsValid = !isAnalyzing && !disabled;

    return (
      <div className="space-y-6">
        {/* Slider Input */}
        <div className="bg-fl-navy/30 border border-fl-primary/20 rounded-xl p-8">
          {/* Current Value Display */}
          <div className="text-center mb-8">
            <MotionDiv
              key={sliderValue}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-7xl font-display font-bold text-fl-primary"
            >
              {sliderValue}
            </MotionDiv>
            <p className="text-fl-gray mt-2 text-sm">
              {sliderValue <= 3 ? 'Fragile frame' : sliderValue <= 6 ? 'Developing frame' : sliderValue <= 8 ? 'Strong frame' : 'Apex frame'}
            </p>
          </div>

          {/* Slider Track */}
          <div className="relative px-4">
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={sliderValue}
              onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
              disabled={isAnalyzing || disabled}
              className="w-full h-3 bg-fl-navy rounded-full appearance-none cursor-pointer accent-fl-primary
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-8
                [&::-webkit-slider-thumb]:h-8
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-fl-primary
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(68,51,255,0.5)]
                [&::-webkit-slider-thumb]:border-4
                [&::-webkit-slider-thumb]:border-fl-black
                [&::-moz-range-thumb]:w-8
                [&::-moz-range-thumb]:h-8
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-fl-primary
                [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:border-4
                [&::-moz-range-thumb]:border-fl-black
                disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Scale Labels */}
            <div className="flex justify-between mt-3 text-xs text-fl-gray">
              <span>{minValue}</span>
              <span className="text-fl-gray/50">Fragile</span>
              <span className="text-fl-gray/50">Developing</span>
              <span className="text-fl-gray/50">Strong</span>
              <span>{maxValue}</span>
            </div>
          </div>
        </div>

        {/* Hint & Submit */}
        <div className="flex items-center justify-between">
          <div className="text-sm">
            {hint ? (
              <span className="text-fl-gray/70">{hint}</span>
            ) : (
              <span className="text-fl-gray/70">Slide to select your self-assessment</span>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!sliderIsValid}
            className={`px-6 py-3 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
              sliderIsValid
                ? 'bg-fl-primary hover:bg-fl-primary/80 text-white shadow-[0_0_15px_rgba(68,51,255,0.3)] hover:shadow-[0_0_25px_rgba(68,51,255,0.5)]'
                : 'bg-fl-gray/20 text-fl-gray/50 cursor-not-allowed'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing
              </>
            ) : (
              <>
                <Send size={16} />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Text input (default)
  return (
    <div className="space-y-3">
      {/* Text Area */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isAnalyzing || disabled}
          maxLength={maxLength + 50} // Allow slight overage for feedback
          className={`w-full min-h-[200px] bg-fl-navy/50 border rounded-lg p-6 text-white placeholder-fl-gray/50 focus:outline-none focus:ring-1 transition-all font-mono text-base resize-none shadow-inner ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-fl-gray/20'
              : isAnalyzing
              ? 'border-fl-primary/50 animate-pulse cursor-wait'
              : progressState === 'ready'
              ? 'border-fl-primary/30 focus:border-fl-primary focus:ring-fl-primary'
              : progressState === 'overflow'
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500'
              : 'border-fl-gray/30 focus:border-fl-gray focus:ring-fl-gray'
          }`}
        />

        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-fl-primary/20 px-3 py-1.5 rounded-full border border-fl-primary/50"
          >
            <Loader2 size={14} className="animate-spin text-fl-primary" />
            <span className="text-xs text-fl-primary font-medium">Analyzing...</span>
          </MotionDiv>
        )}
      </div>

      {/* Progress Bar (subtle, no counter) */}
      <div className="h-1 bg-fl-navy/50 rounded-full overflow-hidden">
        <MotionDiv
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
          className={`h-full transition-colors ${
            progressState === 'ready'
              ? 'bg-fl-primary'
              : progressState === 'overflow'
              ? 'bg-red-500'
              : 'bg-fl-gray/50'
          }`}
        />
      </div>

      {/* Hint Text & Actions */}
      <div className="flex items-center justify-between">
        {/* Hint / Validation Feedback */}
        <div className="text-sm">
          {isTooShort ? (
            <span className="text-amber-400">Answer is too short. Add more detail.</span>
          ) : length > maxLength ? (
            <span className="text-red-400">Answer is too long. Trim it slightly.</span>
          ) : hint ? (
            <span className="text-fl-gray/70">{hint}</span>
          ) : (
            <span className="text-fl-gray/70">
              Press{' '}
              <kbd className="px-1 py-0.5 bg-fl-navy/50 border border-fl-gray/30 rounded text-fl-gray/80 font-mono text-xs">
                Enter
              </kbd>{' '}
              to submit,{' '}
              <kbd className="px-1 py-0.5 bg-fl-navy/50 border border-fl-gray/30 rounded text-fl-gray/80 font-mono text-xs">
                Shift+Enter
              </kbd>{' '}
              for newline
            </span>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || isAnalyzing || disabled}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all ${
            isValid && !isAnalyzing && !disabled
              ? 'bg-fl-primary hover:bg-fl-primary/80 text-white shadow-[0_0_15px_rgba(68,51,255,0.3)] hover:shadow-[0_0_25px_rgba(68,51,255,0.5)]'
              : 'bg-fl-gray/20 text-fl-gray/50 cursor-not-allowed'
          }`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing
            </>
          ) : (
            <>
              <Send size={16} />
              Submit
            </>
          )}
        </button>
      </div>
    </div>
  );
};
