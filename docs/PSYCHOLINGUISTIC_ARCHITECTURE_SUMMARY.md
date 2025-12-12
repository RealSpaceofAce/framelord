# Psycholinguistic Architecture Summary

## Overview

The Psycholinguistic Architecture transforms FrameLord from a passive CRM into an active psychometric interrogator. Unlike traditional CRMs that record transactional history, this system performs a forensic audit of the user's cognitive architecture through language analysis.

**Core Premise**: Language is a direct correlate of cognitive structure and behavioral outcome. When users articulate their strategy, fears, or market positioning, they encode markers of agency, locus of control, and status perception into their syntax and lexicon.

**Purpose**: Detect frame congruency, identify business contradictions, and map invisible power dynamics that govern executive decision-making.

## Entities and Data Model

### IntakeSession
- One per contact (including Contact Zero)
- Contains responses to Tier 1 and Tier 2 questions
- Stores computed axes scores and triggered flags
- Links to Contact via `contactId`

### Answer
- Individual response to a specific intake question
- Contains raw text input from user
- Links to `IntakeSession` and `Question`
- Analyzed to produce `AnswerAnalysis`

### IntakeMetrics
- Computed scores for all axes (0-100 scales)
- Derived from linguistic analysis of answers
- Stored per IntakeSession
- Updated as new answers are added

### AnswerAnalysis
- NLP output for each Answer
- Contains detected patterns (passive voice, hedges, pronouns, etc.)
- Links linguistic markers to axis impacts
- Triggers FrameFlags based on pattern thresholds

### FrameFlag
- System alerts triggered by linguistic patterns
- Examples: PRICING_SHAME, IMPOSTER_SYNDROME, CALL_RELUCTANCE
- Severity levels: info | warn | critical
- Attached to IntakeSession for coaching interventions

### Attachment to Contact Spine

All intake data attaches to the Contact spine:
- Contact Zero (the user) has their own IntakeSession
- Other contacts can have IntakeSessions (for prospect evaluation)
- Notes can reference IntakeMetrics for coaching context
- Little Lord AI consumes IntakeMetrics to personalize coaching

No orphan data. Every IntakeSession belongs to a Contact.

## Axes and Scores

All axes use 0-100 scale unless otherwise specified.

| Axis | Low (0-33) | Mid (34-66) | High (67-100) |
|------|-----------|-------------|---------------|
| **Locus of Control** | External attribution, blame shifting, victimhood | Mixed attribution | Internal attribution, ownership, agency |
| **Motivation Direction** | Away-from (problem focus, avoidance) | Mixed | Towards (goal focus, accumulation) |
| **Process Clarity** | Chaotic, no structure, improvisation | Basic process | Clear, sequential, structured |
| **Linguistic Authority** | Hedges, minimizers, tag questions | Neutral | Direct, commanding, certain |
| **Pricing Confidence** | Shame, avoidance, minimizing language | Neutral | Confident, value-anchored |
| **Status Frame** | Supplicant (seeking permission) | Analyst (data-driven) | Power (prize frame) |
| **Boundary Control** | Conflict avoidance, passive aggression | Selective boundaries | Direct, firm boundaries |
| **Operational Congruence** | Say-do gap, temporal gaps, avoidance | Partial alignment | High alignment, accountability |
| **Frame Strength** | Supplicant/Analyst dominance | Mixed frames | Power frame dominance |

## Question Bank

### Tier 1: First-Access Gate (Rapid Diagnostics)

**Purpose**: Establish baseline for Locus of Control, Motivation Direction, and Operational Readiness using "thin slicing" methodology.

**Q1: Locus of Control & Agency Detection**
- **Prompt**: "Describe the last significant deal or project that didn't go your way. What was the primary factor that caused the outcome?"
- **Target Axes**: Locus of Control, Linguistic Authority
- **Target Flags**: AGENCY_WARNING, LOCUS_EXTERNAL
- **Detection Logic**:
  - High Agency: "I failed to...", "I didn't...", "I missed..." (I + action verb)
  - Low Agency: "The client was...", "The market shifted...", "They ghosted..." (external noun + verb)
  - Red Flag: Passive voice ("The deal was lost")

