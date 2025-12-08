// =============================================================================
// DEMO DATA SEEDING — Dev-only function to populate Wants with realistic data
// =============================================================================
// Idempotent: only runs once per browser session (localStorage flag).
// Creates 3 demo Wants with:
// - 30+ days of metrics
// - 5-6 iterations each
// - Doctrine notes
// - Multiple steps in various states
// =============================================================================

import {
  createWant,
  addStep,
  logMetricValue,
  getAllWants,
  updateStep,
  type WantStatus,
} from '../services/wantStore';
import {
  createScopeForWant,
  logIterationEntry,
  addDoctrineNote,
  createDossierForWant,
  type IterationAction,
} from '../services/wantScopeStore';

const DEMO_SEEDED_KEY = 'framelord_demo_seeded';

// =============================================================================
// TYPES
// =============================================================================

interface DemoStep {
  title: string;
  description?: string;
  status: WantStatus;
  deadline?: string;
}

interface DemoMetricEntry {
  daysAgo: number;
  values: Record<string, number | boolean | null>;
}

interface DemoIteration {
  action: IterationAction;
  feedback: string;
  consequence: string;
  daysAgo: number;
}

interface DemoDossier {
  summary: string;
  why_it_matters: string;
  intended_timeline: string;
  win_win_frame: string;
  risks_or_costs: string;
  covert_contract_flags: string[];
  congruence_notes: string;
}

interface DemoWantConfig {
  title: string;
  reason: string;
  deadline: string | null;
  steps: DemoStep[];
  metricTypes: string[];
  metricsGenerator: (days: number) => DemoMetricEntry[];
  iterations: DemoIteration[];
  doctrineNotes: string[];
  coverImageUrl?: string | null; // TEMP_DEV: Data URL placeholder
  dossier: DemoDossier;
}

// =============================================================================
// METRIC GENERATORS
// =============================================================================

/**
 * Generate 30+ days of bodyfat-related metrics.
 * Simulates weight loss journey with realistic variance.
 */
function generateBodyfatMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];
  let weight = 195;

  for (let i = days; i >= 0; i--) {
    // Weight trends down with some variance
    weight = Math.max(178, weight - (Math.random() * 0.5 - 0.1));

    data.push({
      daysAgo: i,
      values: {
        weight: Math.round(weight * 10) / 10,
        calories: Math.floor(1800 + Math.random() * 400),
        calories_burned: Math.floor(2200 + Math.random() * 300),
        protein: Math.floor(140 + Math.random() * 40),
        sleep: Math.round((6.5 + Math.random() * 2) * 10) / 10,
        workout: Math.random() > 0.3, // ~70% workout rate
      },
    });
  }
  return data;
}

/**
 * Generate 30+ days of income/pipeline metrics.
 * Simulates sporadic income with some days having large amounts.
 */
function generateIncomeMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];

  for (let i = days; i >= 0; i--) {
    // Sporadic income: ~30% of days have income
    const dailyIncome = Math.random() > 0.7 ? Math.floor(Math.random() * 3000 + 500) : 0;

    data.push({
      daysAgo: i,
      values: {
        income: dailyIncome,
        hours_worked: Math.floor(4 + Math.random() * 6),
        calls_made: Math.floor(Math.random() * 5),
        proposals_sent: Math.random() > 0.6 ? 1 : 0,
      },
    });
  }
  return data;
}

/**
 * Generate 30+ days of sleep metrics.
 * Simulates varying sleep patterns.
 */
function generateSleepMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];

  for (let i = days; i >= 0; i--) {
    data.push({
      daysAgo: i,
      values: {
        sleep: Math.round((6 + Math.random() * 2.5) * 10) / 10,
        sleep_quality: Math.floor(60 + Math.random() * 40), // 60-100
        caffeine_cutoff: Math.random() > 0.3 ? 14 : Math.floor(14 + Math.random() * 4),
      },
    });
  }
  return data;
}

/**
 * Generate 30+ days of strength training metrics.
 * Simulates progressive overload on bench press.
 */
function generateStrengthMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];
  let benchMax = 185; // Starting point

  for (let i = days; i >= 0; i--) {
    // Progress slowly upward with variance
    benchMax = Math.min(225, benchMax + (Math.random() * 1.5 - 0.3));

    data.push({
      daysAgo: i,
      values: {
        bench_max: Math.round(benchMax),
        sets_completed: Math.floor(3 + Math.random() * 2),
        gym_session: Math.random() > 0.4, // ~60% training frequency
        bodyweight: Math.round((185 + Math.random() * 5) * 10) / 10,
      },
    });
  }
  return data;
}

