// =============================================================================
// RUN LITTLE LORD — Core model invocation for Little Lord agent
// =============================================================================
// v2.0 - Enhanced with Want validation, directness checks, and Scope integration
// =============================================================================

import { callOpenAIChat, type LlmMessage } from '../llm/openaiClient';
import type { LittleLordContext } from '../../services/littleLord/types';

// =============================================================================
// TYPES
// =============================================================================

export interface LittleLordSpec {
  name: string;
  version: string;
  model: string;
  corpus: { path: string; format: string; delimiter: string; retrieval: { enabled: boolean; mode: string; max_chunks: number } };
  identity: { role: string; tone: string; behavior: string[] };
  doctrine: {
    source: string;
    use: string[];
    no_output: string[];
    doctrinal_rules?: string[];
    guardrails?: Record<string, {
      description: string;
      triggers: string[];
      response: string;
      blocked: boolean;
    }>;
  };
  inputs: unknown;
  outputs: unknown;
  event_protocol: Record<string, { type: string; payload: Record<string, string> }>;
  reasoning_rules: {
    core: string[];
    context_use: string[];
    payload_generation: string[];
    want_validation?: string[];
    directness_validation?: string[];
    guardrail_enforcement?: string[];
  };
  safety: { forbidden: string[]; allowed: string[] };
}

export interface LittleLordRunInput {
  message: string;
  context?: LittleLordContext;
  spec: LittleLordSpec;
  corpus: string;
}

export interface LittleLordEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface WantValidation {
  isValidWant: boolean;
  reason: string;
}

export interface DirectnessCheck {
  isDirect: boolean;
  failingReason?: string;
}

// =============================================================================
// GUARDRAIL TYPES
// =============================================================================

/**
 * Types of guardrail violations Little Lord can detect.
 * - none: No violation
 * - disrespect: Disrespect toward founder, app, or doctrine
 * - gossip_or_slander: Gossip, slander, or toxic speech about contacts
 * - spying: Attempting to use CRM for surveillance or covert ops
 * - domain_violation: Requesting legal, medical, or financial advice
 * - bad_frame: Covert contract, win-lose, or manipulation detected in Want
 */
export type GuardrailKind =
  | 'none'
  | 'disrespect'
  | 'gossip_or_slander'
  | 'spying'
  | 'domain_violation'
  | 'bad_frame';

/**
 * Guardrail violation data returned when a rule is triggered.
 */
export interface GuardrailViolation {
  /** The kind of violation detected */
  kind: GuardrailKind;
  /** Explanation of what was detected */
  message: string;
  /** Whether the request was blocked (true) or warned (false) */
  blocked: boolean;
}

export interface LittleLordRunOutput {
  reply: string;
  event: LittleLordEvent | null;
  validation?: WantValidation | null;
  directnessCheck?: DirectnessCheck | null;
  guardrail?: GuardrailViolation | null;
}

// =============================================================================
// CORPUS RETRIEVAL
// =============================================================================

/**
 * Split corpus into chunks using the delimiter from spec.
 */
function splitCorpusIntoChunks(corpus: string, delimiter: string): string[] {
  return corpus
    .split(delimiter)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 50); // Filter out very short chunks
}

/**
 * Simple keyword-based retrieval of relevant corpus chunks.
 * Scores chunks by keyword overlap with the user message.
 */
function retrieveRelevantChunks(
  message: string,
  chunks: string[],
  maxChunks: number
): string[] {
  // Extract keywords from message (simple tokenization)
  const keywords = message
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);

  // Score each chunk by keyword matches
  const scored = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (lowerChunk.includes(keyword)) {
        score += 1;
      }
    }
    // Boost chunks containing key doctrine terms
    const doctrineTerms = ['apex', 'slave', 'frame', 'dominion', 'win-win', 'power', 'shame', 'boundary', 'want', 'should', 'sovereign', 'direct'];
    for (const term of doctrineTerms) {
      if (lowerChunk.includes(term) && message.toLowerCase().includes(term)) {
        score += 2;
      }
    }
    return { chunk, score };
  });

  // Sort by score and take top chunks
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .filter(s => s.score > 0)
    .map(s => s.chunk);
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build the system prompt using spec.identity and spec.reasoning_rules.
 */