**Q2: Motivation Direction (Towards vs. Away)**
- **Prompt**: "What is the single most important change you want to see in your business over the next 90 days?"
- **Target Axes**: Motivation Direction
- **Target Flags**: None (informational baseline)
- **Detection Logic**:
  - Towards: "Hit $1M ARR", "Launch new vertical", "Acquire 10 clients" (accumulation, achievement)
  - Away: "Stop working weekends", "Get out of cash crunch", "Avoid losing clients" (cessation, relief)

**Q3: Operational Frame Consistency**
- **Prompt**: "Walk me through your sales process from 'Hello' to 'Signed Contract' in exactly three sentences."
- **Target Axes**: Process Clarity, Operational Congruence
- **Target Flags**: GAP_DETECTED, COMMITMENT_SOFT
- **Detection Logic**:
  - High Structure: Sequential markers (First, Then, Finally), specific verbs, logical flow
  - Chaotic: "It depends", "I usually just try", "Sometimes..." (conditionals, vagueness)
  - Blind Spot: Omission of "Closing" or "Asking for sale" indicates Closing Fear

### Tier 2: Apex Business Frame Blueprint (Deep Elicitation)

**Module 1: Money / Pricing**

**Q1: Hypothetical Price Doubling**
- **Prompt**: "Imagine you must double your price tomorrow. Write the email you would send to your best client explaining this change."
- **Target Axes**: Pricing Confidence, Linguistic Authority
- **Target Flags**: PRICING_SHAME, JUSTIFICATION_LOOP
- **Detection**: Apologetic language ("I hope you understand", "I'm sorry but"), euphemisms, avoidance of stating the number

**Q2: Money Origin Story**
- **Prompt**: "What is your earliest memory of your family discussing money? How does that memory surface physically when you send an invoice today?"
- **Target Axes**: Pricing Confidence
- **Target Flags**: PRICING_SHAME, WEALTH_RESENTMENT
- **Detection**: Negative emotional valence (stressful, scarce, evil, loud)

**Q3: Price Objection Response**
- **Prompt**: "If a client says 'That's too expensive,' what is the literal first thought that flashes in your mind?"
- **Target Axes**: Pricing Confidence, Status Frame
- **Target Flags**: SUPPLICANT_FRAME
- **Detection**:
  - Supplicant: "I need to lower the price", "I priced it too high"
  - Power: "They don't understand the value yet", "They might not be the right fit"

**Q4: Pricing Adjective Test**
- **Prompt**: "Complete this sentence: 'People who charge high prices are _______.'"
- **Target Axes**: Pricing Confidence
- **Target Flags**: WEALTH_RESENTMENT
- **Detection**:
  - Negative: Greedy, Lucky, Arrogant, Crooks = Wealth Resentment Block
  - Positive: Smart, Valued, Experts, Leaders = Wealth Alignment

**Q5: Price Delivery Method**
- **Prompt**: "When you state your price, do you pause and wait, or do you immediately explain the features?"
- **Target Axes**: Pricing Confidence, Status Frame
- **Target Flags**: JUSTIFICATION_LOOP
- **Detection**:
  - Explain/Justify = Insecurity, powerless language
  - Pause = Comfort with tension (Power Frame)

**Module 2: Authority / Status / Imposter**

**Q1: Success Attribution**
- **Prompt**: "Describe a recent success you achieved. How much of that result was due to your specific skill, and how much was due to luck or timing?"
- **Target Axes**: Locus of Control, Status Frame
- **Target Flags**: IMPOSTER_SYNDROME, LOCUS_EXTERNAL
- **Detection**: Heavy weighting on luck/timing, minimizing own role ("I just helped", "It was mostly the team")

