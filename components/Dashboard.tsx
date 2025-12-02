
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  LayoutGrid, Scan, Users, Settings, 
  TrendingUp, TrendingDown, 
  Bot, Zap, 
  Menu, ExternalLink, Shield, Lock, 
  Plus, MoreHorizontal, X, Folder, Layers, ChevronDown,
  Upload, Image as ImageIcon, FileText, ArrowRight, AlertTriangle, Lightbulb,
  CheckCircle, Loader2, Paperclip, Mic, FileCode, Crosshair, Binary, Terminal, Cpu, GitCommit, Briefcase, Camera, Notebook, ArrowLeft, Clock as ClockIcon, User
} from 'lucide-react';
import { SparkBorder } from './SparkSystem';
import { analyzeFrame } from '../services/geminiService';
import { FrameAnalysisResult } from '../types';
import { Reveal } from './Reveal';
import { ContactsView } from './crm/ContactsView';
import { CasesView } from './crm/CasesView';
import { PipelinesView } from './crm/PipelinesView';
import { GroupsProjectsView } from './crm/GroupsProjectsView';
import { NotesView } from './crm/NotesView';
import { ThreeParticles } from './ThreeParticles';
import { ContactDossierView } from './crm/ContactDossierView';
import { getContactZero, CONTACT_ZERO, getContactById } from '../services/contactStore';

const MotionDiv = motion.div as any;
const MotionAside = motion.aside as any;
const MotionPath = motion.path as any;

// RETRO COMPUTER COMPONENT (SPINNING TV)
const RetroComputer: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={`relative w-32 h-32 ${className}`}>
            <svg viewBox="0 0 200 200" className="w-full h-full animate-[spin_10s_linear_infinite]" style={{ transformStyle: 'preserve-3d' }}>
                <defs>
                    <linearGradient id="wireframe" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4433FF" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#6A82FC" stopOpacity="0.3" />
                    </linearGradient>
                </defs>
                {/* Simplified Wireframe Monitor Shape */}
                <path d="M40,50 L160,50 L160,130 L40,130 Z" fill="none" stroke="url(#wireframe)" strokeWidth="2" />
                <path d="M40,50 L60,30" fill="none" stroke="url(#wireframe)" strokeWidth="1" />
                <path d="M160,50 L140,30" fill="none" stroke="url(#wireframe)" strokeWidth="1" />
                <path d="M160,130 L140,150" fill="none" stroke="url(#wireframe)" strokeWidth="1" />
                <path d="M40,130 L60,150" fill="none" stroke="url(#wireframe)" strokeWidth="1" />
                <rect x="60" y="30" width="80" height="120" fill="none" stroke="url(#wireframe)" strokeWidth="1" />
            </svg>
        </div>
    );
};

const ClockWidget: React.FC<{ time: Date }> = ({ time }) => (
    <div className="p-6 border-b border-[#2A2A2A] relative overflow-hidden group">
        <div className="absolute inset-0 bg-blue-900/5 group-hover:bg-blue-900/10 transition-colors" />
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <div className="text-4xl font-display font-bold text-white tracking-tighter tabular-nums">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
                <div className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-widest flex items-center gap-2">
                    <ClockIcon size={10} />
                    {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
                <div className="mt-4 text-[10px] font-bold text-[#4433FF] uppercase tracking-widest">
                    NEW YORK, USA
                </div>
            </div>
            <RetroComputer className="w-20 h-20 opacity-50" />
        </div>
    </div>
);

const NotificationWidget: React.FC = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">System Log</div>
        <div className="flex gap-3 items-start p-3 bg-[#1A1A1D] rounded border border-[#333] hover:border-[#4433FF]/50 transition-colors cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0 animate-pulse" />
            <div>
                <div className="text-xs text-white font-bold">Analysis Complete</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Contact "Sarah Chen" frame score updated.</div>
            </div>
        </div>
        <div className="flex gap-3 items-start p-3 bg-[#1A1A1D] rounded border border-[#333] hover:border-orange-500/50 transition-colors cursor-pointer">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
            <div>
                <div className="text-xs text-white font-bold">Action Required</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Review pending case files.</div>
            </div>
        </div>
    </div>
);

