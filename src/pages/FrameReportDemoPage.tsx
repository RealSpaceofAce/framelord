// =============================================================================
// FRAME REPORT DEMO PAGE — Visual testing for report UI
// =============================================================================
// Pure fake data routes so you can visually inspect text and image reports
// without running actual LLM scans. No API calls, no tokens consumed.
// =============================================================================

import React, { useState } from 'react';
import { Scan, FileText, Image as ImageIcon, ToggleLeft, ToggleRight } from 'lucide-react';
import type { FrameScore, FrameScanResult, FrameImageAnnotation } from '../lib/frameScan/frameTypes';
import type { FrameScanReport } from '../services/frameScanReportStore';
import type { FrameScanUIReport, FrameScanUISection } from '../lib/frameScan/frameReportUI';
import FrameScanReportDetail from '../components/crm/FrameScanReportDetail';
import { CONTACT_ZERO } from '../services/contactStore';

// =============================================================================
// FAKE DATA - Text Report
// =============================================================================
const fakeTextUIReport: FrameScanUIReport = {
  header: {
    title: 'Sales Email Analysis',
    oneLineVerdict: 'Mixed frame with strong opening but weak close. Seller positioning undermines initial authority.',
    highlightScore: 62,
    badges: ['Mixed Frame', 'Seller Positioning', 'Weak Close', 'Good Subject Line'],
  },
  sections: [
    {
      id: 'summary',
      title: 'Frame Summary',
      mainParagraph: 'This sales email demonstrates a common pattern: strong assumptive opener that erodes into permission-seeking as the pitch develops. The subject line carries authority, but the body copy reveals uncertainty about value proposition.',
    },
    {
      id: 'strengths',
      title: 'Frame Strengths',
      bullets: [
        'Subject line assumes relevance without asking for permission',
        'Opening paragraph establishes context efficiently',
        'Clear call-to-action present',
        'Professional tone maintained throughout',
      ],
    },
    {
      id: 'weaknesses',
      title: 'Frame Weaknesses',
      bullets: [
        'Closing paragraph shifts to seller frame with "I would love to..." language',
        'Multiple hedging phrases: "just checking in", "if you have time"',
        'Value proposition buried in middle of email',
        'Sign-off undermines earlier confidence',
      ],
    },
    {
      id: 'corrections',
      title: 'Recommended Corrections',
      corrections: [
        {
          label: 'Remove Seller Language',
          description: 'Replace "I would love to discuss" with "Let\'s schedule a call to review"',
          suggestedAction: 'Rewrite closing with assumptive language',
        },
        {
          label: 'Lead with Value',
          description: 'Move the value proposition to the first paragraph. Currently buried after two paragraphs of context.',
          suggestedAction: 'Restructure email: Value → Context → CTA',
        },
        {
          label: 'Strengthen Sign-off',
          description: 'Current "Hope to hear from you" is weak. Use "I\'ll follow up Thursday if I don\'t hear back."',
          suggestedAction: 'Replace hope-based sign-off with action-based one',
        },
      ],
    },
  ],
};

const fakeTextScore: FrameScore = {
  frameScore: 62,
  overallFrame: 'mixed',
  overallWinWinState: 'neutral',
  domain: 'sales_email',
  axisScores: [
    { axisId: 'assumptive_state', score: 1, band: 'mild_apex', notes: 'Good opener but erodes' },
    { axisId: 'buyer_seller_position', score: -1, band: 'mild_slave', notes: 'Shifts to seller in close' },
    { axisId: 'identity_vs_tactic', score: 0, band: 'neutral', notes: 'No identity fusion observed' },
    { axisId: 'internal_sale', score: 1, band: 'mild_apex', notes: 'Appears confident initially' },
    { axisId: 'win_win_integrity', score: 1, band: 'mild_apex', notes: 'Value proposition present' },
    { axisId: 'persuasion_style', score: 0, band: 'neutral', notes: 'Standard sales language' },
    { axisId: 'pedestalization', score: -1, band: 'mild_slave', notes: '"I would love to" pedestalizes' },
    { axisId: 'self_trust_vs_permission', score: -1, band: 'mild_slave', notes: 'Permission-seeking close' },
    { axisId: 'field_strength', score: 0, band: 'neutral', notes: 'Average presence' },
  ],
  weightedAxisScores: [
    { axisId: 'assumptive_state', normalizedScore: 66.7, weight: 2 },
    { axisId: 'buyer_seller_position', normalizedScore: 33.3, weight: 2 },
  ],
  notes: ['Base score: 64', 'Win-win adjustment: -2', 'Final: 62'],
};

