// =============================================================================
// LITTLE LORD SERVICE — Universal invocation point for Little Lord
// =============================================================================
// This is the single entry point for invoking Little Lord from anywhere in
// the FrameLord application. It handles:
// - Loading the doctrinal core
// - Building contextual payloads
// - Calling the AI provider
// - Validating output against the contract
// - Emitting events downstream
// - Recording metrics
// =============================================================================

import { callOpenAIChat, type LlmMessage } from '../../lib/llm/openaiClient';
import { LITTLE_LORD_DOCTRINE } from './doctrine';
import type {
  LittleLordRequest,
  LittleLordResponse,
  LittleLordContext,
  LittleLordMessage,
  LittleLordViewId,
} from './types';
import { getContactById, CONTACT_ZERO } from '../contactStore';
import { getReportsForContact } from '../frameScanReportStore';
import { computeCumulativeFrameProfileForContact } from '../../lib/frameScan/frameProfile';
import { getContactContextSummary } from '../contactContextStore';
import {
  getViewConfig,
  getViewSystemPromptAddition,
  canOfferWritingAssistance,
  shouldSuggestFrameScan,
  getCoachingHints,
} from './viewBehavior';
import {
  createMetricEntry,
  getMetricDefinitionById,
  createMetricDefinition,
  type MetricDomain,
  type MetricType,
} from '../metricsStore';

// Re-export view behavior functions for external use
export {
  canOfferWritingAssistance,
  shouldSuggestFrameScan,
  getCoachingHints,
  getViewConfig,
} from './viewBehavior';

// Re-export user profile functions
export * from './userProfile';

// =============================================================================
// SYSTEM PROMPT GENERATION
// =============================================================================

/**
 * Generate the system prompt for Little Lord based on the doctrine and current view context.
 */
function generateSystemPrompt(viewId?: LittleLordViewId | null): string {
  const doctrine = LITTLE_LORD_DOCTRINE;

  // Get view-specific additions
  const viewPromptAddition = viewId ? getViewSystemPromptAddition(viewId) : undefined;
  const coachingHints = viewId ? getCoachingHints(viewId) : [];
  const writingEnabled = viewId ? canOfferWritingAssistance(viewId) : false;
  const frameScanEnabled = viewId ? shouldSuggestFrameScan(viewId) : false;

  // Build view context section
  let viewContextSection = '';
  if (viewId) {
    const viewConfig = getViewConfig(viewId);
    viewContextSection = `
VIEW CONTEXT:
- Current View: ${viewConfig.displayName}
- Writing Assistant: ${writingEnabled ? 'ENABLED - You may offer to draft/write content' : 'DISABLED - Do not offer to write content'}
- FrameScan Suggestions: ${frameScanEnabled ? 'ENABLED' : 'DISABLED'}
${viewPromptAddition ? `- Special Context: ${viewPromptAddition}` : ''}
${coachingHints.length > 0 ? `- Coaching Focus: ${coachingHints.join(', ')}` : ''}
`;
  }

  return `You are "${doctrine.ai_name}", version ${doctrine.version}.

PURPOSE:
${doctrine.purpose}

CORE IDENTITY:
- Stance: ${doctrine.core_identity.stance}
- Loyalty: ${doctrine.core_identity.loyalty}
- Tone: ${doctrine.core_identity.tone.default}

FORBIDDEN TONES:
${doctrine.core_identity.tone.forbidden.map(t => `- ${t}`).join('\n')}

ANCHORING VALUES:
${doctrine.core_identity.anchoring_values.map(v => `- ${v}`).join('\n')}

YOUR ROLE:
${doctrine.conversation_policies.role_in_session}

PRIORITIES:
${doctrine.conversation_policies.priorities.map(p => `- ${p}`).join('\n')}

OUTPUT FORMAT:
You must respond with a JSON object matching this schema:

{
  "reply": "string - your response to the user",
  "event": {
    "topic": "RELATIONSHIP | LEADERSHIP | BUSINESS | SELF_REGULATION",
    "pattern": "RECURRING_STUCK | FRAME_COLLAPSE | NEEDY_BEHAVIOR | AVOIDANCE",
    "severity": "LOW | MEDIUM | HIGH",
    "summary": "1-3 sentence admin-facing summary"
  } OR null
}

EVENT EMISSION RULES:
${doctrine.event_emission_rules.rules.map(rule =>
  `- ${rule.name}: ${rule.trigger}\n  Action: ${rule.action}`
).join('\n')}

Only emit events when patterns are clearly detected. If no pattern is present, set "event" to null.

CRITICAL:
- Output ONLY valid JSON, no markdown fences, no extra text
- Always provide the "reply" field
- Use the doctrine's language and concepts
- Be concrete, direct, and actionable
- Never coddle or enable Slave Frame thinking
- Route everything through grace, not law
${viewContextSection}`;
}

// =============================================================================
// CONTEXT ENRICHMENT
// =============================================================================

/**
 * Build an enriched payload for the LLM including user context.
 */
