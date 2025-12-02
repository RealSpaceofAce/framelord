import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal, ShieldAlert, CheckCircle, Lock, Cpu } from 'lucide-react';
import { Button } from './Button';
import { Reveal } from './Reveal';
import { ChatMessage } from '../types';
import { submitApplicationChat } from '../services/geminiService';

const MotionDiv = motion.div as any;

export const ApplicationPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: "Identity Verified. \n\nI am the Case Officer for the FrameLord Strategy Unit. We only accept 5 new clients per month for manual frame reconstruction. \n\nState your name and profession to begin qualification.", timestamp: Date.now() }
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
      const responseText = await submitApplicationChat(messages, userMsg.content);
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
    <div className="min-h-screen pt-24 px-4 pb-12 relative z-20 flex flex-col items-center justify-center">
      
      {/* Header */}
      <Reveal width="100%" className="max-w-4xl mx-auto text-center mb-8">
        <div className="flex items-center justify-center gap-2 text-fl-primary mb-4">
            <ShieldAlert size={20} className="animate-pulse" />
            <span className="text-xs font-bold tracking-[0.3em] uppercase">Restricted Access Area</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-display text-white mb-4">
          CASE <span className="text-transparent bg-clip-text bg-gradient-to-r from-fl-primary to-fl-accent">APPLICATION</span>
        </h1>
        <p className="text-fl-text max-w-xl mx-auto">
          The software detects the leaks. We fix the source. Apply for manual intervention and 1-on-1 strategy implementation.
        </p>
      </Reveal>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: The Pitch */}
        <Reveal width="100%" delay={0.2} className="h-full">
          <div className="bg-fl-black/60 backdrop-blur-xl border border-fl-primary/20 rounded-2xl p-8 h-full flex flex-col relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-fl-primary to-transparent opacity-50" />
             
             <h3 className="text-xl font-display text-white mb-6 flex items-center gap-2">
                <Cpu size={20} className="text-fl-accent" />
                PROTOCOL: ELITE
             </h3>

             <div className="space-y-6 flex-grow">
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-secondary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">Manual Audits</h4>
                        <p className="text-fl-text text-sm mt-1">We manually review your sales calls and DM logs to find the hidden patterns AI misses.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-secondary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">Reconstruction</h4>
                        <p className="text-fl-text text-sm mt-1">We rebuild your core offer scripts and profile bio to project maximum authority.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="mt-1"><CheckCircle size={18} className="text-fl-secondary" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm uppercase tracking-wide">War Room Access</h4>
                        <p className="text-fl-text text-sm mt-1">Direct line to senior strategists for emergency response drafting during high-stakes deals.</p>
                    </div>
                </div>
             </div>

             <div className="mt-8 pt-8 border-t border-white/5">
                <Button variant="outline" onClick={onBack} className="w-full text-xs">
                    ← Return to Software
                </Button>
             </div>
          </div>
        </Reveal>

        {/* Right Column: AI Chat Interface */}
        <Reveal width="100%" delay={0.4} className="lg:col-span-2 h-[600px]">
          <div className="bg-fl-navy/40 backdrop-blur-xl border border-fl-primary/30 rounded-2xl flex flex-col h-full shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            {/* CRT Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))]" style={{ backgroundSize: '100% 2px, 3px 100%' }} />
            
            {/* Header */}
            <div className="h-14 bg-fl-black/80 border-b border-fl-primary/20 flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-fl-primary font-mono text-xs tracking-widest uppercase">Encrypted Connection</span>
                </div>
                <div className="flex items-center gap-2 text-fl-gray text-xs font-mono">
                    <Lock size={12} />
                    SECURE CHANNEL
                </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-6 space-y-4 font-mono text-sm scroll-smooth">
                {messages.map((msg, idx) => (
                    <MotionDiv 
                        key={idx}
                        initial={{ opacity: 0, x: msg.role === 'ai' ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] p-4 rounded-lg relative ${
                            msg.role === 'user' 
                            ? 'bg-fl-primary/20 border border-fl-primary/40 text-white rounded-br-none' 
                            : 'bg-fl-black/60 border border-fl-gray/20 text-fl-text rounded-bl-none'
                        }`}>
                            {msg.role === 'ai' && (
                                <span className="absolute -top-3 left-0 text-[10px] text-fl-accent bg-fl-black px-1 border border-fl-accent/20 rounded">CASE OFFICER</span>
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
                            <span className="w-1.5 h-1.5 bg-fl-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-fl-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-fl-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                    </MotionDiv>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-fl-black/50 border-t border-fl-primary/20">
                <div className="relative flex items-center">
                    <Terminal size={18} className="absolute left-4 text-fl-gray" />
                    <input 
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your response..."
                        disabled={isTyping}
                        className="w-full bg-fl-navy/60 border border-fl-primary/30 rounded-lg pl-12 pr-12 py-4 text-white placeholder-fl-gray/50 focus:outline-none focus:border-fl-primary focus:ring-1 focus:ring-fl-primary transition-all font-mono"
                        autoFocus
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 p-2 bg-fl-primary/20 hover:bg-fl-primary text-fl-primary hover:text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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