/**
 * Generate 30+ days of family time metrics.
 * Simulates daily quality time tracking.
 */
function generateFamilyMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];

  for (let i = days; i >= 0; i--) {
    data.push({
      daysAgo: i,
      values: {
        quality_time_minutes: Math.floor(30 + Math.random() * 60), // 30-90 mins
        activities_done: Math.floor(1 + Math.random() * 3),
        phone_free: Math.random() > 0.25, // ~75% phone-free sessions
        bedtime_routine: Math.random() > 0.2, // ~80% did bedtime routine
      },
    });
  }
  return data;
}

/**
 * Generate 30+ days of relationship metrics.
 * Simulates weekly date nights and connection time.
 */
function generateRelationshipMetrics(days: number): DemoMetricEntry[] {
  const data: DemoMetricEntry[] = [];

  for (let i = days; i >= 0; i--) {
    // Date nights happen ~1x per week
    const isWeekend = (days - i) % 7 <= 1;
    const dateNight = isWeekend && Math.random() > 0.3;

    data.push({
      daysAgo: i,
      values: {
        date_night: dateNight,
        connection_minutes: dateNight ? Math.floor(90 + Math.random() * 60) : Math.floor(15 + Math.random() * 30),
        appreciation_shared: Math.random() > 0.4, // ~60% of days
        conflict_resolved: Math.random() > 0.85 ? true : null, // Occasional conflicts
      },
    });
  }
  return data;
}

// =============================================================================
// DEMO COVER IMAGES — TEMP_DEV: Placeholder SVG data URLs
// =============================================================================
// These are simple gradient placeholders. Will be replaced with actual images.

// Demo cover images from /public/images-demo/
const DEMO_COVER_FITNESS = '/images-demo/fitness-8564036_640.jpg';
const DEMO_COVER_BUSINESS = '/images-demo/banknotes-4516005_640.jpg';
const DEMO_COVER_SLEEP = '/images-demo/landscape-7396852_640.jpg';
const DEMO_COVER_STRENGTH = '/images-demo/bodybuilder-331671_640.jpg';
const DEMO_COVER_FAMILY = '/images-demo/newborn-9950817_640.jpg';
const DEMO_COVER_RELATIONSHIP = '/images-demo/people-7707981_640.jpg';

// =============================================================================
// DEMO WANT CONFIGURATIONS
// =============================================================================

