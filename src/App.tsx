import React, { useState, useEffect } from 'react';
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
import SplashCursor from './components/landing/SplashCursor';
import { ArrowRight, MessageSquare, Terminal, ChevronDown, Calendar, X } from 'lucide-react';
import { ApplicationPage } from './components/ApplicationPage';
import { BetaPage } from './components/BetaPage';
import { CaseCallPage } from './components/CaseCallPage';
import { Dashboard } from './components/Dashboard';
import { IntakeFlow } from './components/intake';
import {
  TermsOfService,
  PrivacyPolicy,
  AcceptableUsePolicy,
  DataProcessingAddendum,
} from './components/legal';
import { ToastProvider } from './components/Toast';
import { LoginPage } from './components/auth/LoginPage';
import type { UserScope } from './types/multiTenant';
import { CONTACT_ZERO } from './services/contactStore';
import { needsTier1Intake } from './lib/intakeGate';
import { applyGlobalTheme } from './lib/settings/userSettings';
import {
  isAuthenticated,
  getCurrentUserScope,
  subscribeAuth,
  logout,
} from './services/authStore';

const MotionDiv = motion.div as any;
const MotionNav = motion.nav as any;

// =============================================================================
// MOCK USER SCOPES FOR TESTING (kept for dashboard needs)
// =============================================================================

// Platform Super Admin - uses Platform Admin portal
const MOCK_SUPER_ADMIN_SCOPE: UserScope = {
  userId: 'user_super_admin_123',
  tenantId: 'tenant_demo_001',
  tenantRole: 'OWNER',
  staffRole: 'SUPER_ADMIN',
  tenantContactZeroId: 'contact_zero_demo_001',
};

// Enterprise Tenant Owner - uses Tenant Admin portal
// staffRole must be NONE, tenant must be TEAM or ENTERPRISE plan
const MOCK_ENTERPRISE_OWNER_SCOPE: UserScope = {
  userId: 'user_enterprise_owner_456',
  tenantId: 'tenant_enterprise_001',
  tenantRole: 'OWNER',
  staffRole: 'NONE',
  tenantContactZeroId: 'contact_zero_enterprise_001',
};

// Ensure enterprise tenant exists for testing
function ensureEnterpriseTenantExists() {
  const STORAGE_KEY = 'framelord_tenants';
  const tenantId = 'tenant_enterprise_001';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let tenants = stored ? JSON.parse(stored) : [];

    const existingIndex = tenants.findIndex((t: any) => t.tenantId === tenantId);

    const enterpriseTenant = {
      tenantId,
      name: 'Demo Enterprise Team',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      planName: 'TEAM',
      planCode: 'TEAM',
      ownerUserId: 'user_enterprise_owner_456',
      tenantContactZeroId: 'contact_zero_enterprise_001',
      seatCount: 10,
    };

    if (existingIndex >= 0) {
      tenants[existingIndex] = { ...tenants[existingIndex], ...enterpriseTenant };
    } else {
      tenants.unshift(enterpriseTenant);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  } catch (e) {
    console.warn('[App] Failed to ensure enterprise tenant:', e);
  }
}

// Initialize enterprise tenant on load
ensureEnterpriseTenantExists();

// View type including legal pages and auth
type AppView =
  | 'landing'
  | 'login'
  | 'application'
  | 'beta'
  | 'dashboard'
  | 'booking'
  | 'case-call'
  | 'intake'
  | 'terms'
  | 'privacy'
  | 'acceptable-use'
  | 'dpa';