const fakeTextResult: FrameScanResult = {
  status: 'ok',
  rejectionReason: null,
  modality: 'text',
  domain: 'sales_email',
  overallFrame: 'mixed',
  overallWinWinState: 'neutral',
  axes: fakeTextScore.axisScores,
  diagnostics: {
    primaryPatterns: ['seller positioning', 'permission-seeking close'],
    supportingEvidence: ['"I would love to discuss"', '"if you have time"', '"Hope to hear from you"'],
  },
  corrections: {
    topShifts: [
      { axisId: 'buyer_seller_position', shift: 'Move from seller to buyer frame', protocolSteps: ['Remove "I would love to"', 'Add assumptive close'] },
    ],
    sampleRewrites: [
      { purpose: 'closing paragraph', apexVersion: 'Let\'s schedule 15 minutes this week. I\'ll send calendar options.' },
    ],
  },
};

const fakeTextReport: FrameScanReport = {
  id: 'demo-text-001',
  createdAt: new Date().toISOString(),
  subjectType: 'self',
  subjectContactIds: [CONTACT_ZERO.id],
  modality: 'text',
  domain: 'sales_email',
  sourceRef: 'demo',
  rawResult: fakeTextResult,
  score: fakeTextScore,
  uiReport: fakeTextUIReport,
};

// =============================================================================
// FAKE DATA - Image Report with Annotations
// =============================================================================
const fakeImageAnnotations: FrameImageAnnotation[] = [
  {
    id: 'anno-1',
    label: 'Body Posture',
    description: 'Subject is leaning back with open stance, projecting confidence and relaxed authority.',
    severity: 'info',
    x: 0.35,
    y: 0.20,
    width: 0.30,
    height: 0.60,
  },
  {
    id: 'anno-2',
    label: 'Eye Contact',
    description: 'Direct gaze at camera with relaxed brow. Strong presence without aggression.',
    severity: 'info',
    x: 0.40,
    y: 0.10,
    width: 0.20,
    height: 0.15,
  },
  {
    id: 'anno-3',
    label: 'Hand Position',
    description: 'Hands visible and relaxed. Palms partially visible signals openness.',
    severity: 'info',
    x: 0.25,
    y: 0.50,
    width: 0.15,
    height: 0.20,
  },
  {
    id: 'anno-4',
    label: 'Space Occupation',
    description: 'Subject occupies significant frame space without appearing cramped. Good use of environmental context.',
    severity: 'info',
    x: 0.10,
    y: 0.05,
    width: 0.80,
    height: 0.90,
  },
  {
    id: 'anno-5',
    label: 'Smile Quality',
    description: 'Slight smile without excessive teeth display. Reads as confident rather than eager to please.',
    severity: 'warning',
    x: 0.38,
    y: 0.18,
    width: 0.24,
    height: 0.10,
  },
];

const fakeImageUIReport: FrameScanUIReport = {
  header: {
    title: 'Profile Photo Analysis',
    oneLineVerdict: 'Strong frame presence with confident body language. Minor optimization possible in background context.',
    highlightScore: 78,
    badges: ['Strong Posture', 'Good Eye Contact', 'Confident Presence', 'Open Body Language'],
  },
  sections: [
    {
      id: 'summary',
      title: 'Visual Frame Summary',
      mainParagraph: 'This profile photo projects authority and approachability in balance. The subject\'s posture, eye contact, and space occupation all signal high frame. Background choice supports rather than detracts from presence.',
    },
    {
      id: 'strengths',
      title: 'Visual Strengths',
      bullets: [
        'Direct eye contact with camera establishes immediate connection',
        'Relaxed but upright posture signals confidence without tension',
        'Good use of vertical space - not cramped or floating',
        'Natural lighting flatters without appearing staged',
        'Subtle smile conveys warmth without over-eagerness',
      ],
    },
    {
      id: 'weaknesses',
      title: 'Areas for Improvement',
      bullets: [
        'Background could be more intentional (consider environmental cues of success)',
        'Slight tilt of head reads as accommodating - consider neutral or slight chin-up',
        'Clothing choice is professional but generic - could differentiate more',
      ],
    },
    {
      id: 'corrections',
      title: 'Optimization Suggestions',
      corrections: [
        {
          label: 'Environmental Context',
          description: 'Consider a background that suggests your professional domain (office, industry setting, etc.)',
          suggestedAction: 'Reshoot with intentional background or use subtle depth of field',
        },
        {
          label: 'Head Position',
          description: 'Current slight tilt can read as accommodating. Neutral or slight upward angle projects more authority.',
          suggestedAction: 'Keep chin parallel to ground or slightly elevated',
        },
      ],
    },
  ],
};