function buildContextPayload(request: LittleLordRequest): Record<string, unknown> {
  const { tenantId, userId, userMessage, recentContext } = request;

  const payload: Record<string, unknown> = {
    tenantId,
    userId,
    userMessage,
  };

  // Add recent context if provided
  if (recentContext) {
    payload.recentContext = recentContext;
  }

  // If a contact is selected, add their frame data
  if (recentContext?.selectedContactId) {
    const contactId = recentContext.selectedContactId as string;
    const contact = getContactById(contactId);

    if (contact) {
      const reports = getReportsForContact(contactId);
      const profile = computeCumulativeFrameProfileForContact(contactId, reports);
      const contextSummary = getContactContextSummary(contactId);

      payload.selectedContact = {
        id: contact.id,
        name: contact.fullName,
        role: contact.relationshipRole || null,
        domain: contact.relationshipDomain || null,
        isContactZero: contact.id === CONTACT_ZERO.id,
        frameProfile: {
          currentFrameScore: profile.currentFrameScore,
          scansCount: profile.scansCount,
          lastScanAt: profile.lastScanAt || null,
        },
        contextSummary: contextSummary ? contextSummary.summary : null,
        recentReports: reports.slice(0, 5).map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          frameScore: r.score.frameScore,
          overallFrame: r.score.overallFrame,
          domain: r.domain,
        })),
      };
    }
  }

  return payload;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

/**
 * Parse the LLM response into a LittleLordResponse.
 */
function parseLittleLordResponse(rawText: string): LittleLordResponse {
  // Try direct parse
  try {
    const parsed = JSON.parse(rawText);
    return validateLittleLordResponse(parsed);
  } catch {
    // Try to extract JSON from markdown fences or surrounding text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return validateLittleLordResponse(parsed);
      } catch {
        // Fall through to error response
      }
    }

    // Fallback: treat the whole response as the reply
    return {
      reply: rawText.trim() || "I encountered an issue processing your request. Please try again.",
    };
  }
}

/**
 * Validate the parsed response has required fields.
 */
function validateLittleLordResponse(obj: unknown): LittleLordResponse {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('LittleLordResponse must be an object');
  }

  const response = obj as Record<string, unknown>;

  if (typeof response.reply !== 'string') {
    throw new Error('LittleLordResponse.reply must be a string');
  }

  const result: LittleLordResponse = {
    reply: response.reply,
  };

  // Validate event if present
  if (response.event !== null && response.event !== undefined) {
    const event = response.event as Record<string, unknown>;

    if (
      typeof event.topic === 'string' &&
      typeof event.pattern === 'string' &&
      typeof event.severity === 'string' &&
      typeof event.summary === 'string'
    ) {
      result.event = {
        topic: event.topic as any,
        pattern: event.pattern as any,
        severity: event.severity as any,
        summary: event.summary,
      };
    }
  }

  return result;
}

// =============================================================================
// MAIN INVOCATION FUNCTION
// =============================================================================

/**
 * Invoke Little Lord with a user message and context.
 *
 * This is the universal entry point for all Little Lord interactions.
 *
 * @param request - The complete request including tenant, user, message, and context
 * @returns Response with reply and optional event
 */
export async function invokeLittleLord(
  request: LittleLordRequest
): Promise<LittleLordResponse> {
  const { userMessage, recentContext } = request;

  // Extract viewId from context for view-aware behavior
  const viewId = recentContext?.viewId as LittleLordViewId | undefined;

  // Build system prompt with view context
  const systemPrompt = generateSystemPrompt(viewId);

  // Build context payload
  const contextPayload = buildContextPayload(request);

  // Build LLM messages
  const llmMessages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(contextPayload) },
  ];

  try {
    // Call LLM
    const llmResponse = await callOpenAIChat(llmMessages);
    const rawText = llmResponse.rawText ?? '';

    // Parse and validate response
    const response = parseLittleLordResponse(rawText);

    return response;
  } catch (error: any) {
    console.error('Little Lord invocation error:', error);

    // Return error response
    return {
      reply: "I encountered an error processing your request. Please try again, and if the issue persists, check your API configuration in Settings.",
    };
  }
}

/**
 * Invoke Little Lord with a conversation history.
 *
 * This version maintains multi-turn conversation state.
 *
 * @param request - The base request
 * @param messages - Previous conversation messages
 * @returns Response with reply and optional event
 */
