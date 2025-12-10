// =============================================================================
// DEMO DATA SEEDING — Dev-only function to populate FrameScan reports
// =============================================================================
// Idempotent: only runs once per browser session (localStorage flag).
// Creates sample FrameScan reports with realistic scores and analysis.
// =============================================================================

import { addFrameScanReport, getFrameScanReports } from '../services/frameScanReportStore';
import { CONTACT_ZERO, getAllContacts } from '../services/contactStore';
import type { FrameDomainId } from '../lib/frameScan/frameTypes';

const DEMO_FRAMESCAN_SEEDED_KEY = 'framelord_framescan_demo_seeded';

// =============================================================================
// DEMO FRAME SCAN CONFIGURATIONS
// =============================================================================

interface DemoFrameScanConfig {
  domain: FrameDomainId;
  modality: 'text' | 'image';
  score: {
    frameScore: number;
    overallFrame: 'apex' | 'neutral' | 'slave';
    confidence: number;
  };
  inputPreview: string;
  analysis: {
    interpretation: string;
    recommendations: string[];
  };
  axisScores: Record<string, number>;
  daysAgo: number;
  // New fields for Apex View integration
  title?: string;
  miniReportMarkdown?: string;
}

const DEMO_FRAME_SCANS: DemoFrameScanConfig[] = [
  // High-scoring Apex frame example
  {
    domain: 'sales_email',
    modality: 'text',
    score: {
      frameScore: 82,
      overallFrame: 'apex',
      confidence: 0.89,
    },
    title: 'Sales Email: Series B Outreach',
    miniReportMarkdown: `# Sales Email Analysis

This scan identified an **[[Apex Frame]]** with a FrameScore of 82/100.

Frame Classification: [[Apex Frame]]
Win-Win State: [[Win-Win]]

## Patterns Detected

- Strong [[Assumptive State]] - sender assumes baseline desirability
- Solid [[Buyer Seller Position]] - qualifying rather than pitching
- Excellent [[Internal Sale]] - confident in own value
- Clean [[Win-Win Integrity]] - genuine value offered without pressure

## Priority Corrections

### [[Persuasion Style]]

The closing "No pitch, just patterns" could be stronger — consider removing it entirely as it still hints at selling.

**Protocol:**
1. Let the value speak for itself
2. Trust the recipient to understand your intent
3. Remove any defensive framing

### [[Field Strength]]

Add a specific metric or outcome to increase credibility and presence.

**Protocol:**
1. Replace vague "worked for them" with specific result
2. Quantify the outcome where possible
3. Show concrete evidence without bragging

## Axis Breakdown

- [[Assumptive State]]: +2.5 (STRONG APEX)
- [[Buyer Seller Position]]: +2.2 (STRONG APEX)
- [[Identity vs Tactic]]: +2.0 (MILD APEX)
- [[Internal Sale]]: +2.8 (STRONG APEX)
- [[Win-Win Integrity]]: +2.3 (STRONG APEX)
- [[Persuasion Style]]: +1.8 (MILD APEX)
- [[Pedestalization]]: +2.1 (STRONG APEX)
- [[Self Trust vs Permission]]: +2.4 (STRONG APEX)
- [[Field Strength]]: +2.0 (MILD APEX)

---

*Related: [[Apex Frame]] [[Frame Score]] [[Win-Win]] [[FrameScan]]*`,
    inputPreview: 'Hi [Name],\n\nI noticed your company just raised Series B. Congrats — that growth pace is impressive.\n\nI work with 3 companies in your space who faced the same scaling challenges you\'re about to hit. Happy to share what worked for them if useful.\n\nNo pitch, just patterns.\n\n[Signature]',
    analysis: {
      interpretation: 'This email demonstrates strong Apex frame positioning. The sender leads with genuine observation, offers value without neediness, and maintains outcome independence with "if useful."',
      recommendations: [
        'The closing "No pitch, just patterns" could be stronger — consider removing it as it still hints at selling',
        'Add a specific metric or outcome to increase credibility',
        'The casual tone matches the Apex energy well',
      ],
    },
    // Use correct doctrine axis IDs from frameScanSpec.json
    axisScores: {
      assumptive_state: 2.5,
      buyer_seller_position: 2.2,
      identity_vs_tactic: 2.0,
      internal_sale: 2.8,
      win_win_integrity: 2.3,
      persuasion_style: 1.8,
      pedestalization: 2.1,
      self_trust_vs_permission: 2.4,
      field_strength: 2.0,
    },
    daysAgo: 2,
  },
  // Slave frame example for comparison
  {
    domain: 'sales_email',
    modality: 'text',
    score: {
      frameScore: 34,
      overallFrame: 'slave',
      confidence: 0.92,
    },
    title: 'Sales Email: Needy Outreach',
    miniReportMarkdown: `# Sales Email Analysis

This scan identified a **[[Slave Frame]]** with a FrameScore of 34/100.

Frame Classification: [[Slave Frame]]
Win-Win State: [[Win-Lose]]

## Patterns Detected

- Collapsed [[Assumptive State]] - seeking permission rather than assuming value
- Inverted [[Buyer Seller Position]] - pitching rather than qualifying
- Chronic [[Pedestalization]] - treating recipient as higher status
- Weak [[Self Trust vs Permission]] - apologizing for contact

## Priority Corrections

### [[Buyer Seller Position]]

Shift from seller posture (chasing) to buyer posture (qualifying fit).

**Protocol:**
1. Remove "I would love the opportunity" language
2. Lead with qualification question, not pitch
3. State your standards for collaboration
4. Let prospect earn your time and attention

### [[Assumptive State]]

Move from "hoping to help" to assuming you have valuable options.

**Protocol:**
1. Replace "I hope this finds you well" with direct opener
2. Remove "I promise not to take too much of your time"
3. Assume your time is equally valuable
4. Frame as mutual assessment, not one-sided ask

### [[Pedestalization]]

Stop treating the recipient as an authority figure to whom you must prove yourself.

**Protocol:**
1. Eliminate supplicating language
2. Position as peer collaboration
3. State what you bring to the table
4. Make it about fit, not need

## Axis Breakdown

- [[Assumptive State]]: -2.0 (MILD SLAVE)
- [[Buyer Seller Position]]: -2.5 (STRONG SLAVE)
- [[Identity vs Tactic]]: -1.5 (MILD SLAVE)
- [[Internal Sale]]: -2.2 (STRONG SLAVE)
- [[Win-Win Integrity]]: -1.0 (MILD SLAVE)
- [[Persuasion Style]]: -1.8 (MILD SLAVE)
- [[Pedestalization]]: -2.3 (STRONG SLAVE)
- [[Self Trust vs Permission]]: -2.5 (STRONG SLAVE)
- [[Field Strength]]: -1.5 (MILD SLAVE)

---

*Related: [[Slave Frame]] [[Frame Score]] [[Win-Lose]] [[FrameScan]]*`,
    inputPreview: 'Hi [Name],\n\nI hope this email finds you well! I wanted to reach out because I think we could really help your company.\n\nWe have helped many clients achieve amazing results and I would love the opportunity to show you what we can do.\n\nWould you be open to a quick 15-minute call? I promise not to take too much of your time.\n\n[Signature]',
    analysis: {
      interpretation: 'This email exhibits multiple Slave frame signals: "I hope this finds you well" (filler), "I would love the opportunity" (permission-seeking), and "I promise not to take too much of your time" (apologetic positioning).',
      recommendations: [
        'Remove apologetic language entirely — it signals low value',
        'Lead with specific value, not vague promises of "amazing results"',
        'Replace permission-seeking with confident assertion of value',
        'Eliminate time-wasting clichés like "I hope this finds you well"',
      ],
    },
    // Use correct doctrine axis IDs - negative scores for slave frame
    axisScores: {
      assumptive_state: -2.0,
      buyer_seller_position: -2.5,
      identity_vs_tactic: -1.5,
      internal_sale: -2.2,
      win_win_integrity: -1.0,
      persuasion_style: -1.8,
      pedestalization: -2.3,
      self_trust_vs_permission: -2.5,
      field_strength: -1.5,
    },
    daysAgo: 5,
  },
  // Neutral frame example
  {
    domain: 'leadership_update',
    modality: 'text',
    score: {
      frameScore: 58,
      overallFrame: 'neutral',
      confidence: 0.78,
    },
    title: 'Leadership Update: Q1 Priorities',
    miniReportMarkdown: `# Leadership Update Analysis

This scan identified a **[[Neutral Frame]]** with a FrameScore of 58/100.

Frame Classification: [[Neutral Frame]]
Win-Win State: [[Win-Win]]

## Patterns Detected

- Functional [[Assumptive State]] - neither seeking permission nor assuming authority
- Neutral [[Buyer Seller Position]] - informational rather than influential
- Weak [[Field Strength]] - lacks energetic presence
- Clean [[Win-Win Integrity]] - no manipulation, but also no inspiration

## Priority Corrections

### [[Field Strength]]

Add vision and context for WHY these priorities matter to increase presence.

**Protocol:**
1. Connect priorities to larger mission
2. Show conviction rather than just listing items
3. Paint a picture of where this leads

### [[Persuasion Style]]

Replace passive "let me know" with forward momentum call to action.

**Protocol:**
1. End with specific next step
2. Invite active participation
3. Show where team input will be used

## Axis Breakdown

- [[Assumptive State]]: +0.5 (NEUTRAL)
- [[Buyer Seller Position]]: +0.2 (NEUTRAL)
- [[Identity vs Tactic]]: +0.8 (NEUTRAL)
- [[Internal Sale]]: +0.3 (NEUTRAL)
- [[Win-Win Integrity]]: +1.0 (MILD APEX)
- [[Persuasion Style]]: 0.0 (NEUTRAL)
- [[Pedestalization]]: +0.5 (NEUTRAL)
- [[Self Trust vs Permission]]: +0.2 (NEUTRAL)
- [[Field Strength]]: +0.4 (NEUTRAL)

---

*Related: [[Neutral Frame]] [[Frame Score]] [[Win-Win]] [[FrameScan]]*`,
    inputPreview: 'Team,\n\nQuick update on Q1 priorities.\n\nWe\'re focusing on three areas this quarter: product velocity, customer retention, and team growth. I\'ll share more details in our all-hands next week.\n\nLet me know if you have questions.\n\n[Name]',
    analysis: {
      interpretation: 'Functional communication but lacks frame presence. Neither strongly Apex nor Slave — just informational. The message gets the job done but misses an opportunity to inspire or lead.',
      recommendations: [
        'Add vision and context for WHY these priorities matter',
        'Include a call to action that energizes the team',
        'Show conviction rather than just listing items',
        'End with forward momentum, not passive "let me know"',
      ],
    },
    // Use correct doctrine axis IDs - neutral scores
    axisScores: {
      assumptive_state: 0.5,
      buyer_seller_position: 0.2,
      identity_vs_tactic: 0.8,
      internal_sale: 0.3,
      win_win_integrity: 1.0,
      persuasion_style: 0.0,
      pedestalization: 0.5,
      self_trust_vs_permission: 0.2,
      field_strength: 0.4,
    },
    daysAgo: 8,
  },
  // Dating message Apex example
  {
    domain: 'dating_message',
    modality: 'text',
    score: {
      frameScore: 75,
      overallFrame: 'apex',
      confidence: 0.85,
    },
    title: 'Dating Message: Playful Opener',
    miniReportMarkdown: `# Dating Message Analysis

This scan identified an **[[Apex Frame]]** with a FrameScore of 75/100.

Frame Classification: [[Apex Frame]]
Win-Win State: [[Win-Win]]

## Patterns Detected

- Strong [[Assumptive State]] - assumes baseline desirability, no approval seeking
- Solid [[Buyer Seller Position]] - qualifying rather than pitching self
- Excellent [[Internal Sale]] - comfortable with own value
- Clean [[Persuasion Style]] - playful tease without manipulation

## Priority Corrections

### [[Field Strength]]

The question could be more specific to increase engagement likelihood.

**Protocol:**
1. Ask about a specific place or experience
2. Make the question easier to answer
3. Create natural callback opportunity

---

*Related: [[Apex Frame]] [[Frame Score]] [[Win-Win]] [[Assumptive State]]*`,
    inputPreview: 'That hiking photo in Patagonia — you either have a great adventure streak or excellent taste in stock photos.\n\nI\'m [Name]. Currently obsessed with learning to cook Thai food badly. Your bio mentioned you travel a lot — any favorite hidden gems?',
    analysis: {
      interpretation: 'Playful opener with confident frame. The tease about stock photos shows wit without being mean. Self-deprecating humor about cooking maintains approachability while the direct question invites engagement.',
      recommendations: [
        'Strong opening — the tease creates intrigue',
        'The question at the end is good but could be more specific',
        'Consider adding a subtle callback opportunity for the next message',
      ],
    },
    // Use correct doctrine axis IDs
    axisScores: {
      assumptive_state: 2.0,
      buyer_seller_position: 1.8,
      identity_vs_tactic: 2.2,
      internal_sale: 1.5,
      win_win_integrity: 2.0,
      persuasion_style: 1.8,
      pedestalization: 1.5,
      self_trust_vs_permission: 2.0,
      field_strength: 2.2,
    },
    daysAgo: 12,
  },
  // Social post example
  {
    domain: 'social_post',
    modality: 'text',
    score: {
      frameScore: 68,
      overallFrame: 'apex',
      confidence: 0.81,
    },
    title: 'Social Post: Productivity Opinion',
    miniReportMarkdown: `# Social Post Analysis

This scan identified an **[[Apex Frame]]** with a FrameScore of 68/100.

Frame Classification: [[Apex Frame]]
Win-Win State: [[Win-Win]]

## Patterns Detected

- Strong [[Assumptive State]] - takes a clear stance without hedging
- Solid [[Internal Sale]] - confident in perspective
- Excellent [[Self Trust vs Permission]] - doesn't seek validation
- High [[Field Strength]] - commanding presence and conviction

## Priority Corrections

### [[Persuasion Style]]

The word "violently" might be too aggressive for some contexts.

**Protocol:**
1. Consider softer alternatives like "fiercely" or "ruthlessly"
2. Match tone to audience expectations
3. Maintain conviction without alienating readers

### [[Field Strength]]

Could add a specific example to ground the advice and increase credibility.

**Protocol:**
1. Cite one concrete case
2. Show the outcome clearly
3. Keep it brief to maintain punchy style

---

*Related: [[Apex Frame]] [[Frame Score]] [[Field Strength]] [[Self Trust vs Permission]]*`,
    inputPreview: 'Unpopular opinion: Most productivity advice is cope for avoiding the real work.\n\nYou don\'t need another system. You need to decide what matters and protect it violently.\n\nThe best performers I know have embarrassingly simple workflows. They just execute.',
    analysis: {
      interpretation: 'Strong opinion leadership with clear conviction. The post takes a stance, offers perspective, and doesn\'t hedge. Good frame positioning for thought leadership.',
      recommendations: [
        'The word "violently" might be too aggressive for some contexts',
        'Could add a specific example to ground the advice',
        'Strong close — "They just execute" lands well',
      ],
    },
    // Use correct doctrine axis IDs
    axisScores: {
      assumptive_state: 1.8,
      buyer_seller_position: 1.5,
      identity_vs_tactic: 2.0,
      internal_sale: 1.8,
      win_win_integrity: 1.2,
      persuasion_style: 2.0,
      pedestalization: 1.0,
      self_trust_vs_permission: 2.2,
      field_strength: 2.5,
    },
    daysAgo: 15,
  },
  // Image scan example
  {
    domain: 'profile_photo',
    modality: 'image',
    score: {
      frameScore: 71,
      overallFrame: 'apex',
      confidence: 0.76,
    },
    title: 'Profile Photo: Professional Headshot',
    miniReportMarkdown: `# Profile Photo Analysis

This scan identified an **[[Apex Frame]]** with a FrameScore of 71/100.

Frame Classification: [[Apex Frame]]
Win-Win State: [[Win-Win]]

## Patterns Detected

- Strong [[Assumptive State]] - direct eye contact signals confidence
- Solid [[Field Strength]] - commanding presence without aggression
- Good [[Internal Sale]] - comfortable being seen
- Clean [[Win-Win Integrity]] - approachable but authoritative

## Priority Corrections

### [[Field Strength]]

Consider upgrading lighting for more professional feel and increased visual presence.

**Protocol:**
1. Use professional lighting setup
2. Ensure even lighting on face
3. Add subtle depth with background separation

### Visual Context

The background could have more depth or context to strengthen overall impression.

**Protocol:**
1. Add subtle environmental context
2. Avoid busy backgrounds
3. Create depth with lighting or focus

---

*Related: [[Apex Frame]] [[Frame Score]] [[Field Strength]] [[Win-Win]]*`,
    inputPreview: '[Profile photo: Professional headshot with confident eye contact, slight smile, neutral background]',
    analysis: {
      interpretation: 'Good frame presence in the photo. Direct eye contact and open body language signal confidence. The slight smile adds approachability without undermining authority.',
      recommendations: [
        'Consider upgrading lighting for more professional feel',
        'The background could have more depth or context',
        'Expression is good — confident but not aggressive',
      ],
    },
    // Use correct doctrine axis IDs
    axisScores: {
      assumptive_state: 1.8,
      buyer_seller_position: 2.0,
      identity_vs_tactic: 1.5,
      internal_sale: 1.8,
      win_win_integrity: 2.0,
      persuasion_style: 1.5,
      pedestalization: 1.2,
      self_trust_vs_permission: 1.8,
      field_strength: 2.2,
    },
    daysAgo: 20,
  },
];