**Q2: Prize Frame Test**
- **Prompt**: "When you enter a meeting with a high-net-worth prospect, who is the 'Prize' in the room? Why?"
- **Target Axes**: Status Frame
- **Target Flags**: SUPPLICANT_FRAME, FRAME_STATUS_BETA
- **Detection**:
  - Beta/Supplicant: "They are, because they have the money/authority"
  - Alpha/Power: "I am, because I have the solution they desperately need"

**Q3: Boundary Enforcement**
- **Prompt**: "A client demands you jump on a call immediately, disrupting your schedule. You have no urgent meetings, but you intended to do deep work. What do you say?"
- **Target Axes**: Boundary Control, Status Frame
- **Target Flags**: BOUNDARY_LEAK, CONFLICT_AVOIDANCE
- **Detection**:
  - Low Status: "I'll make time", "Sure, no problem"
  - High Status: "I am booked until 3 PM, but I can speak then"

**Q4: Biggest Deal Win**
- **Prompt**: "Why did you win your biggest deal?"
- **Target Axes**: Locus of Control
- **Target Flags**: LOCUS_EXTERNAL
- **Detection**:
  - Internal: "I navigated stakeholders, built custom ROI case, closed the champion"
  - External: "They really needed a solution fast and we happened to be there"

**Module 3: Operations / Say-Do Gap / Conflict**

**Q1: Day Reconstruction**
- **Prompt**: "Walk me through yesterday, step-by-step, from the moment you started work to the moment you finished. Be specific."
- **Target Axes**: Operational Congruence
- **Target Flags**: GAP_DETECTED, CALL_RELUCTANCE
- **Detection**: Temporal gaps ("then it was lunch"), text bridges, passive voice ("it was") instead of "I worked on X"

**Q2: Commitment Audit**
- **Prompt**: "You mentioned you want to reach [Goal X]. What is the one thing you know you should be doing to get there, but haven't done in the last week?"
- **Target Axes**: Operational Congruence, Locus of Control
- **Target Flags**: GAP_DETECTED, LOCUS_EXTERNAL
- **Detection**:
  - Rationalization: "I just haven't had time" (External Locus)
  - Admission: "I'm afraid to make the calls" (Internal Locus, actionable)
  - Modal operators: "should", "must", "have to" vs "want to", "choose to"

**Q3: Conflict Response**
- **Prompt**: "A client is late on an invoice. Draft the reminder text."
- **Target Axes**: Boundary Control
- **Target Flags**: CONFLICT_AVOIDANCE, PASSIVE_AGGRESSION
- **Detection**:
  - Passive Aggressive: "Just wondering if you got the invoice..." (indirect, low status)
  - Direct: "Please settle the attached invoice by EOD to avoid service interruption"
  - "Just" filter: Automatic flag for minimizer language

## Detection Logic

### Pronoun Density Analysis
- **Formula**: (Count(I) + Count(Me) + Count(My)) / Total Words
- **Low Density in personal narratives**: Detachment, dissociation, External Locus
- **High Density with negative words**: Neuroticism, self-absorption
- **Goldilocks Zone**: Healthy ownership and agency

### Passive Voice Detector
- **Pattern**: (be verb) + (past participle) without agent
- **Examples**: "Mistakes were made", "The deadline was missed", "The deal was lost"
- **Interpretation**: Cognitive dissonance, evasion of responsibility
- **Triggers**: AGENCY_WARNING flag

### Hedge Density
- **Markers**: just, kind of, sort of, basically, probably, maybe, I think, I hope
- **Interpretation**: Powerlessness, low confidence, fear of rejection
- **Triggers**: FRAME_STATUS_BETA, reduced Linguistic Authority score

### Temporal Gaps / Text Bridges
- **Markers**: then, later, after a while, eventually, next thing I knew
- **Interpretation**: Hiding unproductive time, call reluctance, avoidance
- **Triggers**: GAP_DETECTED flag
- **Example**: "I checked emails, had coffee, and then it was lunch" (bridges 3-4 hours)