export async function invokeLittleLordWithHistory(
  request: LittleLordRequest,
  messages: LittleLordMessage[]
): Promise<LittleLordResponse> {
  // Extract viewId from context for view-aware behavior
  const viewId = request.recentContext?.viewId as LittleLordViewId | undefined;

  // Build system prompt with view context
  const systemPrompt = generateSystemPrompt(viewId);

  // Build context payload for first user message
  const contextPayload = buildContextPayload(request);

  // Build LLM messages
  const llmMessages: LlmMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  if (messages.length > 0) {
    // First message gets the full context
    llmMessages.push({
      role: 'user',
      content: messages[0].role === 'user'
        ? JSON.stringify({ ...contextPayload, userMessage: messages[0].content })
        : messages[0].content,
    });

    // Rest of the messages are added as-is
    for (let i = 1; i < messages.length; i++) {
      llmMessages.push({
        role: messages[i].role as 'user' | 'assistant',
        content: messages[i].content,
      });
    }
  }

  // Add the current user message
  llmMessages.push({
    role: 'user',
    content: request.userMessage,
  });

  try {
    // Call LLM
    const llmResponse = await callOpenAIChat(llmMessages);
    const rawText = llmResponse.rawText ?? '';

    // Parse and validate response
    const response = parseLittleLordResponse(rawText);

    return response;
  } catch (error: any) {
    console.error('Little Lord invocation error:', error);

    return {
      reply: "I encountered an error processing your request. Please try again.",
    };
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create an initial greeting message from Little Lord.
 */
export function createInitialLittleLordMessage(
  tenantId: string,
  userId: string,
  context?: LittleLordContext
): LittleLordMessage {
  const isContactZero = context?.selectedContactId === CONTACT_ZERO.id || !context?.selectedContactId;

  // DOCTRINE: Special greeting for Want creation flow
  // When wantCreation is true, Little Lord guides the user through Want validation
  if (context?.wantCreation) {
    return {
      role: 'assistant',
      content: `I'm here to help you define a new Want.

A true Want comes from your own desire — not from shame, guilt, or obligation. Let's make sure what you're about to declare is a real Want, not a Should.

Tell me: What do you truly desire? What would make your life more vital if you had it?

I'll help you check if this is a genuine Want by looking for:
• **Win-Win framing** — Does this benefit you AND others?
• **No covert contracts** — Are you expecting something unstated in return?
• **Internal motivation** — Is this YOUR desire, or someone else's expectation?

What's on your mind?`,
      timestamp: new Date().toISOString(),
    };
  }

  if (isContactZero) {
    return {
      role: 'assistant',
      content: `I am DocLord, your Apex Frame writing assistant. I help you write and refine documents, sales copy, and personal messages so they carry Apex Frame, Win-Win positioning, and clean Dominion tone.

What's on your mind?`,
      timestamp: new Date().toISOString(),
    };
  }

  const contact = context?.selectedContactId ? getContactById(context.selectedContactId as string) : null;
  const contactName = contact?.fullName || 'this contact';

  return {
    role: 'assistant',
    content: `I can help you analyze the frame dynamics with ${contactName}. Ask me about patterns, stuck points, or how to move this relationship toward Win-Win and higher vitality for both of you.`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get the display name for Little Lord in UI.
 */
export function getLittleLordDisplayName(): string {
  return LITTLE_LORD_DOCTRINE.ai_name;
}

/**
 * Get Little Lord's version.
 */
export function getLittleLordVersion(): string {
  return LITTLE_LORD_DOCTRINE.version;
}

// =============================================================================
// METRICS METHODS — Little Lord is the sole writer of metrics
// =============================================================================

/**
 * Record a metric value.
 * This is the ONLY way metrics should be written in the system.
 * UI components should NEVER call createMetricEntry directly.
 *
 * @param metricId - The metric definition ID
 * @param value - The metric value
 * @param contactId - Contact ID (defaults to Contact Zero)
 * @param note - Optional note about this metric entry
 * @returns The created metric entry
 */
export function recordMetric(
  metricId: string,
  value: number | string | boolean,
  contactId: string = CONTACT_ZERO.id,
  note?: string
) {
  const definition = getMetricDefinitionById(metricId);

  if (!definition) {
    console.error(`[Little Lord] Attempted to record metric with unknown ID: ${metricId}`);
    throw new Error(`Unknown metric ID: ${metricId}`);
  }

  return createMetricEntry(
    {
      metricId,
      contactId,
      value,
      source: 'little_lord',
      note,
    }
  );
}

/**
 * Define a new metric type.
 * Little Lord can create new metric definitions as needed based on user behavior.
 *
 * @param name - Metric name
 * @param description - Metric description
 * @param domain - Domain category
 * @param type - Data type
 * @param options - Optional configuration
 * @returns The created metric definition
 */
export function defineMetric(
  name: string,
  description: string,
  domain: MetricDomain,
  type: MetricType,
  options?: {
    unit?: string;
    target?: number | string | boolean;
    isHigherBetter?: boolean;
  }
) {
  return createMetricDefinition({
    name,
    description,
    domain,
    type,
    unit: options?.unit,
    target: options?.target,
    isHigherBetter: options?.isHigherBetter,
  });
}

/**
 * Record multiple metrics at once.
 * Useful for batch updates from Little Lord analysis.
 *
 * @param metrics - Array of metric records
 * @param contactId - Contact ID (defaults to Contact Zero)
 * @returns Array of created metric entries
 */
export function recordMetrics(
  metrics: Array<{ metricId: string; value: number | string | boolean; note?: string }>,
  contactId: string = CONTACT_ZERO.id
) {
  return metrics.map(m => recordMetric(m.metricId, m.value, contactId, m.note));
}
