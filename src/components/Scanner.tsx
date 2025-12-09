import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { analyzeLandingFrame } from '../lib/frameScan/landingScanAdapter';
import { FrameAnalysisResult } from '../types';
import { Button } from './Button';
import { Loader2, Zap, AlertTriangle, CheckCircle, UploadCloud, Image as ImageIcon, X, ArrowRight, Shield, Scan, Flame } from 'lucide-react';
import { Reveal } from './Reveal';
import { useAudio } from '../hooks/useAudio';
import { toast } from './Toast';
import { useSavageMode } from '../hooks/useSavageMode';

// Bypass strict type checking for motion components
const MotionDiv = motion.div as any;

interface ScannerProps {
  onApply?: () => void;
}

// Input validation helper - checks for garbage/nonsense text
const isValidInput = (text: string): { valid: boolean; reason?: string } => {
  const trimmed = text.trim();

  // Minimum length check (at least 50 characters for meaningful text)
  if (trimmed.length < 50) {
    return { valid: false, reason: 'Not enough context to run a FrameScan. Add real text or upload a file.' };
  }

  // Minimum word count (at least 8 words)
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 8) {
    return { valid: false, reason: 'Not enough words. Enter at least 8 words for proper analysis.' };
  }

  // Check for repeated character patterns (gibberish detection)
  const repeatedPattern = /(.)\1{5,}/;  // 6+ same character in a row
  if (repeatedPattern.test(trimmed)) {
    return { valid: false, reason: 'Invalid text detected. Please enter real communication text.' };
  }

  // Check for too many non-letter characters (likely garbage)
  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const letterRatio = letterCount / trimmed.length;
  if (letterRatio < 0.5) {
    return { valid: false, reason: 'Text contains too many special characters. Enter readable text.' };
  }

  // Check for keyboard mash patterns
  const keyboardMash = /[asdfghjkl]{6,}|[qwertyuiop]{6,}|[zxcvbnm]{6,}/i;
  if (keyboardMash.test(trimmed)) {
    return { valid: false, reason: 'Keyboard patterns detected. Please enter real text.' };
  }

  return { valid: true };
};