### Universal Quantifiers
- **Markers**: always, never, everyone, nobody, all, none
- **Interpretation**: Limiting beliefs, distortion of reality, overgeneralization
- **Triggers**: DISTORTION_ALERT
- **Intervention**: Meta-Model challenge to find counter-example

### Modal Operators
- **Necessity**: have to, must, need to, should
- **Possibility**: can, could, might, may
- **Interpretation**: Necessity = external pressure, lack of choice; Possibility = internal choice
- **Triggers**: LOCUS_EXTERNAL (if necessity dominates)

### Nominalizations
- **Pattern**: Verbs turned into nouns
- **Examples**: "The communication was poor" vs "We communicated poorly"
- **Interpretation**: Stagnation, removing process/action from language
- **Triggers**: STATIC_FRAME

### Tag Questions
- **Pattern**: ...right?, ...doesn't it?, ...don't you think?
- **Interpretation**: Seeking validation, low status, supplicant frame
- **Triggers**: SUPPLICANT_FRAME

### Pronoun Divergence
- **Pattern**: Shift from I to We/They during critical moments
- **Interpretation**: Deception, distancing, lack of conviction
- **Triggers**: INTEGRITY_CHECK
- **Example**: "I set the pricing strategy" → "We had some issues with pricing" (shirking responsibility)

### Towards vs. Away Language
- **Towards**: get, achieve, build, create, launch, acquire, grow
- **Away**: stop, avoid, fix, prevent, reduce, eliminate
- **Interpretation**: Towards = propulsion, growth mindset; Away = safety, fear-driven
- **Affects**: Motivation Direction axis

### Attribution Style
- **Internal (Success)**: I did X, I solved Y, I navigated Z
- **External (Success)**: We got lucky, timing was right, they needed it
- **Internal (Failure)**: I failed to qualify, I missed the signal
- **External (Failure)**: The client was irrational, market shifted
- **Interpretation**: Imposter Syndrome = External for success, Internal for failure
- **Affects**: Locus of Control, Status Frame

## Outputs and Integration

### IntakeMetrics Storage
- Computed after each answer is analyzed
- Stored in `intakeStore` attached to Contact
- Axes updated incrementally as more questions are answered
- Flags added/removed based on cumulative evidence

### Little Lord AI Consumption
- Reads IntakeMetrics from Contact record
- Personalizes coaching interventions based on flags and axis scores
- Uses Meta-Model challenges to break generalizations
- Embeds confidence commands in coaching responses
- Reframes negative patterns (e.g., "bothering" → "notifying")

### FrameScan Integration
- FrameScan text/image analysis can reference IntakeMetrics
- Long-term pattern tracking: Do linguistic patterns in daily logs match intake baseline?
- Cognitive dissonance detection: Stated goals vs. actual language in notes/tasks

### Contact Dossier Display
- IntakeMetrics summary card in Contact view
- Visual axis chart (radar/bar chart)
- Flag badges with severity colors
- Timeline of intake completion

### Coaching Interventions
- Triggered by flags reaching severity thresholds
- Meta-Model questions to challenge distortions
- Embedded commands for confidence installation
- Reframing exercises based on detected patterns
- Productization suggestions for pricing shame

## Key Principles

1. **Language is Behavior**: How a user writes about their business is how they do business
2. **Structure > Semantics**: Syntax (pronouns, verbs, passive voice) reveals more than content
3. **Frames Are Malleable**: Detect weak frames and intervene with linguistic reframing
4. **Bypass Ego Defense**: Questions target limbic system ("Oh, That's Me" moments), not neocortical PR
5. **No Orphan Data**: All intake attaches to Contact spine
6. **Continuous Learning**: IntakeMetrics inform Little Lord AI for personalized, context-aware coaching
