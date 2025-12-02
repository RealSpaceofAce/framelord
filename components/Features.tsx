import React from 'react';
import { Target, Activity, Shield, Layers, TrendingUp, Search } from 'lucide-react';
import { Reveal } from './Reveal';

const features = [
  {
    icon: <Target className="text-fl-primary" size={32} />,
    title: "Pattern Detection",
    description: "Identify recurring weak phrases across days, weeks, and months. FrameLord builds a profile of your psychological tells."
  },
  {
    icon: <Activity className="text-fl-accent" size={32} />,
    title: "Trajectory Tracking",
    description: "Are you getting stronger or stagnating? See your FrameScore average visualized on a timeline."
  },
  {
    icon: <Layers className="text-fl-secondary" size={32} />,
    title: "Relationship CRM",
    description: "Track frame balance per specific contact. Know exactly who in your pipeline is dominating the interaction."
  },
  {
    icon: <Search className="text-fl-primary" size={32} />,
    title: "Transcript Audits",
    description: "Upload sales calls. FrameLord pinpoints the exact second you lost the sale by seeking validation."
  },
  {
    icon: <Shield className="text-fl-accent" size={32} />,
    title: "Response Simulator",
    description: "Get 3 frame-holding response options for any difficult text or email before you hit send."
  },
  {
    icon: <TrendingUp className="text-fl-secondary" size={32} />,
    title: "Authority Scoring",
    description: "A proprietary 0-100 score based on syntax, tonality, and subtextual neediness markers."
  }
];

export const Features: React.FC = () => {
  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <Reveal width="100%">
            <h2 className="text-4xl md:text-5xl font-display text-white mb-6 relative z-10 drop-shadow-xl">
                DIAGNOSE. <span className="text-fl-primary">CORRECT.</span> DOMINATE.
            </h2>
          </Reveal>
          <Reveal width="100%" delay={0.2}>
            <p className="text-fl-text max-w-2xl mx-auto text-lg font-light relative z-10 drop-shadow-md backdrop-blur-sm rounded-lg p-2">
                FrameLord is not a copywriting tool. It is a performance lab for your social status and communication authority.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Reveal key={i} delay={i * 0.1}>
                <div 
                    className="h-full group p-8 bg-fl-darkPurple/30 backdrop-blur-lg border border-fl-primary/20 hover:border-fl-primary/50 hover:bg-fl-darkPurple/50 transition-all duration-300 rounded-xl hover:-translate-y-2 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
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