function buildSystemPrompt(spec: LittleLordSpec, corpusChunks: string[]): string {
  const { identity, reasoning_rules, doctrine, safety } = spec;

  // Build corpus context section
  const corpusContext = corpusChunks.length > 0
    ? `\n\nDOCTRINE CONTEXT (use to inform your response):\n${corpusChunks.join('\n\n---\n\n')}`
    : '';

  // Build doctrinal rules if present
  const doctrinalRules = doctrine.doctrinal_rules
    ? `\n\nDOCTRINAL RULES (MUST ENFORCE):\n${doctrine.doctrinal_rules.map(r => `- ${r}`).join('\n')}`
    : '';

  // Build want validation rules if present
  const wantValidationRules = reasoning_rules.want_validation
    ? `\n\nWANT VALIDATION RULES:\n${reasoning_rules.want_validation.map(r => `- ${r}`).join('\n')}`
    : '';

  // Build directness validation rules if present
  const directnessRules = reasoning_rules.directness_validation
    ? `\n\nDIRECTNESS VALIDATION RULES:\n${reasoning_rules.directness_validation.map(r => `- ${r}`).join('\n')}`
    : '';

  // Build guardrail enforcement rules if present
  const guardrailEnforcementRules = reasoning_rules.guardrail_enforcement
    ? `\n\nGUARDRAIL ENFORCEMENT (HIGHEST PRIORITY):\n${reasoning_rules.guardrail_enforcement.map(r => `- ${r}`).join('\n')}`
    : '';

  // Build guardrail definitions if present
  const guardrailDefinitions = doctrine.guardrails
    ? `\n\nGUARDRAIL DEFINITIONS:\n${Object.entries(doctrine.guardrails).map(([kind, def]) =>
        `- ${kind.toUpperCase()}:\n  Description: ${def.description}\n  Triggers: ${def.triggers.join(', ')}\n  Response: "${def.response}"`
      ).join('\n')}`
    : '';

  return `You are ${spec.name} v${spec.version}.

ROLE: ${identity.role}
TONE: ${identity.tone}

BEHAVIOR CONSTRAINTS:
${identity.behavior.map(b => `- ${b}`).join('\n')}

DOCTRINE APPLICATION:
${doctrine.use.map(u => `- ${u}`).join('\n')}

OUTPUT RESTRICTIONS:
${doctrine.no_output.map(n => `- ${n}`).join('\n')}
${doctrinalRules}

REASONING RULES (CORE):
${reasoning_rules.core.map(r => `- ${r}`).join('\n')}
${wantValidationRules}
${directnessRules}
${guardrailEnforcementRules}
${guardrailDefinitions}

CONTEXT USAGE:
${reasoning_rules.context_use.map(r => `- ${r}`).join('\n')}

EVENT GENERATION:
${reasoning_rules.payload_generation.map(r => `- ${r}`).join('\n')}

FORBIDDEN TOPICS:
${safety.forbidden.map(f => `- ${f}`).join('\n')}

ALLOWED SCOPE:
${safety.allowed.map(a => `- ${a}`).join('\n')}
${corpusContext}

OUTPUT FORMAT:
You MUST respond with valid JSON only. No markdown fences, no extra text.

{
  "reply": "your coaching response as a string",
  "event": null OR {
    "type": "<event_type>",
    "payload": { ... }
  },
  "validation": null OR {
    "isValidWant": boolean,
    "reason": "string explaining why valid or invalid"
  },
  "directnessCheck": null OR {
    "isDirect": boolean,
    "failingReason": "string explaining why not direct (if applicable)"
  },
  "guardrail": null OR {
    "kind": "disrespect" | "gossip_or_slander" | "spying" | "domain_violation" | "bad_frame",
    "message": "explanation of what was detected",
    "blocked": true
  }
}

EVENT TYPES:
// Task events
- task.create: { contactId: string, title: string, dueDate?: string }
- task.update: { taskId: string, fields: object }

// Contact events
- contact.note: { contactId: string, note: string }
- interaction.log: { contactId: string, summary: string }

// Want core events
- want.create: { title: string, reason: string, deadline?: string, primaryContactId?: string, metricTypes?: string[] }
- want.update: { wantId: string, title?: string, reason?: string, deadline?: string, status?: string }
- want.addStep: { wantId: string, title: string, deadline?: string }

// Want metric events
- want.addMetricType: { wantId: string, metricName: string }
- want.logMetricValue: { wantId: string, date?: string, metricName: string, value: number | string | boolean }
- want.logMetrics: { wantId: string, hoursWorked?: number, income?: number, sleep?: number, workout?: boolean, carbs?: number, protein?: number, fat?: number, calories?: number, caloriesBurned?: number, deficit?: number, weight?: number }
- want.logIteration: { wantId: string, feedback: string }

// Want contact events
- want.attachContact: { wantId: string, primaryContactId: string }
- want.detachContact: { wantId: string }

// Want validation events (output validation/directnessCheck fields, not event)
- want.validate: Include validation object in response
- want.checkDirectness: Include directnessCheck object in response

// Scope events
- scope.logEntry: { wantId: string, action: "feedback" | "revision" | "resistance" | "external_feedback" | "milestone" | "reflection" | "course_correction", feedback: string }
- scope.addDoctrineNote: { wantId: string, note: string }

WANTS PROTOCOL:
- A Want is a sovereign desire and long-range outcome.
- A Want arises from the user's own will, not external obligation.
- A Should is something the user feels obligated to do but does not actually want.
- NO SHOULDS MAY BECOME WANTS. If a Should is detected, REJECT the Want.
- When the user commits to a Want, do NOT allow hedging or backtracking.
- Help the user clarify their Wants with precision.
- Break Wants into actionable steps.
- Track metrics and iterations toward the Want.
- Wants without iteration logs are FANTASY - flag them.

SHOULD VS WANT DETECTION:
- "I should..." = SHOULD (likely invalid)
- "I need to..." = Could be either - probe further
- "I want to..." = Potential Want - validate intent
- "I have to..." = SHOULD (likely invalid)
- "I ought to..." = SHOULD (likely invalid)
- "I must..." = Could be either - depends on source
- "I desire..." = Potential Want
- "I choose to..." = Potential Want
- External pressure indicators = SHOULD
- Internal drive indicators = Want

When validating:
- If user proposes a Want, ALWAYS set the validation field
- isValidWant: true if genuine Want, false if disguised Should
- reason: explain your judgment

DIRECTNESS VALIDATION:
- When user attaches a Want to a contact, verify DIRECT causal relevance.
- DIRECT means: the contact's action or inaction DIRECTLY affects Want achievement.
- INDIRECT means: inspiration, example, emotional support - NOT direct.
- If indirect, set directnessCheck.isDirect = false and explain why.

DYNAMIC METRICS:
- The user can define arbitrary metrics (e.g., "steps", "jiu_jitsu_rounds", "meditation_minutes").
- When user says "Add a metric for X", emit want.addMetricType with metricName = X.
- When user reports a metric value (e.g., "Calories today were 2400"), emit want.logMetricValue.
- Parse spoken metric names dynamically: "7 rounds of jiu-jitsu" -> metricName="jiu_jitsu_rounds", value=7.
- Default date is today if not specified.

ITERATION TRACKING:
- Log user feedback, revisions, resistance, and external feedback to Scope.
- When user describes struggle, emit scope.logEntry with action="resistance".
- When user revises approach, emit scope.logEntry with action="revision".
- When user receives feedback from others, emit scope.logEntry with action="external_feedback".
- Add doctrine notes when relevant corpus concepts apply.

Only emit an event when the user's message clearly implies an operational action. Default to null.`;
}