// =============================================================================
// MAIN SEEDING FUNCTION
// =============================================================================

/**
 * Seed demo FrameScan reports.
 * Idempotent: only runs once per browser session.
 *
 * @returns true if seeding occurred, false if skipped
 */
export function seedDemoFrameScans(): boolean {
  console.log('[Demo FrameScan] seedDemoFrameScans() called');

  // Check if already seeded this session
  const hasFlag = localStorage.getItem(DEMO_FRAMESCAN_SEEDED_KEY);
  console.log('[Demo FrameScan] localStorage flag:', hasFlag);
  if (hasFlag) {
    console.log('[Demo FrameScan] Already seeded this session, skipping');
    return false;
  }

  // Check if any reports already exist
  const existingReports = getFrameScanReports();
  console.log('[Demo FrameScan] Existing reports count:', existingReports.length);
  if (existingReports.length > 0) {
    console.log('[Demo FrameScan] Reports already exist, skipping seed');
    return false;
  }

  console.log('[Demo FrameScan] Seeding demo FrameScan reports...');

  // Get contacts for attribution
  const contacts = getAllContacts();
  const contactZeroId = CONTACT_ZERO.id;

  for (const config of DEMO_FRAME_SCANS) {
    // Calculate date
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - config.daysAgo);

    // Build proper axis scores matching FrameAxisScore interface
    // Scores are in -3 to +3 range per doctrine spec
    const axisScores = Object.entries(config.axisScores).map(([axis, score]) => ({
      axisId: axis as any,
      score,
      band: score >= 2 ? 'strong_apex' as const
          : score >= 0.5 ? 'mild_apex' as const
          : score <= -2 ? 'strong_slave' as const
          : score <= -0.5 ? 'mild_slave' as const
          : 'neutral' as const,
      notes: `Score based on ${axis.replace(/_/g, ' ')} indicators in the content.`,
    }));

    // Build weighted axis scores matching WeightedAxisScore interface
    const weightedAxisScores = axisScores.map(as => ({
      axisId: as.axisId,
      normalizedScore: ((as.score + 3) / 6) * 100, // Convert -3 to +3 to 0-100
      weight: 1.0,
    }));

    // Build complete FrameScore
    const fullScore = {
      frameScore: config.score.frameScore,
      overallFrame: config.score.overallFrame === 'neutral' ? 'mixed' as const : config.score.overallFrame,
      overallWinWinState: config.score.frameScore >= 60 ? 'win_win' as const : 'win_lose' as const,
      domain: config.domain,
      axisScores,
      weightedAxisScores,
      notes: [config.analysis.interpretation],
    };

    // Build rawResult - must match FrameScanResult interface
    const rawResult = {
      status: 'ok' as const,
      rejectionReason: null,
      modality: config.modality,
      domain: config.domain,
      overallFrame: config.score.overallFrame === 'neutral' ? 'mixed' as const : config.score.overallFrame,
      overallWinWinState: config.score.frameScore >= 60 ? 'win_win' as const : 'win_lose' as const,
      axes: axisScores,
      diagnostics: {
        primaryPatterns: [config.analysis.interpretation.substring(0, 50)],
        supportingEvidence: config.analysis.recommendations.slice(0, 2),
      },
      corrections: {
        topShifts: config.analysis.recommendations.slice(0, 2).map((rec, i) => ({
          axisId: axisScores[i]?.axisId || 'assumptive_state',
          shift: rec,
          protocolSteps: ['Review and apply'],
        })),
        sampleRewrites: config.analysis.recommendations.slice(0, 1).map(rec => ({
          purpose: 'Improvement',
          apexVersion: rec,
        })),
      },
    };

    // Build proper UI report structure
    const uiReport = {
      header: {
        title: `${config.domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Analysis`,
        oneLineVerdict: config.analysis.interpretation.substring(0, 100),
        highlightScore: config.score.frameScore,
        badges: [
          config.score.overallFrame,
          config.score.frameScore >= 60 ? 'win-win' : 'needs-work',
        ],
      },
      sections: [
        {
          id: 'summary',
          title: 'Summary',
          mainParagraph: config.analysis.interpretation,
        },
        {
          id: 'strengths',
          title: 'Strengths',
          bullets: ['Strong positioning', 'Clear value proposition', 'Confident tone'],
        },
        {
          id: 'weaknesses',
          title: 'Weaknesses',
          bullets: config.analysis.recommendations.slice(0, 3),
        },
        {
          id: 'corrections',
          title: 'Corrections',
          corrections: config.analysis.recommendations.map((rec, i) => ({
            label: `Correction ${i + 1}`,
            description: rec,
            suggestedAction: 'Review and apply this change',
          })),
        },
      ],
    };

    // Create the report with full schema
    // For image scans, use a placeholder image URL
    const sourceRef = config.modality === 'image'
      ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop'
      : config.inputPreview.substring(0, 100);

    addFrameScanReport({
      domain: config.domain,
      modality: config.modality,
      subjectType: 'contact',
      subjectContactIds: [contactZeroId],
      sourceRef,
      createdAt: createdAt.toISOString(),
      title: config.title,
      miniReportMarkdown: config.miniReportMarkdown,
      score: fullScore,
      rawResult,
      uiReport,
    });

    console.log(`[Demo FrameScan] Created ${config.domain} report (score: ${config.score.frameScore})`);
  }

  // Mark as seeded for this session
  localStorage.setItem(DEMO_FRAMESCAN_SEEDED_KEY, 'true');

  console.log(`[Demo FrameScan] Seeding complete. Created ${DEMO_FRAME_SCANS.length} reports.`);

  return true;
}

/**
 * Clear demo seed flag (for testing / re-seeding).
 */
export function clearFrameScanDemoSeedFlag(): void {
  localStorage.removeItem(DEMO_FRAMESCAN_SEEDED_KEY);
  console.log('[Demo FrameScan] Seed flag cleared');
}
