import React from 'react';
import { Gauge, Target, AlertTriangle, Eye, Brain, Shield } from 'lucide-react';
import { Reveal } from './Reveal';

const features = [
  {
    icon: <Gauge className="text-fl-primary" size={32} />,
    title: "9-Axis FrameScan",
    description: "Text, screenshots, and audio analyzed across nine authority dimensions. Win-Win integrity check feeds final FrameScore."
  },
  {
    icon: <Brain className="text-fl-accent" size={32} />,
    title: "Evo Psych + Dark Triad Patterns",
    description: "Grounded in primal intergender dynamics, Big Five, DISC, MBTI-style patterns. Dark triad risk signals flagged automatically."
  },
  {
    icon: <Target className="text-fl-secondary" size={32} />,
    title: "Frame Leak Detection",
    description: "Micro-submissions, deference patterns, hedging—pinpointed before they cost you the deal, the relationship, or the respect."
  },
  {
    icon: <Eye className="text-fl-primary" size={32} />,
    title: "Manipulator Detection",
    description: "Identify covert power plays, gaslighting frames, and dark triad manipulation attempts before you're played."
  },
  {
    icon: <Shield className="text-fl-accent" size={32} />,
    title: "Congruency Enforcement",
    description: "Little Lord validates Wants vs Shoulds. Flags leaks between what you say and what you do. Enforces internal alignment."
  },
  {
    icon: <AlertTriangle className="text-fl-secondary" size={32} />,
    title: "Coaching & Corrections",
    description: "Not just scores—detailed reports with exact corrections and tactical prescriptions for your next interaction."
  }
];

export const Features: React.FC = () => {
  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <Reveal width="100%">
            <h2 className="text-4xl md:text-5xl font-display text-white mb-6 relative z-10 drop-shadow-xl">
                THE <span className="text-fl-primary">AUTHORITY DIAGNOSTICS</span> ENGINE
            </h2>
          </Reveal>
          <Reveal width="100%" delay={0.2}>
            <p className="text-fl-text max-w-2xl mx-auto text-lg font-light relative z-10 drop-shadow-md backdrop-blur-sm rounded-lg p-2">
                FrameScan is the intake organ. Ingests text, images, and audio. Returns clinical precision on where you leak authority and where others run games.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.1}>
                <div
                    className="h-full group p-8 glass-card border border-[#1f2f45] hover:border-fl-primary/60 transition-all duration-300 rounded-2xl hover:-translate-y-2"
                >
                <div className="mb-6 p-4 bg-fl-black/50 w-fit rounded-lg border border-white/5 group-hover:border-fl-primary/50 group-hover:shadow-[0_0_15px_rgba(68,51,255,0.3)] transition-all">
                    {f.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 font-display tracking-wide">{f.title}</h3>
                <p className="text-fl-text leading-relaxed text-sm group-hover:text-white transition-colors">{f.description}</p>
                </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
