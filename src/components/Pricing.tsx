import React from 'react';
import { Check } from 'lucide-react';
import { Button } from './Button';
import { Plan } from '../types';
import { Reveal } from './Reveal';
import { motion } from 'framer-motion';

const MotionDiv = motion.div as any;

const plans: Plan[] = [
  {
    name: "Basic",
    price: "$29",
    features: [
      "Unlimited text scans",
      "Basic FrameScore",
      "Trajectory tracking",
      "Web Dashboard"
    ]
  },
  {
    name: "Pro",
    price: "$79",
    features: [
      "Everything in Basic",
      "Call transcript uploads (5/mo)",
      "Per-contact relationship CRM",
      "Weak Pattern Profile",
      "Email integration"
    ],
    isPopular: true
  },
  {
    name: "Elite",
    price: "$199",
    features: [
      "Everything in Pro",
      "Unlimited transcript uploads",
      "Image/Profile Audit",
      "API Access",
      "Priority processing",
      "Dedicated account manager"
    ]
  }
];

export const Pricing: React.FC = () => {
  return (
    <section id="pricing-section" className="py-24 px-4 relative z-10 overflow-hidden">
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fl-navy/20 to-fl-black pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <Reveal width="100%" className="mb-16">
            <h2 className="text-4xl md:text-5xl font-display text-center text-white">
            THE COST OF <span className="text-fl-accent">WEAKNESS</span> IS HIGHER.
            </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {plans.map((plan, i) => (
            <Reveal key={i} delay={i * 0.2} width="100%">
                <MotionDiv 
                    animate={plan.isPopular ? { y: [0, -10, 0] } : {}}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col h-full glass-card border-[#1f2f45]
                    ${plan.isPopular 
                        ? 'shadow-[0_0_60px_rgba(28,241,255,0.2)] md:scale-110 z-10' 
                        : 'hover:border-fl-primary/40'}`}
                >
                {plan.isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-fl-primary text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-[0.2em] uppercase shadow-lg">
                        Most Popular
                    </div>
                )}
                
                <h3 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-widest">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-fl-text text-sm">/month</span>
                </div>

                <ul className="space-y-4 mb-10 flex-grow">
                    {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-fl-text">
                        <Check size={16} className="text-fl-primary mt-1 shrink-0" />
                        {feat}
                    </li>
                    ))}
                </ul>

                <Button 
                    variant={plan.isPopular ? 'primary' : 'outline'} 
                    glow={plan.isPopular}
                    className="w-full"
                >
                    Start {plan.name}
                </Button>
                </MotionDiv>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