/**
 * Build the user message with context.
 */
function buildUserMessage(message: string, context?: LittleLordContext): string {
  const contextStr = context
    ? `\n\nCONTEXT:\n${JSON.stringify(context, null, 2)}`
    : '';

  return `USER MESSAGE: ${message}${contextStr}`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Parse the LLM response into structured output.
 */
function parseResponse(rawText: string): LittleLordRunOutput {
  try {
    // Try direct parse
    const parsed = JSON.parse(rawText);
    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : rawText,
      event: parsed.event && typeof parsed.event === 'object' ? parsed.event : null,
      validation: parsed.validation && typeof parsed.validation === 'object' ? parsed.validation : null,
      directnessCheck: parsed.directnessCheck && typeof parsed.directnessCheck === 'object' ? parsed.directnessCheck : null,
      guardrail: parsed.guardrail && typeof parsed.guardrail === 'object' ? parsed.guardrail : null,
    };
  } catch {
    // Try to extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          reply: typeof parsed.reply === 'string' ? parsed.reply : rawText,
          event: parsed.event && typeof parsed.event === 'object' ? parsed.event : null,
          validation: parsed.validation && typeof parsed.validation === 'object' ? parsed.validation : null,
          directnessCheck: parsed.directnessCheck && typeof parsed.directnessCheck === 'object' ? parsed.directnessCheck : null,
          guardrail: parsed.guardrail && typeof parsed.guardrail === 'object' ? parsed.guardrail : null,
        };
      } catch {
        // Fall through
      }
    }

    // Fallback: treat entire response as reply
    return {
      reply: rawText.trim() || 'I encountered an issue processing your request.',
      event: null,
      validation: null,
      directnessCheck: null,
      guardrail: null,
    };
  }
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run Little Lord with a message and context.
 *
 * @param input - Message, context, spec, and corpus
 * @returns Structured response with reply, event, validation, and directnessCheck
 */
export async function runLittleLord(input: LittleLordRunInput): Promise<LittleLordRunOutput> {
  const { message, context, spec, corpus } = input;

  // Split corpus and retrieve relevant chunks
  const chunks = splitCorpusIntoChunks(corpus, spec.corpus.delimiter);
  const relevantChunks = spec.corpus.retrieval.enabled
    ? retrieveRelevantChunks(message, chunks, spec.corpus.retrieval.max_chunks)
    : [];

  // Build prompts
  const systemPrompt = buildSystemPrompt(spec, relevantChunks);
  const userMessage = buildUserMessage(message, context);

  // Build LLM messages
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    // Call LLM (uses gpt-4o-mini by default in openaiClient)
    const response = await callOpenAIChat(messages);
    return parseResponse(response.rawText);
  } catch (error: unknown) {
    console.error('Little Lord run error:', error);
    return {
      reply: 'I encountered an error processing your request. Please try again.',
      event: null,
      validation: null,
      directnessCheck: null,
      guardrail: null,
    };
  }
}
