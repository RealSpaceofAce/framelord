import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './Button';
import { Plan } from '../types';
import { Reveal } from './Reveal';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

const plans: Plan[] = [
  {
    name: "Pro",
    price: "$29",
    description: "For professionals who send high-stakes messages daily.",
    features: [
      "Unlimited FrameScans",
      "Full dominance signal breakdown",
      "Weak pattern history",
      "Priority AI processing"
    ],
    isPopular: true
  },
  {
    name: "Elite",
    price: "$79",
    description: "For teams and power users.",
    features: [
      "Everything in Pro",
      "Transcript upload & audio analysis",
      "Multi-user team dashboard",
      "API access"
    ]
  }
];

const faqs = [
  {
    question: "Is my data private?",
    answer: "Yes. Your messages are processed in real-time and never stored or used for training. We take privacy seriously—your communication stays yours."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely. No contracts, no commitment. Cancel with one click and keep access until your billing period ends."
  },
  {
    question: "How is FrameLord different from writing tools?",
    answer: "Writing tools focus on grammar and style. FrameLord analyzes authority signals—where you hold frame, where you concede ground, and how the power dynamic shifts during an exchange. It measures leverage, not prose."
  }
];

export const Pricing: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const getButtonText = (planName: string) => {
    switch (planName) {
      case 'Pro':
        return 'Start Pro';
      case 'Elite':
        return 'Apply for Elite';
      default:
        return `Start ${planName}`;
    }
  };

  return (
    <section id="pricing-section" className="py-24 px-4 relative z-10 overflow-hidden">
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-fl-navy/20 to-fl-black pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <Reveal width="100%" className="mb-4">
            <h2 className="text-4xl md:text-5xl font-display text-center text-white">
            CHOOSE YOUR LEVEL OF <span className="text-fl-accent">INSIGHT</span>
            </h2>
        </Reveal>
        <Reveal width="100%" delay={0.1} className="mb-16">
            <p className="text-fl-text text-center text-lg">
              Private beta. Pricing reflects the tiers available when public signups open.
            </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <Reveal key={i} delay={i * 0.2} width="100%">
                <MotionDiv
                    animate={plan.isPopular ? { y: [0, -10, 0] } : {}}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col h-full glass-card border-[#1f2f45]
                    ${plan.isPopular
                        ? 'shadow-[0_0_60px_rgba(28,241,255,0.2)] md:scale-105 z-10'
                        : 'hover:border-fl-primary/40'}`}
                >
                {plan.isPopular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-fl-primary text-white text-[10px] font-bold px-4 py-1 rounded-full tracking-[0.2em] uppercase shadow-lg">
                        Most Popular
                    </div>
                )}

                <h3 className="text-xl font-bold text-white mb-2 font-display uppercase tracking-widest">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-white tracking-tight">{plan.price}</span>
                    <span className="text-fl-text text-sm">/month</span>
                </div>
                {plan.description && (
                    <p className="text-fl-text text-sm mb-6">{plan.description}</p>
                )}

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
                    {getButtonText(plan.name)}
                </Button>
                </MotionDiv>
            </Reveal>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <Reveal width="100%" className="mb-12">
            <h3 className="text-3xl font-display text-center text-white">
              FREQUENTLY ASKED <span className="text-fl-primary">QUESTIONS</span>
            </h3>
          </Reveal>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Reveal key={index} delay={index * 0.1} width="100%">
                <div className="glass-card border border-[#1f2f45] rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-fl-navy/30 transition-colors"
                  >
                    <span className="text-white font-medium">{faq.question}</span>
                    {openFaq === index ? (
                      <ChevronUp size={20} className="text-fl-primary shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-fl-gray shrink-0" />
                    )}
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <MotionDiv
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 text-fl-text text-sm leading-relaxed">
                          {faq.answer}
                        </div>
                      </MotionDiv>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