const DEMO_WANTS: DemoWantConfig[] = [
  {
    title: 'Cut to 10% bodyfat',
    coverImageUrl: DEMO_COVER_FITNESS,
    reason: 'I want to see visible abs and feel powerful in my body. This is a sovereign choice.',
    deadline: '2025-06-01',
    steps: [
      { title: 'Track calories daily for 30 days', description: 'Use MyFitnessPal or similar to log all food intake without exception', status: 'done' },
      { title: 'Establish 500 cal deficit baseline', description: 'Calculate TDEE and set daily calorie target', status: 'done' },
      { title: 'Add 3x/week resistance training', description: 'Full body compound movements: squats, deadlifts, bench, rows', status: 'done' },
      { title: 'Cut alcohol completely', description: 'Zero alcohol for the duration of the cut', status: 'done', deadline: '2025-01-15' },
      { title: 'Weekly progress photos', description: 'Same lighting, same time, front/side/back', status: 'done' },
      { title: 'Hit protein target daily (150g)', description: 'Prioritize protein at every meal', status: 'in_progress' },
      { title: 'Meal prep Sundays', description: 'Prepare 4+ days of meals in advance', status: 'in_progress' },
      { title: 'Add 10k steps daily', description: 'NEAT increase through walking', status: 'in_progress', deadline: '2025-01-20' },
      { title: 'Switch to 4-day upper/lower split', description: 'Progress from 3x to 4x training frequency', status: 'in_progress' },
      { title: 'Get DEXA scan for baseline', description: 'Accurate bodyfat measurement', status: 'not_started', deadline: '2025-02-01' },
      { title: 'Implement refeed days', description: 'Strategic high-carb days to prevent metabolic adaptation', status: 'not_started' },
      { title: 'Add 2x cardio sessions', description: 'Low intensity steady state for extra burn', status: 'not_started', deadline: '2025-02-15' },
      { title: 'Review and adjust macros', description: 'Based on 4-week progress, recalculate needs', status: 'not_started' },
      { title: 'Hit 185lbs checkpoint', description: 'First major weight milestone', status: 'not_started', deadline: '2025-03-01' },
      { title: 'Add morning fasted cardio', description: 'Final push phase - 20min walks before breakfast', status: 'not_started' },
    ],
    metricTypes: ['weight', 'calories', 'calories_burned', 'protein', 'sleep', 'workout'],
    metricsGenerator: generateBodyfatMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'First week down, hunger manageable',
        consequence: 'Maintained deficit 6/7 days',
        daysAgo: 25,
      },
      {
        action: 'resistance',
        feedback: 'Social dinner made me overeat',
        consequence: 'Went 800 over. Reset next day.',
        daysAgo: 20,
      },
      {
        action: 'revision',
        feedback: 'Moving training to morning',
        consequence: 'Better consistency, hit 4/4 sessions this week',
        daysAgo: 14,
      },
      {
        action: 'milestone',
        feedback: 'Hit 185lbs from 195 start',
        consequence: '10lbs down, 15 to go',
        daysAgo: 10,
      },
      {
        action: 'external_feedback',
        feedback: 'Wife noticed physique change',
        consequence: 'External validation confirms progress',
        daysAgo: 5,
      },
      {
        action: 'reflection',
        feedback: 'Realizing this is about discipline, not motivation',
        consequence: 'Frame shift: execute regardless of feeling',
        daysAgo: 2,
      },
    ],
    doctrineNotes: [
      'This is a sovereign desire, not a should. User exhibits genuine want energy.',
      'Social pressure is a friction point. User must decide: eliminate or manage.',
      'Iteration is reality. This Want has consistent logs - not fantasy.',
    ],
    dossier: {
      summary: 'A disciplined cut to achieve 10% bodyfat through caloric deficit, resistance training, and habit stacking. This represents a clear, measurable transformation goal with defined milestones.',
      why_it_matters: 'Physical sovereignty drives mental clarity and self-confidence. Visible abs and a lean physique represent mastery over impulse and proof of sustained discipline. This is not about external validation—it is about proving to yourself that you can execute.',
      intended_timeline: '4-5 months to reach 10% bodyfat from current starting point (~195lbs). First checkpoint at 185lbs (Month 2), second at 175lbs (Month 4).',
      win_win_frame: 'Better health outcomes for family (modeling discipline for children), increased energy for work, and improved relationship dynamics through heightened confidence.',
      risks_or_costs: 'Social friction during cuts (dinner events, alcohol pressure). Potential muscle loss if deficit is too aggressive. Risk of metabolic adaptation if not implementing refeeds.',
      covert_contract_flags: [],
      congruence_notes: 'High congruence. User tracks daily, logs iterations, and has shown willingness to make uncomfortable adjustments. This is a REAL Want with execution energy.',
    },
  },
  {
    title: 'Build 25k/month consulting pipeline',
    coverImageUrl: DEMO_COVER_BUSINESS,
    reason: 'I want financial independence and leverage over my time.',
    deadline: '2025-04-01',
    steps: [
      { title: 'Define ideal client avatar', description: 'Document exact industry, company size, pain points, budget', status: 'done' },
      { title: 'Create outreach sequence', description: '5-touch email sequence with value-first approach', status: 'done' },
      { title: 'Build prospect list (500 contacts)', description: 'Use LinkedIn Sales Nav + Apollo', status: 'done' },
      { title: 'Set up CRM tracking', description: 'Pipeline stages, follow-up automation', status: 'done' },
      { title: 'Create case study deck', description: 'Social proof from past client wins', status: 'done', deadline: '2025-01-10' },
      { title: 'Launch outreach campaign', description: 'Send 50 personalized emails/week', status: 'in_progress' },
      { title: 'Book 10 discovery calls', description: 'Initial conversations with qualified leads', status: 'in_progress', deadline: '2025-02-01' },
      { title: 'Develop sales call script', description: 'Discovery questions, objection handling', status: 'in_progress' },
      { title: 'Create proposal template', description: 'Standardized format for fast turnaround', status: 'in_progress' },
      { title: 'Close first $5k retainer', description: 'Land pilot client at entry price point', status: 'not_started', deadline: '2025-02-15' },
      { title: 'Develop onboarding process', description: 'Client welcome kit, kickoff call structure', status: 'not_started' },
      { title: 'Build referral system', description: 'Ask-for-intro sequence, referral incentive program', status: 'not_started' },
      { title: 'Close 3 retainer clients', description: 'Reach $15k MRR baseline', status: 'not_started', deadline: '2025-03-15' },
      { title: 'Hire VA for admin', description: 'Delegate scheduling and follow-ups', status: 'not_started' },
      { title: 'Launch content marketing', description: 'LinkedIn posts 3x/week for inbound leads', status: 'not_started' },
      { title: 'Hit $25k MRR target', description: 'Final milestone - 5 active retainers', status: 'not_started', deadline: '2025-04-01' },
    ],
    metricTypes: ['income', 'hours_worked', 'calls_made', 'proposals_sent'],
    metricsGenerator: generateIncomeMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'Outreach getting 15% reply rate',
        consequence: 'Need to refine messaging or targeting',
        daysAgo: 22,
      },
      {
        action: 'revision',
        feedback: 'Switched to value-first approach',
        consequence: 'Reply rate jumped to 28%',
        daysAgo: 16,
      },
      {
        action: 'resistance',
        feedback: 'Fear of rejection slowing outreach volume',
        consequence: 'Identified frame collapse. Applied neutral execution.',
        daysAgo: 12,
      },
      {
        action: 'milestone',
        feedback: 'First 5k retainer closed',
        consequence: 'Proof of concept validated',
        daysAgo: 7,
      },
      {
        action: 'feedback',
        feedback: 'Pipeline now has 3 qualified prospects',
        consequence: 'On track for 15k by end of month',
        daysAgo: 3,
      },
    ],
    doctrineNotes: [
      'Income Want is direct and sovereign. User drives the outcome.',
      'Fear of rejection = slave frame leak. User must maintain neutral machine mode in outreach.',
    ],
    dossier: {
      summary: 'Build a sustainable consulting pipeline generating $25k/month in recurring revenue through systematic outreach, value-first positioning, and referral systems.',
      why_it_matters: 'Financial independence enables time sovereignty. $25k/month provides runway to say no to misaligned opportunities and yes to meaningful work. This is about leverage, not just money.',
      intended_timeline: '3 months to reach $25k MRR. Milestone 1: First $5k retainer (Month 1). Milestone 2: $15k MRR with 3 clients (Month 2). Milestone 3: $25k MRR with 5 clients (Month 3).',
      win_win_frame: 'Clients get transformational results and ROI. User gains financial security and proof of market value. Family benefits from reduced financial stress and increased flexibility.',
      risks_or_costs: 'Time investment in outreach may impact other priorities. Rejection frequency can trigger frame collapse if not managed. Risk of underpricing to close deals faster.',
      covert_contract_flags: [
        'Watch for: "If I just work harder, success will come" — effort does not guarantee results',
        'Watch for: "Once I hit $25k, I\'ll feel secure" — security is internal, not external',
      ],
      congruence_notes: 'Strong congruence with clear execution. User has overcome initial resistance to rejection and is now operating in neutral machine mode. Pipeline building is on track.',
    },
  },
  {
    title: 'Average 7.5 hours sleep',
    coverImageUrl: DEMO_COVER_SLEEP,
    reason: 'I want to feel sharp and recovered every day. This is for me.',
    deadline: null,
    steps: [
      { title: 'Morning light exposure within 30min of waking', description: 'Get outside or use light therapy lamp', status: 'done' },
      { title: 'Set wind-down alarm at 9:30pm', description: 'Phone reminder to start bedtime routine', status: 'done' },
      { title: 'Create bedtime routine checklist', description: 'Teeth, face wash, reading, lights out', status: 'done' },
      { title: 'Block blue light after sunset', description: 'Use f.lux/Night Shift on all devices', status: 'done' },
      { title: 'Cut caffeine after 2pm', description: 'No coffee, tea, or energy drinks after cutoff', status: 'in_progress' },
      { title: 'Set consistent 10pm bedtime', description: 'Lights out at same time every night including weekends', status: 'in_progress' },
      { title: 'Temperature optimization', description: 'Set bedroom to 65-68°F for optimal sleep', status: 'in_progress' },
      { title: 'No screens after 9pm', description: 'Replace scrolling with reading physical book', status: 'in_progress' },
      { title: 'Track sleep with Oura Ring', description: 'Data-driven feedback on sleep quality', status: 'not_started' },
      { title: 'Blackout curtains installed', description: 'Eliminate all light sources in bedroom', status: 'not_started' },
      { title: 'Establish pre-sleep reading habit', description: '20 minutes of fiction before lights out', status: 'not_started' },
      { title: 'Eliminate late-night eating', description: 'No food within 3 hours of bedtime', status: 'not_started' },
    ],
    metricTypes: ['sleep', 'sleep_quality', 'caffeine_cutoff'],
    metricsGenerator: generateSleepMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'Averaging 6.8 hours, need more',
        consequence: 'Adjusting bedtime earlier',
        daysAgo: 18,
      },
      {
        action: 'resistance',
        feedback: 'Late night work sessions breaking routine',
        consequence: 'Must enforce hard stop regardless of project state',
        daysAgo: 10,
      },
      {
        action: 'revision',
        feedback: 'Added wind-down alarm at 9:30pm',
        consequence: 'Bedtime compliance improved to 5/7 nights',
        daysAgo: 5,
      },
    ],
    doctrineNotes: [
      'Sleep is foundational. User recognizes this as a genuine want, not obligation.',
    ],
    dossier: {
      summary: 'Achieve consistent 7.5 hours of quality sleep through environment optimization, routine enforcement, and habit stacking. This is a foundational Want that amplifies all other Wants.',
      why_it_matters: 'Sleep is the force multiplier. Cognitive clarity, emotional regulation, and physical recovery all depend on quality rest. This is not about "being healthier" — it is about operating at full capacity.',
      intended_timeline: 'Ongoing habit. Target: 7.5 hours average within 30 days. Current baseline: 6.8 hours. Incremental improvement of 15-20 minutes per week.',
      win_win_frame: 'Better sleep means better presence with family, sharper decision-making at work, and more patience in relationships. Everyone benefits when you are well-rested.',
      risks_or_costs: 'May require saying no to late-night social activities or work sessions. Short-term FOMO for long-term gains.',
      covert_contract_flags: [],
      congruence_notes: 'Good congruence but moderate consistency. User understands the importance but still battles late-night work patterns. Needs stronger boundary enforcement.',
    },
  },
  {
    title: 'Bench press 225 lbs',
    coverImageUrl: DEMO_COVER_STRENGTH,
    reason: 'I want to feel physically powerful and hit a milestone that proves my dedication.',
    deadline: '2025-05-01',
    steps: [
      { title: 'Test current 1RM', description: 'Establish baseline max bench press', status: 'done' },
      { title: 'Start 5x5 strength program', description: 'StrongLifts or similar progressive overload', status: 'done' },
      { title: 'Add bench-specific accessories', description: 'Close-grip bench, dips, tricep work', status: 'done' },
      { title: 'Track every session in log', description: 'Weight, reps, RPE for each set', status: 'done' },
      { title: 'Increase protein to 1g/lb', description: 'Fuel muscle recovery and growth', status: 'in_progress' },
      { title: 'Add paused reps for power', description: '2-second pause at chest', status: 'in_progress' },
      { title: 'Hit 195 lb checkpoint', description: 'First major milestone', status: 'in_progress', deadline: '2025-02-15' },
      { title: 'Prioritize recovery days', description: 'At least 48 hours between bench sessions', status: 'not_started' },
      { title: 'Add speed work', description: 'Explosive reps at 60% for power development', status: 'not_started' },
      { title: 'Hit 205 lb checkpoint', description: 'Second major milestone', status: 'not_started', deadline: '2025-03-15' },
      { title: 'Deload week before max attempt', description: 'Reduce volume to peak for PR', status: 'not_started' },
      { title: 'Hit 225 lb max', description: 'Final milestone - two plates each side', status: 'not_started', deadline: '2025-05-01' },
    ],
    metricTypes: ['bench_max', 'sets_completed', 'gym_session', 'bodyweight'],
    metricsGenerator: generateStrengthMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'Starting 1RM was 185 lbs',
        consequence: 'Need 40 lb increase over 4 months - achievable with consistency',
        daysAgo: 28,
      },
      {
        action: 'milestone',
        feedback: 'Hit 190 lbs on bench',
        consequence: 'First 5 lb PR - program is working',
        daysAgo: 18,
      },
      {
        action: 'resistance',
        feedback: 'Shoulder felt tweaky after heavy set',
        consequence: 'Added extra warmup sets and shoulder prehab',
        daysAgo: 12,
      },
      {
        action: 'revision',
        feedback: 'Switching to 4-day upper/lower split',
        consequence: 'More frequency, better recovery',
        daysAgo: 7,
      },
      {
        action: 'feedback',
        feedback: 'Bench feeling stronger, hit 195 for a clean double',
        consequence: 'On track for 225 by deadline',
        daysAgo: 3,
      },
    ],
    doctrineNotes: [
      'Strength goal is sovereign - user genuinely wants this for himself, not for external validation.',
      'Recovery is part of the work. Ego-driven overtraining is the enemy.',
    ],
    dossier: {
      summary: 'Progressive strength training to achieve a 225 lb bench press through consistent programming, proper recovery, and strategic periodization.',
      why_it_matters: 'Physical strength is a tangible measure of discipline and commitment. 225 lbs (two plates) is a widely recognized milestone that represents dedication over months of consistent effort.',
      intended_timeline: '4 months from 185 lb baseline to 225 lb goal. Checkpoints: 195 lbs (Month 2), 205 lbs (Month 3), 225 lbs (Month 4).',
      win_win_frame: 'Increased strength improves overall health, energy, and confidence. Physical capability translates to mental resilience.',
      risks_or_costs: 'Injury risk if ego overrides smart programming. Time commitment of 4x/week training. May need to prioritize gym over other activities.',
      covert_contract_flags: [],
      congruence_notes: 'High congruence. User tracks sessions diligently and has shown willingness to adjust programming when needed. Not chasing numbers blindly.',
    },
  },
  {
    title: 'Quality time with kids - 1 hour daily',
    coverImageUrl: DEMO_COVER_FAMILY,
    reason: 'I want to be present for my children and build memories that matter.',
    deadline: null,
    steps: [
      { title: 'Block 6-7pm as sacred family time', description: 'No work, no phone during this hour', status: 'done' },
      { title: 'Create activity idea list', description: 'Games, crafts, outdoor activities to choose from', status: 'done' },
      { title: 'Establish phone-free zones', description: 'Phone stays in another room during family time', status: 'done' },
      { title: 'Weekly one-on-one time with each kid', description: 'Individual attention for each child', status: 'in_progress' },
      { title: 'Bedtime story routine nightly', description: '15 minutes of reading before bed', status: 'in_progress' },
      { title: 'Weekend adventure planning', description: 'One special activity each weekend', status: 'in_progress', deadline: '2025-01-20' },
      { title: 'Teach a new skill monthly', description: 'Cooking, building, sports - something they can learn', status: 'not_started' },
      { title: 'Document moments in family journal', description: 'Quick notes on special memories', status: 'not_started' },
      { title: 'Plan quarterly family trip', description: 'Bigger adventures every 3 months', status: 'not_started' },
    ],
    metricTypes: ['quality_time_minutes', 'activities_done', 'phone_free', 'bedtime_routine'],
    metricsGenerator: generateFamilyMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'First week of blocked time went well',
        consequence: 'Kids noticed and started asking "is it family time yet?"',
        daysAgo: 20,
      },
      {
        action: 'resistance',
        feedback: 'Work deadline pulled me away two evenings',
        consequence: 'Guilt hit hard. Must protect this boundary.',
        daysAgo: 14,
      },
      {
        action: 'revision',
        feedback: 'Set hard stop on work at 5:45pm',
        consequence: 'Buffer time allows mental transition before family time',
        daysAgo: 10,
      },
      {
        action: 'milestone',
        feedback: 'Daughter said "you\'re the best dad" during game night',
        consequence: 'This is why I do this. Irreplaceable.',
        daysAgo: 5,
      },
    ],
    doctrineNotes: [
      'This is a sovereign Want rooted in values, not guilt. User genuinely desires presence.',
      'Work boundaries are the friction point. Must be defended aggressively.',
      'Quality over quantity - but quantity enables quality.',
    ],
    dossier: {
      summary: 'Establish consistent daily quality time with children through protected time blocks, phone-free presence, and intentional activities.',
      why_it_matters: 'Children grow fast. These years are irreplaceable. Being present now builds the relationship foundation for decades to come. This is not about being a "good parent" - it is about not having regrets.',
      intended_timeline: 'Ongoing habit. Daily 1-hour minimum. Weekly one-on-one sessions. Quarterly family adventures.',
      win_win_frame: 'Kids get present, engaged father. User gets fulfillment and connection. Spouse gets partner who prioritizes family. Everyone wins.',
      risks_or_costs: 'May need to say no to work opportunities or social events. Career advancement may slow if boundaries are firm. Short-term sacrifice for long-term relationship.',
      covert_contract_flags: [
        'Watch for: "If I spend enough time, they\'ll always love me" - love is not transactional',
      ],
      congruence_notes: 'Strong congruence with clear values alignment. User has shown ability to defend boundaries when tested. This is a real Want.',
    },
  },
  {
    title: 'Weekly date night with wife',
    coverImageUrl: DEMO_COVER_RELATIONSHIP,
    reason: 'I want to keep our connection strong and prioritize our relationship.',
    deadline: null,
    steps: [
      { title: 'Block Saturday night as date night', description: 'Non-negotiable calendar hold', status: 'done' },
      { title: 'Arrange recurring babysitter', description: 'Same sitter every Saturday for consistency', status: 'done' },
      { title: 'Create date idea list together', description: 'Both partners contribute ideas', status: 'done' },
      { title: 'Alternate who plans each week', description: 'Shared responsibility for creativity', status: 'in_progress' },
      { title: 'No phone rule during dates', description: 'Devices stay in car or at home', status: 'in_progress' },
      { title: 'Weekly appreciation ritual', description: 'Share 3 things you appreciate about each other', status: 'in_progress' },
      { title: 'Try one new restaurant monthly', description: 'Novelty keeps things fresh', status: 'not_started' },
      { title: 'Plan quarterly overnight getaway', description: 'Extended time together without kids', status: 'not_started' },
      { title: 'Establish daily connection ritual', description: '10 minutes of undistracted conversation', status: 'not_started' },
    ],
    metricTypes: ['date_night', 'connection_minutes', 'appreciation_shared', 'conflict_resolved'],
    metricsGenerator: generateRelationshipMetrics,
    iterations: [
      {
        action: 'feedback',
        feedback: 'First month of consistent date nights complete',
        consequence: 'Both feeling more connected. Worth the effort.',
        daysAgo: 22,
      },
      {
        action: 'resistance',
        feedback: 'Skipped one week due to work travel',
        consequence: 'Felt the disconnect. Must protect this time.',
        daysAgo: 15,
      },
      {
        action: 'external_feedback',
        feedback: 'Wife said she feels prioritized again',
        consequence: 'Relationship health improving measurably',
        daysAgo: 8,
      },
      {
        action: 'revision',
        feedback: 'Added 10-min daily check-in',
        consequence: 'Date night is anchor, daily connection is maintenance',
        daysAgo: 4,
      },
    ],
    doctrineNotes: [
      'Relationship maintenance is sovereign work. User chooses to invest here.',
      'Consistency matters more than grand gestures. Show up weekly.',
    ],
    dossier: {
      summary: 'Maintain and strengthen marital connection through consistent weekly date nights, daily rituals, and intentional appreciation practices.',
      why_it_matters: 'The marriage is the foundation of the family. When the relationship is strong, everything else flows better. This is investment in the most important partnership of your life.',
      intended_timeline: 'Ongoing habit. Weekly date nights. Daily 10-minute check-ins. Quarterly overnight getaways.',
      win_win_frame: 'Both partners feel valued and prioritized. Children benefit from parents with strong relationship. Household operates from abundance not scarcity.',
      risks_or_costs: 'Requires consistent babysitter budget. May need to decline other Saturday commitments. Time investment is real.',
      covert_contract_flags: [
        'Watch for: "If I do date nights, she should..." - this is not a transaction',
      ],
      congruence_notes: 'Good congruence. User has shown commitment to consistency even when inconvenient. Relationship is genuine priority.',
    },
  },
];

