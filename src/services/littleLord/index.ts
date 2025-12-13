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
import {
  getActiveMetrics,
  handleLittleLordEvent,
  type WantTrackingEvent,
} from '../wantTrackingStore';
import {
  getAllContacts,
  getContactById as getContactByIdFromStore,
  updateContact,
  findContactByName,
} from '../contactStore';
import { createNote } from '../noteStore';
import type { ContactPsychometricProfile } from '../../types';

// Re-export view behavior functions for external use
export {
  canOfferWritingAssistance,
  shouldSuggestFrameScan,
  getCoachingHints,
  getViewConfig,
} from './viewBehavior';

// Re-export user profile functions
export * from './userProfile';

// Re-export session store functions for conversation persistence
export * from './sessionStore';

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
  } OR null,
  "want_tracking": {
    "date": "YYYY-MM-DD",
    "entries": { "metric_slug": number | boolean, ... }
  } OR null
}

WANT TRACKING:
When user reports what they did (workout, hours worked, income, sleep, etc), log it via want_tracking.
- Use metric slugs from trackingMetrics in context
- Use today's date for "today", yesterday's for "yesterday"
- Boolean metrics: true/false, Numeric metrics: numbers
- Only include metrics user mentioned

CONTACT UPDATES:
When user mentions insights about a contact (their personality, communication style, motivations, behavior patterns, etc), use contact_update to:
1. Create a note about that contact with the insight
2. Update their psychometric profile with relevant data
- Use contact IDs from knownContacts context
- If user mentions a name, try to match it to a known contact
- Capture: communication style, decision style, motivators, values, traits, frame signals (Apex/Slave), relationship dynamics, pressure response, trust markers, negotiation style, goals, pain points

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
 * Get today's date in YYYY-MM-DD format.
 */
function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Build an enriched payload for the LLM including user context.
 */