const App: React.FC = () => {
  // Check auth on initial load - authenticated users go directly to dashboard
  const [currentView, setCurrentView] = useState<AppView>(() => {
    if (isAuthenticated()) {
      return 'dashboard';
    }
    return 'landing';
  });

  // Auth state - track authentication status
  const [authStatus, setAuthStatus] = useState(() => ({
    isAuthenticated: isAuthenticated(),
    userScope: getCurrentUserScope(),
  }));

  // Subscribe to auth changes
  React.useEffect(() => {
    const unsubscribe = subscribeAuth(() => {
      setAuthStatus({
        isAuthenticated: isAuthenticated(),
        userScope: getCurrentUserScope(),
      });
    });
    return unsubscribe;
  }, []);

  // Handle auth state transitions - redirect on session expiry or login
  React.useEffect(() => {
    // If user becomes unauthenticated while on dashboard, redirect to landing
    if (!authStatus.isAuthenticated && currentView === 'dashboard') {
      console.log('[App] Session expired or logged out, redirecting to landing');
      setCurrentView('landing');
    }
    // If user becomes authenticated while on login page, redirect to dashboard
    if (authStatus.isAuthenticated && currentView === 'login') {
      console.log('[App] User authenticated, redirecting to dashboard');
      setCurrentView('dashboard');
    }
  }, [authStatus.isAuthenticated, currentView]);

  // Initialize theme on app startup
  // App shell is ALWAYS dark mode - only the notes editor can toggle to light
  useEffect(() => {
    // Always apply dark mode to the app shell
    applyGlobalTheme(true);
  }, []);

  // Video demo modal state
  const [showDemoVideo, setShowDemoVideo] = useState(false);

  // Dev mode bypass for intake gate (used by Dashboard (Dev) footer link)
  const bypassIntakeGateRef = React.useRef(false);

  // Intake Gate: Redirect to intake if user needs Tier 1 and tries to access dashboard
  // Skipped when:
  // - bypassIntakeGateRef is true (dev mode navigation)
  // - User is authenticated (intake data is localStorage-only, doesn't sync with Supabase yet)
  React.useEffect(() => {
    if (bypassIntakeGateRef.current) {
      bypassIntakeGateRef.current = false; // Reset after use
      return;
    }
    // Skip intake gate for authenticated users (their data is in Supabase, not localStorage)
    // TODO: Sync intake completion status to Supabase for proper cross-device support
    if (authStatus.isAuthenticated) {
      return;
    }
    if (currentView === 'dashboard' && needsTier1Intake(CONTACT_ZERO.id)) {
      console.log('[App] User needs Tier 1 intake, redirecting to intake flow');
      setCurrentView('intake');
    }
  }, [currentView, authStatus.isAuthenticated]);

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

  // Dev mode navigation - bypasses intake gate
  const navigateToDashboardDev = () => {
      bypassIntakeGateRef.current = true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('dashboard');
  };

  const navigateToBooking = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('booking');
  };

  const navigateToHome = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('landing');
  };

  // Legal page navigation
  const navigateToTerms = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('terms');
  };

  const navigateToPrivacy = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('privacy');
  };

  const navigateToAcceptableUse = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('acceptable-use');
  };

  const navigateToDPA = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('dpa');
  };

  const navigateToIntake = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('intake');
  };

  const navigateToCaseCall = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('case-call');
  };

  const navigateToLogin = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentView('login');
  };

  const handleLoginSuccess = () => {
      // After successful login, go to dashboard
      setCurrentView('dashboard');
  };

  const handleLogout = () => {
      logout();
      setCurrentView('landing');
  };

  const scrollToScanner = () => {
      const scannerSection = document.getElementById('scanner-section');
      if (scannerSection) {
          scannerSection.scrollIntoView({ behavior: 'smooth' });
      }
  };

  const scrollToPricing = () => {
      const pricingSection = document.getElementById('pricing-section');
      if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <ToastProvider>
    <div className="min-h-screen text-white selection:bg-fl-primary selection:text-white overflow-hidden relative app-neon">

      {/* Background Systems */}
      {/* MouseBackground only on public pages (not dashboard/authenticated views) */}
      {currentView === 'landing' && <MouseBackground />}
      {/* ThreeParticles ONLY on landing page - never in dashboard/authenticated views */}
      {currentView === 'landing' && (
        <ThreeParticles forcedShape={null} />
      )}
      <SparkSystem />

      {/* SplashCursor fluid effect - ONLY on landing page */}
      {/* Gracefully disables on browsers without WebGL float texture support */}
      {currentView === 'landing' && <SplashCursor />}

      {/* Demo Video Modal */}
      <AnimatePresence>
        {showDemoVideo && (
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setShowDemoVideo(false)}
          >
            <MotionDiv
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl mx-4 aspect-video bg-fl-black rounded-2xl border border-fl-primary/30 shadow-[0_0_60px_rgba(68,51,255,0.3)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowDemoVideo(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-red-500/80 text-white transition-colors border border-white/20"
              >
                <X size={20} />
              </button>

              {/* Video Container - Ready for YouTube embed */}
              {/* TODO: Replace with YouTube iframe embed */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fl-navy/50 to-fl-black">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                    <MessageSquare size={32} className="text-fl-primary" />
                  </div>
                  <p className="text-fl-gray text-sm">Demo video coming soon</p>
                  <p className="text-fl-gray/50 text-xs">YouTube embed will go here</p>
                </div>
              </div>
            </MotionDiv>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {currentView !== 'dashboard' && currentView !== 'login' && (
      <MotionNav
        style={{ backgroundColor: navBackground, backdropFilter: 'blur(10px)' }}
        className="fixed top-0 w-full z-50 border-b border-white/5 h-20 flex items-center transition-colors duration-500"
      >
        <div className="max-w-7xl mx-auto w-full px-6 flex justify-between items-center">
          <div className="font-display font-bold text-xl tracking-widest text-white flex items-center gap-2 interactive cursor-pointer" onClick={navigateToHome}>
            <span className="px-2 py-1 rounded-md border border-[#1f2f45] bg-[#0e1a2d]/80 text-fl-primary shadow-[0_0_14px_rgba(31,226,255,0.35)]">[ ]</span> FRAMELORD
          </div>

          {/* Only show nav links on Landing Page */}
          {currentView === 'landing' && (
             <div className="hidden md:flex gap-8 text-sm font-medium text-fl-text">
                <a onClick={scrollToScanner} className="hover:text-white transition-colors interactive cursor-pointer">How It Works</a>
                <a onClick={scrollToPricing} className="hover:text-white transition-colors interactive cursor-pointer">Pricing</a>
                <button onClick={navigateToLogin} className="hover:text-white transition-colors interactive cursor-pointer">Log In</button>
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

             {/* Show 'Get Access' (Scroll to Pricing) if on Landing page */}
             {currentView === 'landing' && (
                <Button
                    variant="outline"
                    onClick={scrollToPricing}
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
                {/* Hero: Authority Diagnostics – single CTA "See How It Works" */}
                <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
                    <MotionDiv
                        style={{ opacity: heroOpacity, y: heroY }}
                        className="relative z-10 max-w-6xl mx-auto px-6 text-center flex flex-col items-center"
                    >
                    <Reveal delay={0.1}>
                        <div className="inline-block mb-6 px-4 py-1 rounded-full glass-card border border-[#1f2f45] shadow-[0_0_15px_rgba(68,51,255,0.25)]">
                            <span className="text-fl-secondary text-xs font-bold tracking-[0.2em] uppercase">Private Intel Machine</span>
                        </div>
                    </Reveal>

                    <Reveal delay={0.2} width="100%" className="mb-2">
                        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-tight drop-shadow-2xl text-white">
                            YOUR UNFAIR ADVANTAGE
                        </h1>
                    </Reveal>

                    <Reveal delay={0.3} width="100%" className="mb-8">
                        <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-medium leading-tight drop-shadow-2xl text-fl-text">
                            IN POWER, PERSUASION, AND <span className="text-fl-primary font-bold">PROTECTION.</span>
                        </h2>
                    </Reveal>

                    <Reveal delay={0.5}>
                        <p className="text-xl text-fl-text max-w-3xl mx-auto mb-10 font-light leading-relaxed">
                            An authority diagnostics lab and private intel machine for high-stakes operators.
                            Grounded in evo psych, Big Five, DISC, MBTI-style patterns, and dark triad risk signals.
                            See exactly where your frame leaks, who's running games on you, and what to correct before it costs you.
                        </p>
                    </Reveal>

                    <Reveal delay={0.7}>
                        <Button glow onClick={() => setShowDemoVideo(true)} className="group flex items-center gap-2 interactive">
                            <ArrowRight size={18} /> See How It Works
                        </Button>
                        <p className="text-fl-gray text-xs mt-3">Invite-only beta. Founding member pricing locked.</p>
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
                                    See the Blind Spot
                                </span>
                                <ChevronDown size={28} className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]" />
                            </MotionDiv>
                        </div>
                    </div>
                </section>

                {/* Problem/Gap Section */}
                <section className="py-20 px-4 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <Reveal width="100%">
                            <h2 className="text-3xl md:text-4xl font-display text-white mb-6">
                                YOU DON'T SEE YOUR <span className="text-fl-accent">FRAME LEAKS</span>
                            </h2>
                        </Reveal>
                        <Reveal width="100%" delay={0.2}>
                            <p className="text-lg text-fl-text leading-relaxed max-w-3xl mx-auto">
                                Micro-submissions you don't notice. Deference patterns you can't hear. Manipulative frames you don't recognize until it's too late.
                                You think you're coming across one way—reality says otherwise.
                                FrameLord exposes the gap between intent and impact with clinical precision, grounded in evo psych and dark triad pattern recognition.
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* Demo Section */}
                <div id="scanner-section">
                    <Scanner onApply={navigateToApp} />
                </div>

                {/* Features Grid */}
                <Features />

                {/* Private Intel Machine Section */}
                <section className="py-20 px-4 relative z-10">
                    <div className="max-w-5xl mx-auto text-center">
                        <Reveal width="100%">
                            <h2 className="text-3xl md:text-4xl font-display text-white mb-6">
                                YOUR PRIVATE <span className="text-fl-accent">AUTHORITY INTEL MACHINE</span>
                            </h2>
                        </Reveal>
                        <Reveal width="100%" delay={0.2}>
                            <p className="text-lg text-fl-text leading-relaxed max-w-3xl mx-auto mb-12">
                                FrameLord is a growing dossier on you and everyone tied to your outcomes.
                                Log patterns, vulnerabilities, leverage points. Track relationship vectors and authority drift over time.
                                Not perception management—outside-in effectiveness where authority becomes real.
                            </p>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                            <Reveal delay={0.1}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-primary font-display text-sm font-bold mb-2 uppercase tracking-wider">Relationship OS</h3>
                                    <p className="text-fl-text text-sm">Contact dossiers with notes, timelines, interactions, and psychometric profiles. Everything hangs off the contact spine.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.15}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-primary font-display text-sm font-bold mb-2 uppercase tracking-wider">Psychometric Profiles</h3>
                                    <p className="text-fl-text text-sm">Big Five, DISC, MBTI-style patterns, and dark triad risk signals per contact. Know who you're dealing with before they know you.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.2}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-primary font-display text-sm font-bold mb-2 uppercase tracking-wider">Wants & Accountability</h3>
                                    <p className="text-fl-text text-sm">Track your Sovereign Wants. Daily streaks. Goal compliance feeds your FrameScore via Little Lord enforcement.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.25}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-primary font-display text-sm font-bold mb-2 uppercase tracking-wider">Authority Trajectory</h3>
                                    <p className="text-fl-text text-sm">Watch FrameScore and relationship vectors shift over time. Trendlines reveal patterns you can't see in the moment.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.3}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-primary font-display text-sm font-bold mb-2 uppercase tracking-wider">Little Lord Advisor</h3>
                                    <p className="text-fl-text text-sm">Not a friendly chatbot. Ruthless tactical advisor trained on Apex Frame doctrine. Flags leaks, prescribes drills, enforces congruency.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.35}>
                                <div className="p-6 glass-card border border-[#1f2f45] rounded-xl">
                                    <h3 className="text-fl-gray font-display text-sm font-bold mb-2 uppercase tracking-wider">On Deck: Call Analysis</h3>
                                    <p className="text-fl-text text-sm">Recording, transcription, timestamped coaching tied to exact moments. Tests you send out that feed back into dossiers.</p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="py-24 px-4 relative z-10 bg-fl-navy/20">
                    <div className="max-w-6xl mx-auto">
                        <Reveal width="100%" className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-display text-white mb-4">
                                HOW <span className="text-fl-primary">IT WORKS</span>
                            </h2>
                        </Reveal>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <Reveal delay={0.1}>
                                <div className="text-center p-6 glass-card border border-[#1f2f45] rounded-2xl">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                                        <span className="text-fl-primary font-display text-xl font-bold">1</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 font-display">Get Access</h3>
                                    <p className="text-fl-text text-xs">Set up Contact Zero—your identity in the system.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.15}>
                                <div className="text-center p-6 glass-card border border-[#1f2f45] rounded-2xl">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                                        <span className="text-fl-primary font-display text-xl font-bold">2</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 font-display">Run Diagnostics</h3>
                                    <p className="text-fl-text text-xs">Scan real situations: texts, calls, images, transcripts.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.2}>
                                <div className="text-center p-6 glass-card border border-[#1f2f45] rounded-2xl">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                                        <span className="text-fl-primary font-display text-xl font-bold">3</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 font-display">Build Dossiers</h3>
                                    <p className="text-fl-text text-xs">Create profiles on contacts. Log wants, patterns, risks.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.25}>
                                <div className="text-center p-6 glass-card border border-[#1f2f45] rounded-2xl">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                                        <span className="text-fl-primary font-display text-xl font-bold">4</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 font-display">Execute Drills</h3>
                                    <p className="text-fl-text text-xs">Little Lord prescribes tasks and enforces accountability.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.3}>
                                <div className="text-center p-6 glass-card border border-[#1f2f45] rounded-2xl">
                                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-fl-primary/20 border border-fl-primary/40 flex items-center justify-center">
                                        <span className="text-fl-primary font-display text-xl font-bold">5</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 font-display">Watch It Shift</h3>
                                    <p className="text-fl-text text-xs">Track FrameScore and relationship vectors over time.</p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* Who This Is For Section */}
                <section className="py-20 px-4 relative z-10">
                    <div className="max-w-5xl mx-auto">
                        <Reveal width="100%" className="text-center mb-12">
                            <h2 className="text-3xl md:text-4xl font-display text-white mb-4">
                                WHO THIS IS <span className="text-fl-primary">FOR</span>
                            </h2>
                        </Reveal>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <Reveal delay={0.1}>
                                <div className="p-8 glass-card border border-[#1f2f45] rounded-2xl text-center">
                                    <h3 className="text-xl font-bold text-white mb-3 font-display">CLOSERS & SALES OPERATORS</h3>
                                    <p className="text-fl-text text-sm">Know exactly when the buyer is testing you, when to push, when to walk. Stop leaving money on the table from weak frame moments.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.2}>
                                <div className="p-8 glass-card border border-[#1f2f45] rounded-2xl text-center">
                                    <h3 className="text-xl font-bold text-white mb-3 font-display">FOUNDERS & EXECUTIVES</h3>
                                    <p className="text-fl-text text-sm">Navigate investors, partners, board dynamics, and staff with pattern awareness. Flag dark triad operators before they cost you equity or sanity.</p>
                                </div>
                            </Reveal>
                            <Reveal delay={0.3}>
                                <div className="p-8 glass-card border border-[#1f2f45] rounded-2xl text-center">
                                    <h3 className="text-xl font-bold text-white mb-3 font-display">ROMANTIC & SOCIAL STRATEGISTS</h3>
                                    <p className="text-fl-text text-sm">Intergender power dynamics, social positioning, protecting yourself from manipulation. See the games before you're played.</p>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>

                {/* Social Proof Section */}
                <section className="py-16 px-4 relative z-10 bg-fl-navy/10">
                    <div className="max-w-4xl mx-auto text-center">
                        <Reveal width="100%">
                            <p className="text-fl-text/70 text-sm uppercase tracking-widest mb-4">
                                Used by high-ticket closers, executive coaches, founders, and power-aware operators.
                            </p>
                        </Reveal>
                        <Reveal width="100%" delay={0.1}>
                            <p className="text-fl-gray text-xs italic">
                                Privacy is a feature, not a bug. They won't list this in their stack. Neither will you.
                            </p>
                        </Reveal>
                    </div>
                </section>

                {/* Pricing */}
                <Pricing />

                {/* Final CTA Strip */}
                <section className="py-16 px-4 relative z-10 bg-gradient-to-r from-fl-primary/20 via-fl-navy/30 to-fl-primary/20">
                    <div className="max-w-4xl mx-auto text-center">
                        <Reveal width="100%">
                            <h2 className="text-3xl md:text-4xl font-display text-white mb-4">
                                READY TO SEE WHAT YOU'VE BEEN MISSING?
                            </h2>
                        </Reveal>
                        <Reveal width="100%" delay={0.2}>
                            <p className="text-fl-text text-lg mb-8">
                                Apply for founding member access. Pricing locks at launch.
                            </p>
                        </Reveal>
                        <Reveal width="100%" delay={0.3}>
                            <Button glow onClick={scrollToPricing} className="group flex items-center gap-2 interactive mx-auto">
                                <ArrowRight size={18} /> Secure Your License
                            </Button>
                        </Reveal>
                    </div>
                </section>
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
        ) : currentView === 'booking' ? (
            <MotionDiv
                key="booking"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen flex items-center justify-center pt-20"
            >
                <div className="max-w-2xl mx-auto px-6 text-center">
                    <h1 className="text-4xl font-display font-bold mb-6">Book a Session</h1>
                    <p className="text-fl-text mb-8">Booking page coming soon. Schedule a coaching session with a FrameLord specialist.</p>
                    <Button variant="outline" onClick={navigateToHome}>Return to Home</Button>
                </div>
            </MotionDiv>
        ) : currentView === 'case-call' ? (
            <MotionDiv
                key="case-call"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <CaseCallPage onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'terms' ? (
            <MotionDiv
                key="terms"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <TermsOfService onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'privacy' ? (
            <MotionDiv
                key="privacy"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <PrivacyPolicy onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'acceptable-use' ? (
            <MotionDiv
                key="acceptable-use"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <AcceptableUsePolicy onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'dpa' ? (
            <MotionDiv
                key="dpa"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <DataProcessingAddendum onBack={navigateToHome} />
            </MotionDiv>
        ) : currentView === 'intake' ? (
            <MotionDiv
                key="intake"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <IntakeFlow
                    contactId={CONTACT_ZERO.id}
                    onAbandon={navigateToHome}
                    onEnterDashboard={navigateToDashboard}
                    onBookCaseCall={navigateToCaseCall}
                    onComplete={(metrics) => {
                        console.log('Intake complete:', metrics);
                    }}
                />
            </MotionDiv>
        ) : currentView === 'login' ? (
            <MotionDiv
                key="login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5 }}
            >
                <LoginPage
                    onLoginSuccess={handleLoginSuccess}
                    onBack={navigateToHome}
                />
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

      {/* Footer - Hide on Dashboard and Login to maintain OS feel */}
      {currentView !== 'dashboard' && currentView !== 'login' && (
      <footer className="relative bg-fl-black border-t border-white/5 py-12 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
          {/* Main Footer Row */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            {/* Logo Section */}
            <div className="flex flex-col gap-2">
               <div className="font-display font-bold text-lg tracking-widest text-white flex items-center gap-2">
                  <Terminal size={18} className="text-fl-primary" /> FRAMELORD
              </div>
              <p className="text-fl-gray text-xs max-w-xs">
                  AI-powered frame analysis for high-stakes communication.
              </p>
            </div>

            {/* Production Links */}
            <div className="text-fl-gray text-sm flex gap-6 items-center flex-wrap justify-center">
              <button onClick={navigateToPrivacy} className="hover:text-white transition-colors interactive">Privacy</button>
              <button onClick={navigateToTerms} className="hover:text-white transition-colors interactive">Terms</button>
              <button onClick={navigateToAcceptableUse} className="hover:text-white transition-colors interactive">Acceptable Use</button>
              <button onClick={navigateToDPA} className="hover:text-white transition-colors interactive">DPA</button>
              <a href="https://twitter.com/framelord" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors interactive">Twitter</a>
              <div className="w-px h-4 bg-fl-gray/30 mx-2" />
              <button onClick={navigateToLogin} className="text-fl-primary hover:text-white transition-colors interactive">Login</button>
            </div>

            {/* Copyright */}
            <div className="text-fl-gray text-xs">
              © 2026 FrameLord Systems. All rights reserved.
            </div>
          </div>

          {/* Dev Tools Section - Only visible in development */}
          {import.meta.env.DEV && (
            <div className="border-t border-white/5 pt-6">
              <div className="flex flex-col items-center gap-3">
                <span className="text-fl-gray/50 text-[10px] uppercase tracking-widest">Developer Tools</span>
                <div className="text-fl-gray text-xs flex gap-4 items-center flex-wrap justify-center">
                  <button onClick={navigateToApp} className="text-fl-primary/70 hover:text-fl-primary transition-colors interactive">
                    Application
                  </button>
                  <button onClick={navigateToBooking} className="text-yellow-500/70 hover:text-yellow-500 transition-colors interactive flex items-center gap-1">
                    <Calendar size={10} /> Booking
                  </button>
                  <button onClick={navigateToBeta} className="text-fl-secondary/70 hover:text-fl-secondary transition-colors interactive">
                    Beta Program
                  </button>
                  <button onClick={navigateToDashboardDev} className="text-green-500/70 hover:text-green-500 transition-colors interactive">
                    Dashboard
                  </button>
                  <button onClick={navigateToIntake} className="text-purple-500/70 hover:text-purple-500 transition-colors interactive">
                    Intake
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>
      )}
    </div>
    </ToastProvider>
  );
};

export default App;
