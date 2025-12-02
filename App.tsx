import React, { useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Scanner } from './components/Scanner';
import { Features } from './components/Features';
import { Pricing } from './components/Pricing';
import { Button } from './components/Button';
import { MouseBackground } from './components/MouseBackground';
import { Reveal } from './components/Reveal';
import { SparkSystem } from './components/SparkSystem';
import { ThreeParticles } from './components/ThreeParticles';
import { InteractiveHeadline } from './components/InteractiveHeadline';
import { ArrowRight, MessageSquare, Terminal, ChevronDown } from 'lucide-react';
import { ApplicationPage } from './components/ApplicationPage';
import { BetaPage } from './components/BetaPage';
import { Dashboard } from './components/Dashboard';

const MotionDiv = motion.div as any;
const MotionNav = motion.nav as any;

const App: React.FC = () => {
  // Set default to 'application' as requested previously for immediate access, change to 'landing' for production
  const [currentView, setCurrentView] = useState<'landing' | 'application' | 'beta' | 'dashboard'>('application');
  
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const navBackground = useTransform(
    scrollY, 
    [0, 50], 
    ['rgba(3, 4, 18, 0)', 'rgba(3, 4, 18, 0.9)']
  );

  const navigateToApp = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('application');
  };

  const navigateToBeta = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('beta');
  };

  const navigateToDashboard = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('dashboard');
  };

  const navigateToHome = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('landing');
  };

  const scrollToScanner = () => {
      const scannerSection = document.getElementById('scanner-section');
      if (scannerSection) {
          scannerSection.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <div className="min-h-screen bg-fl-black text-white selection:bg-fl-primary selection:text-white overflow-hidden relative">
      
      {/* Background Systems */}
      <MouseBackground />
      {/* Particles adapt to the view. If beta, maybe force a specific shape or keep standard. */}
      {/* Hide particles on dashboard to avoid z-index conflicts and clutter */}
      {currentView !== 'dashboard' && (
        <ThreeParticles forcedShape={currentView === 'application' ? 'dna' : currentView === 'beta' ? 'sphere' : null} />
      )}
      <SparkSystem />

      {/* Navigation */}
      {currentView !== 'dashboard' && (
      <MotionNav 
        style={{ backgroundColor: navBackground, backdropFilter: 'blur(10px)' }}
        className="fixed top-0 w-full z-50 border-b border-white/5 h-20 flex items-center transition-colors duration-500"
      >
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center">
          <div className="font-display font-bold text-xl tracking-widest text-white flex items-center gap-2 interactive cursor-pointer" onClick={navigateToHome}>
            <Terminal size={20} className="text-fl-primary" /> FRAMELORD
          </div>
          
          {/* Only show nav links on Landing Page */}
          {currentView === 'landing' && (
             <div className="hidden md:flex gap-8 text-sm font-medium text-fl-text">
                <a onClick={navigateToHome} className="hover:text-white transition-colors interactive cursor-pointer">How it Works</a>
                <a onClick={navigateToHome} className="hover:text-white transition-colors interactive cursor-pointer">Pricing</a>
                <a href="#" className="hover:text-white transition-colors interactive">Login</a>
             </div>
          )}

          <div className="flex gap-4">
             {/* Show 'Return' button if on Application or Beta page */}
             {currentView !== 'landing' && (
                <Button 
                    variant="outline" 
                    onClick={navigateToHome}
                    className="!py-2 !px-4 text-xs interactive"
                >
                    Return to Home
                </Button>
             )}
             
             {/* Show 'Get Access' (Scroll to Scanner) if on Landing page */}
             {currentView === 'landing' && (
                <Button 
                    variant="outline" 
                    onClick={scrollToScanner} 
                    className="!py-2 !px-4 text-xs interactive animate-pulse border-fl-primary text-fl-primary shadow-[0_0_15px_rgba(68,51,255,0.3)]"
                >
                    GET ACCESS
                </Button>
             )}
          </div>
        </div>
      </MotionNav>
      )}

      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
            <MotionDiv
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Hero Section */}
                <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                    <MotionDiv 
                        style={{ opacity: heroOpacity, y: heroY }}
                        className="relative z-10 max-w-6xl mx-auto px-6 text-center flex flex-col items-center"
                    >
                    <Reveal delay={0.1}>
                        <div className="inline-block mb-6 px-4 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-[0_0_15px_rgba(68,51,255,0.2)]">
                            <span className="text-fl-secondary text-xs font-bold tracking-[0.2em] uppercase">Authority Diagnostics V1.0</span>
                        </div>
                    </Reveal>
                    
                    <Reveal delay={0.2} width="100%" className="mb-8">
                        <InteractiveHeadline 
                        text="STOP SOUNDING LIKE AN AMATEUR."
                        highlightWords={["AMATEUR."]}
                        className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-tight drop-shadow-2xl cursor-default"
                        />
                    </Reveal>
                    
                    <Reveal delay={0.4}>
                        <p className="text-xl text-fl-text max-w-2xl mx-auto mb-10 font-light leading-relaxed">
                            One in a million, or just another flake? FrameLord is the AI mirror that exposes exactly where you lose authority in your communication, then tells you how to fix it.
                        </p>
                    </Reveal>
                    
                    <Reveal delay={0.6}>
                        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                            <Button glow onClick={scrollToScanner} className="group flex items-center gap-2 interactive">
                                Start Scan Now <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button variant="secondary" className="flex items-center gap-2 interactive">
                                <MessageSquare size={18} /> View Demo
                            </Button>
                        </div>
                    </Reveal>
                    </MotionDiv>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="flex justify-center w-full"> 
                             {/* Wrapper div to separate layout from animation transform */}
                            <MotionDiv 
                                animate={{ y: [0, 10, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="flex flex-col items-center gap-3"
                            >
                                <span className="text-fl-accent text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_10px_rgba(68,51,255,0.8)] whitespace-nowrap">
                                    Initialize Scan
                                </span>
                                <ChevronDown size={28} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
                            </MotionDiv>
                        </div>
                    </div>
                </section>

                {/* Demo Section */}
                <div id="scanner-section">
                    <Scanner onApply={navigateToApp} />
                </div>

                {/* Features Grid */}
                <Features />

                {/* Pricing */}
                <Pricing />
            </MotionDiv>
        ) : currentView === 'application' ? (
            <MotionDiv
                key="application"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <ApplicationPage onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'beta' ? (
            <MotionDiv
                key="beta"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <BetaPage onBack={navigateToHome} />
            </MotionDiv>
        ) : (
            <MotionDiv
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Dashboard />
                {/* Temporary floating back button for dashboard dev mode since it hides main nav */}
                <button 
                    onClick={navigateToHome}
                    className="fixed bottom-4 right-4 z-50 bg-fl-black/80 text-fl-gray p-2 rounded-full border border-white/10 hover:text-white text-xs"
                >
                    Exit Dash
                </button>
            </MotionDiv>
        )}
      </AnimatePresence>

      {/* Footer - Hide on Dashboard to maintain OS feel, or keep it for dev access. User said add access to footer. */}
      {currentView !== 'dashboard' && (
      <footer className="relative bg-fl-black border-t border-white/5 py-12 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
             <div className="font-display font-bold text-lg tracking-widest text-white flex items-center gap-2">
                <Terminal size={18} className="text-fl-primary" /> FRAMELORD
            </div>
            <p className="text-fl-gray text-xs max-w-xs">
                Clinical authority diagnostics for high-stakes communication.
            </p>
          </div>
          
          <div className="text-fl-gray text-sm flex gap-6 items-center flex-wrap justify-center">
            <a href="#" className="hover:text-white transition-colors interactive">Privacy</a>
            <a href="#" className="hover:text-white transition-colors interactive">Terms</a>
            <a href="#" className="hover:text-white transition-colors interactive">Twitter</a>
            <div className="w-px h-4 bg-fl-gray/30 mx-2" />
            <button onClick={navigateToApp} className="text-fl-primary hover:text-white transition-colors interactive text-xs uppercase tracking-wider">
                Application Page (Dev)
            </button>
            <div className="w-px h-4 bg-fl-gray/30 mx-2" />
            <button onClick={navigateToBeta} className="text-fl-secondary hover:text-white transition-colors interactive text-xs uppercase tracking-wider">
                Beta Program (Dev)
            </button>
            <div className="w-px h-4 bg-fl-gray/30 mx-2" />
            <button onClick={navigateToDashboard} className="text-green-500 hover:text-white transition-colors interactive text-xs uppercase tracking-wider">
                Dashboard (Dev)
            </button>
          </div>

          <div className="text-fl-gray text-xs">
            © 2026 FrameLord Systems. All rights reserved.
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};

export default App;