export const Scanner: React.FC<ScannerProps> = ({ onApply }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FrameAnalysisResult | null>(null);
  const [isWobbling, setIsWobbling] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Savage Mode
  const { isEnabled: isSavageMode, accentColor } = useSavageMode();

  // Audio
  const { play, stop } = useAudio();

  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3D Tilt Logic
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-15deg", "15deg"]);
  
  const updateTilt = (clientX: number, clientY: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = clientX - rect.left;
    const mouseYPos = clientY - rect.top;
    
    // Calculate normalized position (-0.5 to 0.5)
    const xPct = (mouseXPos / width) - 0.5;
    const yPct = (mouseYPos / height) - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    updateTilt(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
        updateTilt(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Image Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (!input.trim() && !selectedImage) return;

    // Validate text input (skip validation if we have an image)
    if (!selectedImage && input.trim()) {
      const validation = isValidInput(input);
      if (!validation.valid) {
        setValidationError(validation.reason || 'Invalid input');
        toast.error('Invalid Input', validation.reason || 'Please enter valid text');
        return;
      }
    }

    // Clear any previous validation error
    setValidationError(null);

    // Start scan animation and sounds
    setLoading(true);
    setResult(null);
    setIsWobbling(true);
    setScanProgress(0);

    // Play scan start sound
    play('scan_start');

    // Start scan hum (looping)
    play('scan_hum', { loop: true, volume: 0.15 });

    // Simulate progress for visual feedback
    const progressInterval = setInterval(() => {
      setScanProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 200);

    try {
      let imageBase64: string | undefined = undefined;
      let mimeType: string | undefined = undefined;

      if (selectedImage && imageFile) {
        // Extract base64 data (remove "data:image/jpeg;base64," prefix)
        imageBase64 = selectedImage.split(',')[1];
        mimeType = imageFile.type;
      }

      // Use core FrameScan engine via adapter
      const data = await analyzeLandingFrame(input, imageBase64, mimeType);

      // Validate result before proceeding
      if (!data || typeof data.score !== 'number') {
        throw new Error('Invalid scan result: missing score data');
      }

      // Complete progress
      setScanProgress(100);

      // Stop hum, play complete sound
      stop('scan_hum');
      await play('scan_complete');

      // CRITICAL: Set result AFTER audio completes to avoid state clearing race condition
      setResult(data);

      // Show toast notification
      const scoreMessage = data.score < 50
        ? 'Critical frame weaknesses detected'
        : data.score < 80
          ? 'Room for improvement identified'
          : 'Strong frame patterns detected';

      toast.success('Scan Complete', `Score: ${data.score} - ${scoreMessage}`);

    } catch (e) {
      console.error('FrameScan error:', e);
      stop('scan_hum');
      await play('error');

      const errorMessage = e instanceof Error ? e.message : 'Unable to complete analysis. Please try again.';
      toast.error('Scan Failed', errorMessage);

      // Show visual error in UI
      setValidationError(errorMessage);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setIsWobbling(false);
      setScanProgress(0);
    }
  };

  const scoreColor = (score: number) => {
    if (score < 50) return 'text-red-500';
    if (score < 80) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <section className="relative w-full max-w-5xl mx-auto p-4 md:p-12 mb-24 z-20 perspective-[2000px]">
       {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-fl-primary/5 blur-[120px] rounded-full -z-10" />

      <Reveal width="100%">
        <MotionDiv
            ref={ref}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseLeave={handleMouseLeave}
            onTouchEnd={handleMouseLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" } as any}
            animate={isWobbling ? {
              x: [0, -2, 2, -1, 1, 0],
              y: [0, 1, -1, 0.5, -0.5, 0],
            } : {}}
            transition={isWobbling ? {
              duration: 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            } : {}}
            className={`glass-card rounded-2xl p-8 md:p-12 shadow-[0_0_80px_rgba(3,4,18,0.8)] relative overflow-hidden group touch-none transition-all duration-300 border ${loading ? 'border-fl-primary/70 shadow-[0_0_40px_rgba(68,51,255,0.3)]' : 'border-[#1f2f45]'}`}
        >
            {/* Glossy Reflection Gradient */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl z-40" />

            {/* Subtle idle border pulse */}
            <div className="absolute inset-0 border border-fl-primary/0 group-hover:border-fl-primary/50 transition-colors duration-700 rounded-2xl pointer-events-none" />

            {/* Scanning copier beam effect - bright white line that moves down */}
            {loading && (
                <MotionDiv
                    className="absolute left-0 w-full h-1 bg-white shadow-[0_0_20px_#ffffff,0_0_40px_#4433FF,0_0_60px_#4433FF] z-30 pointer-events-none"
                    initial={{ top: '-5%' }}
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
            )}

            {/* Secondary scanning line with glow */}
            {loading && (
                <MotionDiv
                    className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-fl-primary/40 to-transparent z-20 opacity-70 pointer-events-none"
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            )}

            {/* Progress bar at bottom during scan */}
            {loading && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-fl-black/50 z-30">
                    <MotionDiv
                        className="h-full bg-gradient-to-r from-fl-primary to-fl-secondary"
                        initial={{ width: 0 }}
                        animate={{ width: `${scanProgress}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            )}

            {/* Savage Mode Badge */}
            {isSavageMode && (
              <MotionDiv
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-4 right-4 z-50"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm shadow-[0_0_15px_rgba(255,51,68,0.3)] animate-pulse">
                  <Flame size={14} className="text-red-500" />
                  Savage Mode
                </div>
              </MotionDiv>
            )}

            <div className="mb-8 text-center transform translate-z-10" style={{ transform: "translateZ(30px)" }}>
                <h2 className="text-3xl font-display text-white mb-2 tracking-wide">FRAMESCAN</h2>
                <p className="text-fl-text">
                  {isSavageMode
                    ? "Upload a photo or paste a draft. No mercy. No excuses."
                    : "Upload a photo or paste a draft. See how weak you really are."
                  }
                </p>
            </div>

            <div 
                className={`flex flex-col gap-6 relative z-30 transition-all duration-300 ${isDragging ? 'scale-[1.02] ring-2 ring-fl-primary ring-offset-2 ring-offset-fl-black' : ''}`} 
                style={{ transform: "translateZ(20px)" }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Input Area */}
                <div className="relative group/input">
                    {!selectedImage ? (
                        <>
                          <textarea
                              value={input}
                              onChange={(e) => {
                                setInput(e.target.value);
                                if (validationError) setValidationError(null);
                              }}
                              placeholder="Paste your text here... or drop an image to analyze body language."
                              className={`w-full h-40 bg-fl-navy/50 border rounded-lg p-6 text-white placeholder-fl-gray/50 focus:outline-none focus:ring-1 transition-all font-mono text-base resize-none shadow-inner hover:bg-fl-navy/70 ${
                                validationError
                                  ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                                  : 'border-fl-primary/30 focus:border-fl-primary focus:ring-fl-primary'
                              }`}
                          />
                          {/* Validation error message */}
                          {validationError && (
                            <MotionDiv
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute -bottom-6 left-0 flex items-center gap-1.5 text-xs text-red-400"
                            >
                              <AlertTriangle size={12} />
                              {validationError}
                            </MotionDiv>
                          )}
                        </>
                    ) : (
                        <div className="w-full h-64 bg-fl-navy/30 border border-fl-primary/50 rounded-lg overflow-hidden relative flex items-center justify-center group/image">
                             <img src={selectedImage} alt="Preview" className="h-full w-full object-contain opacity-80 group-hover/image:opacity-100 transition-opacity" />
                             <div className="absolute inset-0 bg-gradient-to-t from-fl-black/80 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                <p className="text-white font-display text-sm mb-1"><span className="text-fl-primary">ANALYSIS MODE:</span> VISUAL FRAME</p>
                                <p className="text-fl-text text-xs font-mono truncate">{input || "No context provided"}</p>
                             </div>
                             <button 
                                onClick={clearImage}
                                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                             >
                                <X size={16} />
                             </button>
                        </div>
                    )}

                    {/* Upload Overlay/Button */}
                    {!selectedImage && (
                        <div className="absolute bottom-4 right-4 flex gap-2">
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="image/*" 
                                className="hidden" 
                             />
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 bg-fl-primary/10 hover:bg-fl-primary/30 text-fl-primary hover:text-white rounded-md transition-all border border-fl-primary/20 hover:border-fl-primary"
                                title="Upload Image Analysis"
                             >
                                <ImageIcon size={20} />
                             </button>
                        </div>
                    )}
                    
                    {/* Context Input when Image is selected */}
                    {selectedImage && (
                         <div className="mt-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Optional: Add context about this image (e.g., 'Sales call screenshot', 'Profile picture')..."
                                className="w-full bg-fl-navy/50 border border-fl-primary/30 rounded-lg p-4 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-primary font-mono text-sm"
                            />
                         </div>
                    )}
                </div>
            
                <div className="flex justify-center">
                    <Button 
                        onClick={handleScan} 
                        disabled={loading || (!input && !selectedImage)}
                        glow
                        className="w-full md:w-auto min-w-[240px] relative overflow-hidden"
                    >
                    {loading ? (
                        <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="animate-spin" size={20} /> ANALYZING {selectedImage ? 'VISUALS' : 'PATTERNS'}...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 justify-center">
                            <Zap size={20} /> RUN DIAGNOSTIC
                        </span>
                    )}
                    </Button>
                </div>
            </div>

            <AnimatePresence>
            {result && (
                <MotionDiv
                initial={{ opacity: 0, height: 0, y: 30 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-12 border-t border-fl-primary/20 pt-8"
                style={{ transform: "translateZ(40px)" }}
                >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Score Panel */}
                    <div className="flex flex-col items-center justify-center p-8 bg-fl-navy/30 rounded-xl border border-fl-primary/10 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-fl-primary/5 pointer-events-none" />
                        <span className="text-fl-gray text-xs uppercase tracking-[0.2em] mb-4">
                            {selectedImage ? "Visual FrameScore" : "FrameScore"}
                        </span>
                        <MotionDiv 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", delay: 0.2 }}
                            className={`text-7xl font-display font-bold ${scoreColor(result.score)} drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]`}
                        >
                            {result.score}
                        </MotionDiv>
                        <div className="w-full mt-6 space-y-3">
                            {Object.entries(result.subscores).map(([key, val], idx) => (
                                <div key={key} className="flex items-center justify-between text-xs text-fl-text">
                                    <span className="uppercase tracking-wider opacity-80">{key.replace('_', ' ')}</span>
                                    <div className="flex items-center gap-3 w-32">
                                        <div className="h-1.5 bg-gray-800 flex-1 rounded-full overflow-hidden">
                                            <MotionDiv 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${val}%` }}
                                                transition={{ duration: 1, delay: 0.4 + (idx * 0.1) }}
                                                className={`h-full ${val > 70 ? 'bg-fl-primary' : 'bg-fl-accent'}`}
                                            />
                                        </div>
                                        <span className="w-6 text-right font-mono">{val}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Analysis Panel */}
                    <div className="md:col-span-2 space-y-6">
                        <MotionDiv 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-red-950/20 border-l-2 border-red-500/80 p-6 rounded-r-lg hover:bg-red-950/30 transition-colors"
                        >
                            <h4 className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase mb-2 tracking-wide">
                                <AlertTriangle size={16} /> {result.critical_signal?.title || "Leak Detected"}
                            </h4>
                            <p className="text-fl-text text-sm leading-relaxed mb-3">{result.critical_signal?.description}</p>
                            {result.critical_signal?.quotes && result.critical_signal.quotes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {result.critical_signal.quotes.map((quote, i) => (
                                        <span key={i} className="text-xs bg-red-500/10 text-red-300 px-2 py-1 rounded border border-red-500/20 italic">
                                            "{quote}"
                                        </span>
                                    ))}
                                </div>
                            )}
                        </MotionDiv>

                        <MotionDiv 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="bg-green-950/20 border-l-2 border-green-500/80 p-6 rounded-r-lg hover:bg-green-950/30 transition-colors"
                        >
                            <h4 className="flex items-center gap-2 text-green-400 font-bold text-sm uppercase mb-2 tracking-wide">
                                <CheckCircle size={16} /> Recommended Fixes
                            </h4>
                            <ul className="space-y-2 mt-2">
                                {result.corrections && result.corrections.map((correction, idx) => (
                                    <li key={idx} className="text-white font-medium text-base leading-relaxed font-display flex items-start gap-2">
                                        <span className="text-green-500 mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"/>
                                        {correction}
                                    </li>
                                ))}
                            </ul>
                        </MotionDiv>

                        {/* ELITE CTA - Only appears if onApply is provided */}
                        {onApply && (
                            <MotionDiv
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="mt-8 p-1 bg-gradient-to-r from-fl-primary to-fl-accent rounded-lg cursor-pointer group shadow-[0_0_25px_rgba(68,51,255,0.15)] hover:shadow-[0_0_40px_rgba(68,51,255,0.3)] transition-shadow"
                                onClick={onApply}
                            >
                                <div className="bg-fl-black/90 p-6 rounded-md flex items-center justify-between group-hover:bg-fl-black/80 transition-colors">
                                    <div>
                                        <h4 className="text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2 mb-1">
                                            <Shield size={16} className="text-fl-primary" />
                                            Elite Intervention Recommended
                                        </h4>
                                        <p className="text-fl-text text-xs">
                                            Your frame leaks are structural. Software can't fix mindset. Apply for a manual strategy audit.
                                        </p>
                                    </div>
                                    <div className="bg-fl-primary/20 p-2 rounded-full group-hover:bg-fl-primary group-hover:text-white transition-all">
                                        <ArrowRight size={20} className="text-fl-primary group-hover:text-white" />
                                    </div>
                                </div>
                            </MotionDiv>
                        )}
                    </div>
                </div>
                </MotionDiv>
            )}
            </AnimatePresence>
        </MotionDiv>
      </Reveal>
    </section>
  );
};