function buildContextPayload(request: LittleLordRequest): Record<string, unknown> {
  const { tenantId, userId, userMessage, recentContext } = request;

  const payload: Record<string, unknown> = {
    tenantId,
    userId,
    userMessage,
    todayDate: getTodayDate(),
  };

  // Add recent context if provided
  if (recentContext) {
    payload.recentContext = recentContext;
  }

  // Add Want Tracking metrics context for Contact Zero
  const activeMetrics = getActiveMetrics();
  if (activeMetrics.length > 0) {
    payload.trackingMetrics = activeMetrics.map(m => ({
      slug: m.slug,
      name: m.name,
      type: m.type,
      unit: m.unit || null,
      goalType: m.goalType,
      goalValue: m.goalValue,
    }));
  }

  // Add known contacts for matching user mentions
  const allContacts = getAllContacts();
  if (allContacts.length > 0) {
    payload.knownContacts = allContacts
      .filter(c => c.id !== CONTACT_ZERO.id) // Exclude Contact Zero
      .slice(0, 50) // Limit to prevent context overflow
      .map(c => ({
        id: c.id,
        name: c.fullName,
        role: c.relationshipRole || null,
        domain: c.relationshipDomain || null,
        company: c.company || null,
      }));
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

  // Validate want_tracking if present
  if (response.want_tracking !== null && response.want_tracking !== undefined) {
    const tracking = response.want_tracking as Record<string, unknown>;

    if (
      typeof tracking.date === 'string' &&
      typeof tracking.entries === 'object' &&
      tracking.entries !== null
    ) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(tracking.date)) {
        // Validate entries - each value must be number or boolean
        const entries = tracking.entries as Record<string, unknown>;
        const validatedEntries: Record<string, number | boolean> = {};
        let hasValidEntries = false;

        for (const [key, value] of Object.entries(entries)) {
          if (typeof value === 'number' || typeof value === 'boolean') {
            validatedEntries[key] = value;
            hasValidEntries = true;
          }
        }

        if (hasValidEntries) {
          result.want_tracking = {
            date: tracking.date,
            entries: validatedEntries,
          };
        }
      }
    }
  }

  // Validate contact_update if present
  if (response.contact_update !== null && response.contact_update !== undefined) {
    const contactUpdate = response.contact_update as Record<string, unknown>;

    if (typeof contactUpdate.contactId === 'string') {
      const validatedUpdate: LittleLordResponse['contact_update'] = {
        contactId: contactUpdate.contactId,
      };

      // Validate note if present
      if (contactUpdate.note && typeof contactUpdate.note === 'object') {
        const note = contactUpdate.note as Record<string, unknown>;
        if (typeof note.content === 'string') {
          validatedUpdate.note = {
            content: note.content,
            title: typeof note.title === 'string' ? note.title : undefined,
          };
        }
      }

      // Validate psychometric if present
      if (contactUpdate.psychometric && typeof contactUpdate.psychometric === 'object') {
        const psych = contactUpdate.psychometric as Record<string, unknown>;
        const validatedPsych: LittleLordResponse['contact_update']['psychometric'] = {};
        let hasPsychData = false;

        // String fields
        for (const field of ['communicationStyle', 'decisionMakingStyle', 'relationshipDynamics', 'pressureResponse', 'negotiationStyle'] as const) {
          if (typeof psych[field] === 'string') {
            (validatedPsych as any)[field] = psych[field];
            hasPsychData = true;
          }
        }

        // Array fields
        for (const field of ['motivators', 'values', 'traits', 'goals', 'painPoints'] as const) {
          if (Array.isArray(psych[field])) {
            (validatedPsych as any)[field] = (psych[field] as unknown[]).filter(v => typeof v === 'string');
            hasPsychData = true;
          }
        }

        // Nested object: frameTendencies
        if (psych.frameTendencies && typeof psych.frameTendencies === 'object') {
          const ft = psych.frameTendencies as Record<string, unknown>;
          validatedPsych.frameTendencies = {};
          if (Array.isArray(ft.apexSignals)) {
            validatedPsych.frameTendencies.apexSignals = (ft.apexSignals as unknown[]).filter(v => typeof v === 'string') as string[];
            hasPsychData = true;
          }
          if (Array.isArray(ft.slaveSignals)) {
            validatedPsych.frameTendencies.slaveSignals = (ft.slaveSignals as unknown[]).filter(v => typeof v === 'string') as string[];
            hasPsychData = true;
          }
        }

        // Nested object: trustMarkers
        if (psych.trustMarkers && typeof psych.trustMarkers === 'object') {
          const tm = psych.trustMarkers as Record<string, unknown>;
          validatedPsych.trustMarkers = {};
          if (Array.isArray(tm.builders)) {
            validatedPsych.trustMarkers.builders = (tm.builders as unknown[]).filter(v => typeof v === 'string') as string[];
            hasPsychData = true;
          }
          if (Array.isArray(tm.breakers)) {
            validatedPsych.trustMarkers.breakers = (tm.breakers as unknown[]).filter(v => typeof v === 'string') as string[];
            hasPsychData = true;
          }
        }

        if (hasPsychData) {
          validatedUpdate.psychometric = validatedPsych;
        }
      }

      // Only include if we have note or psychometric data
      if (validatedUpdate.note || validatedUpdate.psychometric) {
        result.contact_update = validatedUpdate;
      }
    }
  }

  return result;
}

// =============================================================================
// CONTACT UPDATE HANDLER
// =============================================================================

/**
 * Process a contact_update action from Little Lord response.
 * Creates note and/or updates psychometric profile.
 */