const ShootingStarBorder: React.FC<{ children: React.ReactNode, color?: string, className?: string }> = ({ children, color, className }) => {
    return (
        <div className={`relative group rounded-xl p-[1px] overflow-hidden ${className}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-${color === 'blue' ? 'blue-500' : 'white'}/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} style={{ background: `linear-gradient(90deg, transparent, ${color === 'blue' ? '#4433FF' : '#FFF'}, transparent)`}} />
            <div className="relative bg-[#0E0E0E] rounded-xl h-full">
                {children}
            </div>
        </div>
    );
};

const SpotlightCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = "" }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;

    const div = divRef.current;
    const rect = div.getBoundingClientRect();

    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(68, 51, 255, 0.15), transparent 40%)`,
        }}
      />
      {children}
    </div>
  );
};

const EnergyFloor: React.FC = () => (
    <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-0 overflow-hidden rounded-b-xl">
        <div className="absolute inset-0 bg-gradient-to-t from-[#4433FF]/20 via-[#4433FF]/5 to-transparent z-10" />
        <div className="absolute inset-0 z-0 opacity-50">
            <ThreeParticles forcedShape="sphere" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#4433FF] shadow-[0_0_20px_#4433FF]" />
    </div>
);

const ScanView: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FrameAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x);
  const mouseY = useSpring(y);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-3deg", "3deg"]);

  const handleMouseMove = (e: React.MouseEvent) => {
      if(!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleScan = async () => {
      setLoading(true);
      try {
          const res = await analyzeFrame(input);
          setResult(res);
      } catch (e) { console.error(e) } 
      finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 relative h-full flex flex-col justify-center">
       <Reveal width="100%">
       <ShootingStarBorder color="blue">
       <SpotlightCard>
       <MotionDiv
         ref={ref}
         onMouseMove={handleMouseMove}
         style={{ rotateX, rotateY, transformStyle: "preserve-3d" } as any}
         className="relative bg-[#1a1a2e]/60 backdrop-blur-2xl border border-[#4433FF]/30 rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden group min-h-[550px] flex flex-col"
       >
          <div className="absolute inset-0 pointer-events-none z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(68, 51, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(68, 51, 255, 0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="flex justify-between items-center mb-8 border-b border-[#4433FF]/20 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                  <Scan size={28} className="text-[#4433FF]" />
                  <h2 className="text-3xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#737AFF]">FRAME SCAN</h2>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-[#737AFF]">
                  <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${loading ? 'bg-[#4433FF] animate-ping' : 'bg-green-500'}`} />
                      {loading ? 'ANALYZING...' : 'SYSTEM READY'}
                  </div>
                  <span className="bg-[#4433FF]/20 px-2 py-1 rounded text-[#4433FF] font-bold">V.2.0.4</span>
              </div>
          </div>

          <div className="relative z-10 flex-1">
              <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="PASTE TEXT, OR DROP IMAGE/AUDIO/DOCS HERE TO SCAN..."
                  className="w-full h-48 bg-[#0A0A1F]/60 border border-[#4433FF]/30 rounded-lg p-6 text-white placeholder-[#737AFF]/50 focus:outline-none focus:border-[#4433FF] transition-all font-mono text-sm resize-none shadow-inner"
              />
              <div className="absolute bottom-4 right-4 flex gap-2">
                  <input type="file" className="hidden" ref={fileInputRef} />
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-[#4433FF]/20 hover:bg-[#4433FF] border border-[#4433FF] text-white text-xs font-bold px-3 py-1.5 rounded transition-all">
                      <Upload size={12} /> UPLOAD FILES
                  </button>
              </div>
          </div>

          <div className="mt-8 flex justify-center relative z-20">
              <button 
                onClick={handleScan}
                disabled={loading}
                className="relative overflow-hidden group/btn px-12 py-5 bg-[#4433FF] rounded-lg text-white font-display font-bold tracking-[0.15em] text-lg shadow-[0_0_30px_rgba(68,51,255,0.6)] hover:scale-105 transition-all"
              >
                  <span className="relative z-10 flex items-center gap-3">
                      {loading ? <Loader2 className="animate-spin" /> : <Zap className="fill-white" />} INITIATE SCAN
                  </span>
              </button>
          </div>

          <EnergyFloor />

       </MotionDiv>
       </SpotlightCard>
       </ShootingStarBorder>
       </Reveal>
       
       <AnimatePresence>
            {result && (
                <MotionDiv
                initial={{ opacity: 0, height: 0, y: 30 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-12 border-t border-fl-primary/20 pt-8"
                >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center justify-center p-8 bg-fl-navy/30 rounded-xl border border-fl-primary/10 relative overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-fl-primary/5 pointer-events-none" />
                        <span className="text-fl-gray text-xs uppercase tracking-[0.2em] mb-4">
                           FrameScore
                        </span>
                        <div className={`text-7xl font-display font-bold text-[#4433FF] drop-shadow-[0_0_25px_rgba(0,0,0,0.8)]`}>
                            {result.score}
                        </div>
                    </div>
                </div>
                </MotionDiv>
            )}
        </AnimatePresence>
    </div>
  );
}

// --- DASHBOARD OVERVIEW (Rich - Binds to Contact Zero) ---
const DashboardOverview: React.FC = () => {
    const user = getContactZero();
    const tasksDue = 3;
    const scansDone = user.frame.lastScanAt ? 5 : 0;
    const leaks = 100 - user.frame.currentScore;

    return (
        <div className="space-y-6 h-full flex flex-col pb-20">
            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SparkBorder className="h-full" color="blue">
                    <div className="bg-[#0E0E0E] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#121212] transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Scans Completed</h3>
                                </div>
                                <div className="text-5xl font-display font-bold text-white">{scansDone}</div>
                            </div>
                            <Settings size={16} className="text-gray-700" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">WEEKLY SCOPE</span>
                            <TrendingUp size={20} className="text-green-500" />
                        </div>
                    </div>
                </SparkBorder>

                <SparkBorder className="h-full">
                    <div className="bg-[#0E0E0E] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#121212] transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Frame Leaks</h3>
                                </div>
                                <div className="text-5xl font-display font-bold text-white">{leaks}</div>
                            </div>
                            <Settings size={16} className="text-gray-700" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">IN VALIDATION TRAPS</span>
                            <TrendingDown size={20} className="text-orange-500" />
                        </div>
                    </div>
                </SparkBorder>

                <SparkBorder className="h-full">
                    <div className="bg-[#0E0E0E] p-6 rounded-xl h-full flex flex-col justify-between group hover:bg-[#121212] transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Actions Due</h3>
                                </div>
                                <div className="text-5xl font-display font-bold text-white">{tasksDue}</div>
                            </div>
                            <Settings size={16} className="text-gray-700" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <span className="text-xs text-gray-600">4 WEEKS 🔥 STREAK</span>
                        </div>
                    </div>
                </SparkBorder>
            </div>

            {/* CHART SECTION */}
            <SparkBorder className="flex-1 min-h-[300px]" color="blue">
                <div className="bg-[#0E0E0E] rounded-xl p-6 h-full flex flex-col relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex gap-4">
                            <button className="px-3 py-1 bg-[#4433FF] text-white text-[10px] font-bold rounded uppercase">Week</button>
                            <button className="px-3 py-1 text-gray-600 hover:text-white text-[10px] font-bold uppercase transition-colors">Month</button>
                            <button className="px-3 py-1 text-gray-600 hover:text-white text-[10px] font-bold uppercase transition-colors">Year</button>
                        </div>
                        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-wider">
                            <div className="flex items-center gap-2 text-blue-500"><div className="w-2 h-2 rotate-45 bg-blue-500" /> Scans</div>
                            <div className="flex items-center gap-2 text-green-500"><div className="w-2 h-2 rotate-45 bg-green-500" /> Actions</div>
                            <div className="flex items-center gap-2 text-orange-500"><div className="w-2 h-2 rotate-45 bg-orange-500" /> Score</div>
                        </div>
                    </div>

                    <div className="flex-1 relative w-full h-full flex items-end">
                        <div className="absolute inset-0 flex justify-between pointer-events-none">
                            {[0,1,2,3,4,5,6].map(i => (
                                <div key={i} className="h-full w-px bg-[#222] border-r border-dashed border-[#333]" />
                            ))}
                        </div>
                        <svg className="w-full h-full absolute inset-0 z-0 overflow-visible" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <MotionPath 
                                d="M0,300 C100,280 200,250 300,270 S500,150 600,180 S800,100 1000,120 L1000,400 L0,400 Z"
                                fill="url(#chartGradient)"
                                initial={{ opacity: 0, pathLength: 0 }}
                                animate={{ opacity: 1, pathLength: 1 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                            />
                            <MotionPath 
                                d="M0,300 C100,280 200,250 300,270 S500,150 600,180 S800,100 1000,120"
                                fill="none"
                                stroke="#4ADE80"
                                strokeWidth="2"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1, opacity: [0.8, 1, 0.8] }}
                                transition={{ 
                                    pathLength: { duration: 1.5, ease: "easeInOut" },
                                    opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" } 
                                }}
                            />
                        </svg>
                    </div>
                    
                    <div className="flex justify-between text-[9px] text-gray-600 font-mono mt-2 uppercase">
                        <span>06/07</span><span>07/07</span><span>08/07</span><span>09/07</span><span>10/07</span><span>11/07</span><span>13/07</span>
                    </div>
                </div>
            </SparkBorder>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SparkBorder>
                    <div className="bg-[#0E0E0E] rounded-xl p-6 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-blue-500">
                                <div className="w-2 h-2 bg-blue-500 rounded-sm" />
                                <h3 className="text-xs font-bold uppercase tracking-widest">Rebels Ranking</h3>
                            </div>
                            <div className="text-[9px] bg-[#333] text-orange-500 px-2 py-0.5 rounded font-bold border border-orange-500/30">2 NEW</div>
                        </div>
                        <div className="flex items-center justify-between bg-[#1A1A1D] p-3 rounded border border-[#333]">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs font-bold text-white">1</div>
                                <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Grimson" className="w-full h-full" />
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-white">GRIMSON <span className="text-gray-500">@GRIMSON</span></div>
                                    <div className="text-[9px] text-gray-500">2 WEEKS STREAK 🔥</div>
                                </div>
                            </div>
                            <div className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">148 POINTS</div>
                        </div>
                    </div>
                </SparkBorder>

                <SparkBorder>
                    <div className="bg-[#0E0E0E] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-green-500">
                                <div className="w-2 h-2 bg-green-500 rounded-sm" />
                                <h3 className="text-xs font-bold uppercase tracking-widest">Security Status</h3>
                            </div>
                            <div className="text-[9px] text-green-500 font-bold border border-green-500 px-2 py-0.5 rounded">ONLINE</div>
                        </div>
                        <div className="p-4 border border-green-500/30 bg-green-900/10 rounded flex items-center justify-between">
                            <div>
                                <div className="text-[10px] text-green-500 font-bold uppercase mb-1 flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full" /> Guard Bots</div>
                                <div className="text-2xl font-display font-bold text-green-400">124/124</div>
                                <div className="text-[9px] text-green-600 font-mono">[RUNNING...]</div>
                            </div>
                            <Bot size={32} className="text-green-500 opacity-50" />
                        </div>
                    </div>
                </SparkBorder>
            </div>
        </div>
    );
}

type ViewMode = 'OVERVIEW' | 'DOSSIER' | 'NOTES' | 'SCAN' | 'CONTACTS' | 'CASES' | 'PIPELINES' | 'GROUPS' | 'PROJECTS';

export const Dashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('OVERVIEW');
  const [time, setTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // ==========================================================================
  // CENTRALIZED SELECTED CONTACT STATE
  // ==========================================================================
  const [selectedContactId, setSelectedContactId] = useState<string>(CONTACT_ZERO.id);

  // Get selected contact for display in header
  const selectedContact = getContactById(selectedContactId) || getContactZero();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    }).format(date);
  };

  const handleNav = (view: ViewMode) => {
      setCurrentView(view);
      setIsMobileMenuOpen(false);
  };

  // Handler for Contact Zero nav item — sets contact and navigates to dossier
  const handleContactZeroNav = () => {
      setSelectedContactId(CONTACT_ZERO.id);
      setCurrentView('DOSSIER');
      setIsMobileMenuOpen(false);
  };

  // Get header title based on view
  const getHeaderTitle = (): string => {
    if (currentView === 'DOSSIER') {
      return selectedContact.fullName.toUpperCase();
    }
    return currentView;
  };

  return (
    <div className="fixed inset-0 bg-[#030412] text-[#DBDBDB] font-sans flex flex-col lg:flex-row overflow-hidden z-[50]">
      <aside className={`
          fixed inset-y-0 left-0 w-[280px] bg-[#0E0E0E] border-r border-[#2A2A2A] flex flex-col z-40 transform transition-transform duration-300 lg:relative lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:flex h-16 items-center px-6 border-b border-[#2A2A2A]">
            <Zap size={20} className="text-[#4433FF] mr-3" />
            <div className="leading-tight">
                <h1 className="font-display font-bold text-white text-sm tracking-wider">FRAMELORD</h1>
                <p className="text-[9px] text-gray-500 tracking-wide">THE OS FOR DOMINANCE</p>
            </div>
        </div>

        <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            <div className="px-3 mb-2 mt-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-sm" /> Tools
            </div>
            <NavItem active={currentView === 'OVERVIEW'} onClick={() => handleNav('OVERVIEW')} icon={<LayoutGrid size={16} />} label="OVERVIEW" />
            <NavItem 
              active={currentView === 'DOSSIER' && selectedContactId === CONTACT_ZERO.id} 
              onClick={handleContactZeroNav} 
              icon={<Crosshair size={16} />} 
              label="CONTACT ZERO" 
            />
            <NavItem active={currentView === 'NOTES'} onClick={() => handleNav('NOTES')} icon={<Notebook size={16} />} label="NOTES / LOG" />
            <NavItem active={currentView === 'SCAN'} onClick={() => handleNav('SCAN')} icon={<Scan size={16} />} label="SCAN" />
            <NavItem active={currentView === 'CASES'} onClick={() => handleNav('CASES')} icon={<Briefcase size={16} />} label="CASES / WORKLOAD" />
            <NavItem active={currentView === 'PIPELINES'} onClick={() => handleNav('PIPELINES')} icon={<GitCommit size={16} />} label="PIPELINES" />
            
            <div className="h-6" />
            
            <div>
                <button 
                    onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-gray-500 hover:text-white transition-colors group mb-1"
                >
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                         <div className="w-1.5 h-1.5 border border-gray-500 group-hover:border-white rounded-sm" /> Workspace
                    </div>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                    {isWorkspaceOpen && (
                        <MotionDiv 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1"
                        >
                            <NavItem active={currentView === 'GROUPS'} onClick={() => handleNav('GROUPS')} icon={<Layers size={16} />} label="GROUPS" isSubItem />
                            <NavItem active={currentView === 'PROJECTS'} onClick={() => handleNav('PROJECTS')} icon={<Folder size={16} />} label="PROJECTS" isSubItem />
                            <NavItem active={currentView === 'CONTACTS'} onClick={() => handleNav('CONTACTS')} icon={<Users size={16} />} label="CONTACTS" isSubItem />
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Selected Contact Indicator in Footer */}
        <div className="p-4 bg-[#18181A] border-t border-[#2A2A2A] flex items-center gap-3">
             <div className={`w-10 h-10 rounded flex items-center justify-center overflow-hidden ${selectedContactId === CONTACT_ZERO.id ? 'bg-[#4433FF]' : 'bg-[#333]'}`}>
                <img src={selectedContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.id}`} alt="User" className="w-full h-full object-cover" />
             </div>
             <div className="overflow-hidden flex-1">
                 <h4 className="font-display font-bold text-white text-sm">{selectedContact.fullName.toUpperCase()}</h4>
                 <p className="text-[9px] text-gray-500 truncate uppercase">{selectedContact.relationshipRole}</p>
             </div>
             {selectedContactId !== CONTACT_ZERO.id && (
               <button 
                 onClick={handleContactZeroNav}
                 className="text-[9px] text-[#4433FF] hover:text-white"
                 title="Switch to Contact Zero"
               >
                 <User size={14} />
               </button>
             )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-[#030412] overflow-hidden relative">
         <div className="hidden lg:flex h-16 border-b border-[#2A2A2A] items-center justify-between px-8 shrink-0 bg-[#0E0E0E]">
             <div className="flex items-center gap-2">
                 <span className="bg-[#4433FF] text-white text-xs px-1.5 py-0.5 rounded-sm font-bold">[ ]</span>
                 <h2 className="font-display font-bold text-2xl text-white tracking-tight">{getHeaderTitle()}</h2>
                 {currentView === 'DOSSIER' && selectedContactId === CONTACT_ZERO.id && (
                   <span className="text-[10px] bg-[#4433FF]/20 text-[#4433FF] px-2 py-0.5 rounded border border-[#4433FF]/30 font-bold uppercase ml-2">
                     You
                   </span>
                 )}
             </div>
             <div className="flex items-center gap-6">
                 <span className="text-xs text-gray-600 font-mono">Last updated {formatTime(time)}</span>
                 <button 
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} 
                    className="p-1.5 hover:bg-[#1A1A1D] rounded text-gray-500 hover:text-white transition-colors"
                    title="Toggle Sidebar"
                 >
                     {isRightSidebarOpen ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
                 </button>
             </div>
         </div>

         <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar">
             {currentView === 'OVERVIEW' && <DashboardOverview />}
             {currentView === 'DOSSIER' && (
               <ContactDossierView 
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'SCAN' && <ScanView />}
             {currentView === 'NOTES' && (
               <NotesView 
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onNavigateToDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'CONTACTS' && (
               <ContactsView 
                 selectedContactId={selectedContactId}
                 setSelectedContactId={setSelectedContactId}
                 onViewDossier={() => setCurrentView('DOSSIER')}
               />
             )}
             {currentView === 'CASES' && <CasesView />}
             {currentView === 'PIPELINES' && <PipelinesView />}
             {(currentView === 'GROUPS' || currentView === 'PROJECTS') && <GroupsProjectsView />}
         </div>
      </main>

      <AnimatePresence mode="popLayout">
      {isRightSidebarOpen && (
          <MotionAside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex bg-[#0E0E0E] border-l border-[#2A2A2A] flex-col shrink-0 z-40 overflow-hidden"
          >
              <ClockWidget time={time} />
              <NotificationWidget />
          </MotionAside>
      )}
      </AnimatePresence>
    </div>
  );
};

const NavItem: React.FC<{ active?: boolean, icon: React.ReactNode, label: string, isSubItem?: boolean, onClick?: () => void, hasLock?: boolean }> = ({ active, icon, label, isSubItem, onClick, hasLock }) => (
    <div 
        onClick={onClick}
        className={`
            flex items-center justify-between px-3 py-2 cursor-pointer transition-all duration-200 rounded group
            ${active ? 'text-white bg-[#1A1A1D]' : 'text-gray-500 hover:text-gray-300 hover:bg-[#121212]'}
            ${isSubItem ? 'pl-8 text-xs' : 'text-xs'}
        `}
    >
        <div className="flex items-center gap-3">
            <span className={`${active ? 'text-[#4433FF]' : 'group-hover:text-white'}`}>{icon}</span>
            <span className="font-bold tracking-wider">{label}</span>
        </div>
        {active && <div className="w-1.5 h-1.5 bg-[#4433FF] rounded-full" />}
        {hasLock && <Lock size={12} className="text-gray-700" />}
    </div>
);
