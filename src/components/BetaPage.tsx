import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Terminal, TestTube, CheckCircle, Lock, Microscope } from 'lucide-react';
import { Button } from './Button';
import { Reveal } from './Reveal';
import { ChatMessage } from '../types';
import { submitBetaApplicationChat } from '../lib/llm/geminiService';

const MotionDiv = motion.div as any;

export const BetaPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: "Connection Established. \n\nI am the Beta Program Director. We are currently screening users for the V2.0 Vanguard Protocol. \n\nState your name and primary use case to begin the screening process.", timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const responseText = await submitBetaApplicationChat(messages, userMsg.content);
      const aiMsg: ChatMessage = { role: 'ai', content: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 relative z-20 flex flex-col items-center justify-center app-neon">
      
      {/* Header */}
      <Reveal width="100%" className="max-w-4xl mx-auto text-center mb-8">
        <div className="flex items-center justify-center gap-2 text-fl-secondary mb-4">
            <TestTube size={20} className="animate-pulse" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase">Vanguard Protocol V2.0</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-display text-white mb-4">
          BETA <span className="text-transparent bg-clip-text bg-gradient-to-r from-fl-secondary to-fl-primary">PROGRAM</span>
        </h1>
        <p className="text-fl-text max-w-xl mx-auto">
          Join the inner circle. Test unreleased features, shape the algorithm, and secure grandfathered access for life.
        </p>
      </Reveal>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: The Pitch */}
        <Reveal width="100%" delay={0.2} className="h-full">
          <div className="glass-card rounded-2xl p-8 h-full flex flex-col relative overflow-hidden border border-[#1f2f45]">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fl-secondary to-transparent opacity-50" />
             
             <h3 className="text-xl font-display text-white mb-6 flex items-center gap-2">
                <Microscope size={20} className="text-fl-secondary" />
                CLEARANCE LEVEL: TESTER
             </h3>

             <div className="space-y-6 flex-grow">
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-primary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">Experimental Tools</h4>
                        <p className="text-fl-text text-sm mt-1">Access features 3 months before public release, including real-time voice analysis.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-primary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">Direct Feedback Loop</h4>
                        <p className="text-fl-text text-sm mt-1">Your bug reports and feature requests go directly to the Lead Engineer, not support.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-primary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">Legacy Status</h4>
                        <p className="text-fl-text text-sm mt-1">Beta testers lock in the "Early Adopter" rate forever, even as prices increase.</p>
                    </div>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-white/5">
                <Button variant="outline" onClick={onBack} className="w-full text-xs">
                    ← Return to Home
                </Button>
             </div>
          </div>
        </Reveal>

        {/* Right Column: AI Chat Interface */}
        <Reveal width="100%" delay={0.4} className="lg:col-span-2 h-[600px]">
          <div className="glass-card rounded-2xl flex flex-col h-full shadow-[0_0_50px_rgba(0,0,0,0.45)] relative overflow-hidden border border-[#1f2f45]">
            {/* Grid Effect */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-5 bg-[linear-gradient(90deg,rgba(115,122,255,0.1)_1px,transparent_1px),linear-gradient(rgba(115,122,255,0.1)_1px,transparent_1px)]" style={{ backgroundSize: '20px 20px' }} />
            
            {/* Header */}
            <div className="h-14 bg-fl-black/80 border-b border-fl-secondary/20 flex items-center justify-between px-6 relative z-20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-fl-secondary animate-pulse" />
                    <span className="text-fl-secondary font-mono text-xs tracking-widest uppercase">Dev Channel Open</span>
                </div>
                <div className="flex items-center gap-2 text-fl-gray text-xs font-mono">
                    <Lock size={12} />
                    ENCRYPTED
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 font-mono text-sm scroll-smooth relative z-20">
                {messages.map((msg, idx) => (
                    <MotionDiv 
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] p-4 rounded-lg relative ${
                            msg.role === 'user' 
                            ? 'bg-fl-secondary/20 border border-fl-secondary/40 text-white rounded-br-none' 
                            : 'bg-fl-black/60 border border-fl-gray/20 text-fl-text rounded-bl-none'
                        }`}>
                            {msg.role === 'ai' && (
                                <span className="absolute -top-3 left-0 text-[10px] text-fl-secondary bg-fl-black px-1 border border-fl-secondary/20 rounded">DIRECTOR</span>
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed">
                                {msg.content}
                            </div>
                        </div>
                    </MotionDiv>
                ))}
                
                {isTyping && (
                    <MotionDiv 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-fl-black/60 border border-fl-gray/20 text-fl-text rounded-lg p-3 rounded-bl-none flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 bg-fl-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-fl-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-fl-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </MotionDiv>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-fl-black/50 border-t border-fl-secondary/20 relative z-20">
                <div className="relative flex items-center">
                    <Terminal size={18} className="absolute left-4 text-fl-gray" />
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type response..."
                        disabled={isTyping}
                        className="w-full bg-fl-navy/60 border border-fl-secondary/30 rounded-lg pl-12 pr-12 py-4 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-secondary focus:ring-1 focus:ring-fl-secondary transition-all font-mono"
                        autoFocus
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-fl-secondary/20 hover:bg-fl-secondary text-fl-secondary hover:text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
};