const fakeImageScore: FrameScore = {
  frameScore: 78,
  overallFrame: 'apex',
  overallWinWinState: 'win_win',
  domain: 'profile_photo',
  axisScores: [
    { axisId: 'assumptive_state', score: 2, band: 'mild_apex', notes: 'Confident presence in frame' },
    { axisId: 'buyer_seller_position', score: 2, band: 'mild_apex', notes: 'Not trying to impress' },
    { axisId: 'identity_vs_tactic', score: 1, band: 'mild_apex', notes: 'Appears authentic' },
    { axisId: 'internal_sale', score: 2, band: 'mild_apex', notes: 'Self-assured expression' },
    { axisId: 'win_win_integrity', score: 2, band: 'mild_apex', notes: 'Inviting without desperate' },
    { axisId: 'persuasion_style', score: 1, band: 'mild_apex', notes: 'Natural, not performative' },
    { axisId: 'pedestalization', score: 2, band: 'mild_apex', notes: 'Eye level, not looking up' },
    { axisId: 'self_trust_vs_permission', score: 2, band: 'mild_apex', notes: 'No approval-seeking cues' },
    { axisId: 'field_strength', score: 2, band: 'mild_apex', notes: 'Strong spatial presence' },
  ],
  weightedAxisScores: [
    { axisId: 'field_strength', normalizedScore: 83.3, weight: 2 },
    { axisId: 'pedestalization', normalizedScore: 83.3, weight: 2 },
  ],
  notes: ['Base score: 78', 'Win-win bonus: +0', 'Final: 78'],
};

const fakeImageResult: FrameScanResult = {
  status: 'ok',
  rejectionReason: null,
  modality: 'image',
  domain: 'profile_photo',
  overallFrame: 'apex',
  overallWinWinState: 'win_win',
  axes: fakeImageScore.axisScores,
  diagnostics: {
    primaryPatterns: ['strong spatial presence', 'confident eye contact'],
    supportingEvidence: ['direct gaze', 'open posture', 'relaxed expression'],
  },
  corrections: {
    topShifts: [
      { axisId: 'field_strength', shift: 'Strengthen environmental context', protocolSteps: ['Add professional background', 'Consider depth of field'] },
    ],
  },
};

const fakeImageReport: FrameScanReport = {
  id: 'demo-image-001',
  createdAt: new Date().toISOString(),
  subjectType: 'self',
  subjectContactIds: [CONTACT_ZERO.id],
  modality: 'image',
  domain: 'profile_photo',
  sourceRef: 'demo',
  rawResult: fakeImageResult,
  score: fakeImageScore,
  uiReport: fakeImageUIReport,
  imageAnnotations: fakeImageAnnotations,
  annotatedImageUrl: '/demo/annotated-profile.png', // Placeholder - add image to public/demo/
};

// =============================================================================
// DEMO PAGE COMPONENT
// =============================================================================
export const FrameReportDemoPage: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  
  const report = mode === 'text' ? fakeTextReport : fakeImageReport;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Scan size={24} className="text-[#4433FF]" />
              <div>
                <h1 className="text-xl font-bold text-white">Frame Report Demo</h1>
                <p className="text-xs text-gray-500">Visual testing with fake data • No API calls</p>
              </div>
            </div>
            
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-[#1A1A1D] rounded-lg border border-[#333]">
              <button
                onClick={() => setMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'text'
                    ? 'bg-[#4433FF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText size={16} />
                Text Demo
              </button>
              <button
                onClick={() => setMode('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'image'
                    ? 'bg-[#4433FF] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon size={16} />
                Image Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-6xl mx-auto">
        <FrameScanReportDetail
          reportId={report.id}
          demoReport={report}
        />
      </div>

      {/* Debug Info */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <details className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <summary className="px-6 py-4 cursor-pointer text-sm font-bold text-gray-400 hover:text-white">
            View Raw Report Data (Debug)
          </summary>
          <pre className="px-6 py-4 text-xs text-gray-500 overflow-auto max-h-96 border-t border-[#2A2A2A]">
            {JSON.stringify(report, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default FrameReportDemoPage;

