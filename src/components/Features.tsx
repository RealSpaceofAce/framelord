import React from 'react';
import { Gauge, Target, AlertTriangle, MessageSquare } from 'lucide-react';
import { Reveal } from './Reveal';

const features = [
  {
    icon: <Gauge className="text-fl-primary" size={32} />,
    title: "Instant FrameScore",
    description: "0–100 authority rating based on syntax, tonality, and subtext. Color-coded, no guesswork."
  },
  {
    icon: <Target className="text-fl-accent" size={32} />,
    title: "Dominance Signal Detection",
    description: "AI pinpoints phrases that project strength—or undermine it. Know exactly what's working."
  },
  {
    icon: <AlertTriangle className="text-fl-secondary" size={32} />,
    title: "Weak Pattern Alerts",
    description: "Repetitive language, hedging, and neediness get flagged before they cost you."
  },
  {
    icon: <MessageSquare className="text-fl-primary" size={32} />,
    title: "Conversation Context",
    description: "Upload emails, DMs, or call transcripts for deep analysis across any communication channel."
  }
];

export const Features: React.FC = () => {
  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <Reveal width="100%">
            <h2 className="text-4xl md:text-5xl font-display text-white mb-6 relative z-10 drop-shadow-xl">
                EVERYTHING YOU NEED TO <span className="text-fl-primary">COMMAND ATTENTION</span>
            </h2>
          </Reveal>
          <Reveal width="100%" delay={0.2}>
            <p className="text-fl-text max-w-2xl mx-auto text-lg font-light relative z-10 drop-shadow-md backdrop-blur-sm rounded-lg p-2">
                FrameLord gives you the visibility and insights to communicate with authority in every interaction.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