function processContactUpdate(contactUpdate: NonNullable<LittleLordResponse['contact_update']>): void {
  const { contactId, note, psychometric } = contactUpdate;

  // Verify contact exists
  const contact = getContactByIdFromStore(contactId);
  if (!contact) {
    console.warn('[Little Lord] Contact not found for update:', contactId);
    return;
  }

  let noteId: string | undefined;

  // Create note if provided
  if (note) {
    const newNote = createNote({
      title: note.title || `LL Insight: ${contact.fullName}`,
      content: note.content,
      kind: 'note',
      targetContactIds: [contactId],
      tags: ['little-lord-insight'],
    });
    noteId = newNote.id;
    console.log('[Little Lord] Created note for contact:', contact.fullName, 'noteId:', noteId);
  }

  // Update psychometric profile if provided
  if (psychometric) {
    const existingProfile = contact.psychometricProfile || {};
    const now = new Date().toISOString();

    // Merge arrays (append new items, dedupe)
    const mergeArrays = (existing: string[] | undefined, newItems: string[] | undefined): string[] | undefined => {
      if (!newItems || newItems.length === 0) return existing;
      if (!existing) return newItems;
      const combined = [...existing, ...newItems];
      return [...new Set(combined)];
    };

    // Build updated profile
    const updatedProfile: ContactPsychometricProfile = {
      ...existingProfile,
      // Override string fields if provided
      communicationStyle: psychometric.communicationStyle || existingProfile.communicationStyle,
      decisionMakingStyle: psychometric.decisionMakingStyle || existingProfile.decisionMakingStyle,
      relationshipDynamics: psychometric.relationshipDynamics || existingProfile.relationshipDynamics,
      pressureResponse: psychometric.pressureResponse || existingProfile.pressureResponse,
      negotiationStyle: psychometric.negotiationStyle || existingProfile.negotiationStyle,
      // Merge arrays
      motivators: mergeArrays(existingProfile.motivators, psychometric.motivators),
      values: mergeArrays(existingProfile.values, psychometric.values),
      traits: mergeArrays(existingProfile.traits, psychometric.traits),
      goals: mergeArrays(existingProfile.goals, psychometric.goals),
      painPoints: mergeArrays(existingProfile.painPoints, psychometric.painPoints),
      // Merge nested objects
      frameTendencies: {
        apexSignals: mergeArrays(existingProfile.frameTendencies?.apexSignals, psychometric.frameTendencies?.apexSignals),
        slaveSignals: mergeArrays(existingProfile.frameTendencies?.slaveSignals, psychometric.frameTendencies?.slaveSignals),
      },
      trustMarkers: {
        builders: mergeArrays(existingProfile.trustMarkers?.builders, psychometric.trustMarkers?.builders),
        breakers: mergeArrays(existingProfile.trustMarkers?.breakers, psychometric.trustMarkers?.breakers),
      },
      // Update metadata
      updatedAt: now,
      sourceNoteIds: noteId
        ? mergeArrays(existingProfile.sourceNoteIds, [noteId])
        : existingProfile.sourceNoteIds,
    };

    // Update the contact
    updateContact({
      ...contact,
      psychometricProfile: updatedProfile,
    });

    console.log('[Little Lord] Updated psychometric profile for:', contact.fullName);
  }
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

    // Process want_tracking action if present
    if (response.want_tracking) {
      const event: WantTrackingEvent = {
        type: 'want_tracking.log_day',
        payload: {
          date: response.want_tracking.date,
          entries: response.want_tracking.entries,
        },
      };
      handleLittleLordEvent(event);
      console.log('[Little Lord] Processed want_tracking:', response.want_tracking);
    }

    // Process contact_update action if present
    if (response.contact_update) {
      processContactUpdate(response.contact_update);
      console.log('[Little Lord] Processed contact_update:', response.contact_update.contactId);
    }

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

    // Process want_tracking action if present
    if (response.want_tracking) {
      const event: WantTrackingEvent = {
        type: 'want_tracking.log_day',
        payload: {
          date: response.want_tracking.date,
          entries: response.want_tracking.entries,
        },
      };
      handleLittleLordEvent(event);
      console.log('[Little Lord] Processed want_tracking:', response.want_tracking);
    }

    // Process contact_update action if present
    if (response.contact_update) {
      processContactUpdate(response.contact_update);
      console.log('[Little Lord] Processed contact_update:', response.contact_update.contactId);
    }

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
      content: `I'm LL, your Apex Frame mentor. I help you move from Slave Frame to Apex Frame — installing Win-Win positioning and clean Dominion.

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
