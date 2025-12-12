import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Send, Mic, MicOff } from 'lucide-react';

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

  // Voice dictation state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState(''); // Show real-time feedback
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'waiting' | 'active' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);
  const wantsToListenRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false); // Prevent double init in StrictMode
  const hasReceivedResultRef = useRef(false);

  // 1-minute max recording time
  const MAX_RECORDING_MS = 60000;
  const NO_SPEECH_TIMEOUT_MS = 5000; // Show warning after 5 seconds of no speech

  // Check if browser supports Web Speech API
  const isSpeechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Helper to stop recording
  const stopListening = useCallback(() => {
    wantsToListenRef.current = false;
    hasReceivedResultRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
    setInterimText('');
    setVoiceStatus('idle');
  }, []);

  // Set up speech recognition (once)
  useEffect(() => {
    if (!isSpeechSupported || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      if (!event.results) return;

      // Mark that we've received speech
      if (!hasReceivedResultRef.current) {
        hasReceivedResultRef.current = true;
        setVoiceStatus('active');
        // Clear the no-speech timeout since we got results
        if (noSpeechTimeoutRef.current) {
          clearTimeout(noSpeechTimeoutRef.current);
          noSpeechTimeoutRef.current = null;
        }
      }

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Update interim text for real-time feedback
      setInterimText(interimTranscript);

      // Commit final transcript to textarea
      if (finalTranscript) {
        setText(prev => {
          const trimmed = prev.trim();
          return trimmed ? trimmed + ' ' + finalTranscript : finalTranscript;
        });
        setInterimText('');
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Voice] Error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'aborted') {
        setVoiceStatus('error');
        stopListening();
      }
    };

    recognition.onend = () => {
      // Auto-restart if user still wants to listen (and under time limit)
      if (wantsToListenRef.current) {
        try {
          recognition.start();
        } catch (e) {
          stopListening();
        }
      } else {
        setIsListening(false);
        setInterimText('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isInitializedRef.current = false;
      wantsToListenRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [isSpeechSupported, stopListening]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      stopListening();
    } else {
      // Start listening with 1-minute timeout
      wantsToListenRef.current = true;
      hasReceivedResultRef.current = false;
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setVoiceStatus('waiting');

        // Auto-stop after 1 minute
        timeoutRef.current = setTimeout(() => {
          console.log('[Voice] 1-minute limit reached');
          stopListening();
        }, MAX_RECORDING_MS);

        // Show warning if no speech detected after 5 seconds
        noSpeechTimeoutRef.current = setTimeout(() => {
          if (!hasReceivedResultRef.current && wantsToListenRef.current) {
            setVoiceStatus('error');
          }
        }, NO_SPEECH_TIMEOUT_MS);
      } catch (e) {
        console.error('[Voice] Start failed:', e);
        setVoiceStatus('error');
        stopListening();
      }
    }
  }, [isListening, stopListening]);

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

        {/* Voice Listening Indicator */}
        {isListening && (
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`absolute bottom-4 left-4 right-4 flex items-center gap-3 px-4 py-2 rounded-lg border ${
              voiceStatus === 'error'
                ? 'bg-amber-500/10 border-amber-500/30'
                : voiceStatus === 'active'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                voiceStatus === 'error' ? 'bg-amber-500' : voiceStatus === 'active' ? 'bg-emerald-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs font-medium ${
                voiceStatus === 'error' ? 'text-amber-400' : voiceStatus === 'active' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {voiceStatus === 'error'
                  ? 'No speech detected - try speaking closer to mic'
                  : voiceStatus === 'active'
                  ? 'Transcribing...'
                  : 'Listening...'}
              </span>
            </div>
            {interimText && (
              <span className="text-sm text-fl-gray/70 italic truncate flex-1">
                {interimText}
              </span>
            )}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Voice Dictation Button - only if browser supports it */}
          {isSpeechSupported && !isAnalyzing && !disabled && (
            <button
              onClick={toggleVoice}
              type="button"
              className={`p-2 rounded-lg transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-fl-navy/50 text-fl-gray hover:text-white hover:bg-fl-navy border border-fl-gray/30'
              }`}
              title={isListening ? 'Stop dictating' : 'Start voice dictation'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

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
    </div>
  );
};