// =============================================================================
// MAIN SEEDING FUNCTION
// =============================================================================

/**
 * Seed demo Wants, Scopes, metrics, and iterations.
 * Idempotent: only runs once per browser session.
 *
 * @returns true if seeding occurred, false if skipped
 */
export function seedDemoWantsAndScopes(): boolean {
  // Check if already seeded this session
  if (localStorage.getItem(DEMO_SEEDED_KEY)) {
    console.log('[Demo] Already seeded this session, skipping');
    return false;
  }

  // Check if any wants already exist
  const existingWants = getAllWants();
  if (existingWants.length > 0) {
    console.log('[Demo] Wants already exist, skipping seed');
    return false;
  }

  console.log('[Demo] Seeding demo Wants and Scopes...');
  console.log(`[Demo] Will create ${DEMO_WANTS.length} Wants`);

  let totalMetrics = 0;
  let totalIterations = 0;
  let totalSteps = 0;
  let totalDoctrineNotes = 0;

  for (const config of DEMO_WANTS) {
    // Create Want
    const want = createWant({
      title: config.title,
      reason: config.reason,
      deadline: config.deadline,
      metricTypes: config.metricTypes,
      coverImageUrl: config.coverImageUrl || null, // TEMP_DEV: Data URL placeholder
    });

    console.log(`[Demo] Created Want: "${config.title}" (id: ${want.id})`);

    // Create Scope for the Want
    createScopeForWant(want.id);
    console.log(`[Demo] Created Scope for Want: ${want.id}`);

    // Add Steps with their statuses
    for (const stepConfig of config.steps) {
      const newStep = addStep(want.id, {
        title: stepConfig.title,
        description: stepConfig.description,
        deadline: stepConfig.deadline,
      });
      // Update status if not the default 'not_started'
      if (newStep && stepConfig.status !== 'not_started') {
        updateStep(want.id, newStep.id, { status: stepConfig.status });
      }
      totalSteps++;
    }
    console.log(`[Demo] Added ${config.steps.length} steps to "${config.title}"`);

    // Add Metrics Data (30+ days)
    const metricsData = config.metricsGenerator(30);
    let metricCount = 0;
    for (const entry of metricsData) {
      const date = new Date();
      date.setDate(date.getDate() - entry.daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      for (const [metricName, value] of Object.entries(entry.values)) {
        if (value !== null) {
          logMetricValue(want.id, dateStr, metricName, value);
          metricCount++;
        }
      }
    }
    totalMetrics += metricCount;
    console.log(`[Demo] Logged ${metricCount} metric values across ${metricsData.length} days for "${config.title}"`);

    // Add Iterations
    for (const iter of config.iterations) {
      const date = new Date();
      date.setDate(date.getDate() - iter.daysAgo);

      logIterationEntry(want.id, {
        action: iter.action,
        feedback: iter.feedback,
        consequence: iter.consequence,
        source: 'user',
        date: date.toISOString(),
      });
    }
    totalIterations += config.iterations.length;
    console.log(`[Demo] Added ${config.iterations.length} iterations for "${config.title}"`);

    // Add Doctrine Notes
    for (const note of config.doctrineNotes) {
      addDoctrineNote(want.id, note);
    }
    totalDoctrineNotes += config.doctrineNotes.length;
    console.log(`[Demo] Added ${config.doctrineNotes.length} doctrine notes for "${config.title}"`);

    // Create Dossier
    createDossierForWant(want.id, {
      ...config.dossier,
      source: 'little_lord',
    });
    console.log(`[Demo] Created dossier for "${config.title}"`);
  }

  // Mark as seeded for this session
  localStorage.setItem(DEMO_SEEDED_KEY, 'true');

  console.log('[Demo] ========== SEEDING COMPLETE ==========');
  console.log(`[Demo] Created ${DEMO_WANTS.length} Wants`);
  console.log(`[Demo] Created ${totalSteps} steps`);
  console.log(`[Demo] Logged ${totalMetrics} metric values`);
  console.log(`[Demo] Added ${totalIterations} iterations`);
  console.log(`[Demo] Added ${totalDoctrineNotes} doctrine notes`);
  console.log(`[Demo] Created ${DEMO_WANTS.length} dossiers`);
  console.log('[Demo] =====================================');

  return true;
}

/**
 * Clear demo seed flag (for testing / re-seeding).
 */
export function clearDemoSeedFlag(): void {
  localStorage.removeItem(DEMO_SEEDED_KEY);
  console.log('[Demo] Seed flag cleared');
}

// =============================================================================
// VERIFICATION CHECKLIST
// =============================================================================
// To see the demo data in action:
//
// 1. Run: npm run dev
// 2. Navigate to WANTS view (Dashboard -> Wants tab)
// 3. Click the "🧪 Load Demo" button (visible in DEV mode only)
// 4. Check the browser console for seeding logs
//
// Expected results:
// - Board tab: 3 Wants ("Cut to 10% bodyfat", "Build 25k/month...", "Average 7.5 hours sleep")
// - Progress tab: Same 3 Wants with completion progress
// - Scope tab: Click any Want to see the Scope table with 30+ days of metrics
//
// If wants don't appear:
// - Check console for "[Demo]" logs
// - If "Wants already exist", refresh the page first to clear in-memory state
// - Verify no errors in console during seeding
// =============================================================================
