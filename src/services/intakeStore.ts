// =============================================================================
// INTAKE STORE — In-memory data source for Intake Sessions
// =============================================================================
// Manages psycholinguistic intake sessions attached to contacts
// Contact Spine invariant: All IntakeSessions have a contactId
// =============================================================================

import {
  IntakeSession,
  Answer,
  AnswerInputType,
  IntakeTier,
  IntakeSessionStatus,
  FrameAxis,
  IntakeMetrics,
  QuestionDefinition,
} from '../types/businessFrame';
import type { ContactIntakeProfile } from '../types';
import { CONTACT_ZERO, updateContact, getContactById } from './contactStore';
import spec from '../../docs/specs/business_frame_spec.json';

// --- INTERNAL STATE ---

let sessions: IntakeSession[] = [];

// --- HELPER FUNCTIONS ---

/**
 * Generate unique ID for sessions
 */
const generateSessionId = (): string => {
  return `intake-session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Generate unique ID for answers
 */
const generateAnswerId = (): string => {
  return `answer-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Get question definition by ID from spec
 */
const getQuestionDefinition = (questionId: string): QuestionDefinition | undefined => {
  const questions = spec.questions as QuestionDefinition[];
  return questions.find(q => q.id === questionId);
};

/**
 * Get question order from spec (for consistent display in admin)
 */
const getQuestionOrder = (questionId: string): number => {
  const questions = spec.questions as QuestionDefinition[];
  const index = questions.findIndex(q => q.id === questionId);
  return index >= 0 ? index : 999;
};

// --- CRUD OPERATIONS ---

/**
 * Get all sessions for a tenant
 * @param tenantId - The tenant ID
 * @returns Array of intake sessions
 */
export const getSessions = (tenantId: string): IntakeSession[] => {
  return sessions.filter(s => s.tenantId === tenantId);
};

/**
 * Get session by ID
 * @param sessionId - The session ID
 * @returns The session or undefined
 */
export const getSessionById = (sessionId: string): IntakeSession | undefined => {
  return sessions.find(s => s.id === sessionId);
};

/**
 * Get all sessions for a contact
 * @param contactId - The contact ID
 * @returns Array of intake sessions for this contact
 */
export const getSessionsByContact = (contactId: string): IntakeSession[] => {
  return sessions.filter(s => s.contactId === contactId);
};

/**
 * Get active (in-progress) session for a contact
 * @param contactId - The contact ID
 * @returns The active session or undefined
 */
export const getActiveSession = (contactId: string): IntakeSession | undefined => {
  return sessions.find(s => s.contactId === contactId && s.status === 'in_progress');
};

/**
 * Get latest completed session for a contact
 * @param contactId - The contact ID
 * @returns The latest completed session or undefined
 */
export const getLatestCompletedSession = (contactId: string): IntakeSession | undefined => {
  const completedSessions = sessions
    .filter(s => s.contactId === contactId && s.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());

  return completedSessions[0];
};

/**
 * Check if a contact has completed a specific tier
 * @param contactId - The contact ID
 * @param tier - The intake tier
 * @returns True if tier completed
 */
export const hasCompletedTier = (contactId: string, tier: IntakeTier): boolean => {
  return sessions.some(
    s => s.contactId === contactId && s.tier === tier && s.status === 'completed'
  );
};

/**
 * Start a new intake session
 * @param tenantId - The tenant ID
 * @param contactId - The contact ID (links to Contact Spine)
 * @param tier - The intake tier (1 or 2)
 * @returns The newly created session
 */
export const startSession = (
  tenantId: string,
  contactId: string,
  tier: IntakeTier
): IntakeSession => {
  const now = new Date().toISOString();

  const newSession: IntakeSession = {
    id: generateSessionId(),
    tenantId,
    contactId,
    tier,
    status: 'in_progress',
    startedAt: now,
    answers: [],
    createdAt: now,
    updatedAt: now,
  };

  sessions.push(newSession);
  return newSession;
};

/**
 * Map QuestionType to AnswerInputType
 */
const mapQuestionTypeToInputType = (questionType?: string, inputType?: string): AnswerInputType => {
  if (inputType === 'slider') return 'slider';
  if (!questionType) return 'textarea';

  switch (questionType) {
    case 'identity':
      return 'identity';
    case 'list':
      return 'list';
    case 'goal':
      return 'goal';
    case 'self_rating':
      return 'slider';
    default:
      return 'textarea';
  }
};

/**
 * Record an answer to a question (upsert - updates if already answered)
 * @param sessionId - The session ID
 * @param questionId - The question ID
 * @param rawText - The user's answer text
 * @param questionText - The full question prompt (optional, fetched from spec if not provided)
 * @param inputType - The input type used (optional, derived from question if not provided)
 * @returns The created or updated answer
 */
export const recordAnswer = (
  sessionId: string,
  questionId: string,
  rawText: string,
  questionText?: string,
  inputType?: AnswerInputType
): Answer | null => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return null;
  }

  if (session.status !== 'in_progress') {
    console.warn(`Cannot add answer to session ${sessionId} - status is ${session.status}`);
    return null;
  }

  const now = new Date().toISOString();

  // Get question definition to populate questionText and inputType if not provided
  const questionDef = getQuestionDefinition(questionId);
  const finalQuestionText = questionText || questionDef?.prompt || questionId;
  const finalInputType = inputType || mapQuestionTypeToInputType(questionDef?.questionType, questionDef?.inputType);

  // Check if answer already exists for this question (upsert logic)
  const existingIndex = session.answers.findIndex(a => a.questionId === questionId);

  if (existingIndex >= 0) {
    // Update existing answer
    const existingAnswer = session.answers[existingIndex];
    const updatedAnswer: Answer = {
      ...existingAnswer,
      rawText,
      questionText: finalQuestionText,
      inputType: finalInputType,
      // Keep original answeredAt, but session.updatedAt will change
    };
    session.answers[existingIndex] = updatedAnswer;
    session.updatedAt = now;
    return updatedAnswer;
  }

  // Create new answer
  const newAnswer: Answer = {
    id: generateAnswerId(),
    sessionId,
    questionId,
    questionText: finalQuestionText,
    inputType: finalInputType,
    rawText,
    answeredAt: now,
  };

  session.answers.push(newAnswer);
  session.updatedAt = now;

  return newAnswer;
};

/**
 * Upsert an answer - alias for recordAnswer which now handles upserts
 * @deprecated Use recordAnswer instead
 */
export const upsertAnswer = recordAnswer;

/**
 * Update an answer with analysis results
 * @param sessionId - The session ID
 * @param answerId - The answer ID
 * @param analysis - The analysis results
 * @returns True if updated successfully
 */
export const updateAnswerAnalysis = (
  sessionId: string,
  answerId: string,
  analysis: Answer['analysis']
): boolean => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return false;
  }

  const answer = session.answers.find(a => a.id === answerId);
  if (!answer) {
    console.warn(`Answer ${answerId} not found in session ${sessionId}`);
    return false;
  }

  answer.analysis = analysis;
  session.updatedAt = new Date().toISOString();

  return true;
};

/**
 * Complete a session
 * @param sessionId - The session ID
 * @returns The updated session or null
 */
export const completeSession = (sessionId: string): IntakeSession | null => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return null;
  }

  const now = new Date().toISOString();

  session.status = 'completed';
  session.completedAt = now;
  session.updatedAt = now;

  return session;
};

/**
 * Mark Tier 1 intake gateway as completed for a contact.
 * Sets firstIntakeCompletedAt only if not already set (preserves first completion date).
 * Call this when a Tier 1 session is completed for the first time.
 * @param contactId - The contact ID
 * @returns True if the flag was set, false if already set or contact not found
 */
export const markTier1GateCompleted = (contactId: string): boolean => {
  const contact = getContactById(contactId);
  if (!contact) {
    console.warn(`[IntakeStore] markTier1GateCompleted: Contact ${contactId} not found`);
    return false;
  }

  // Only set if not already completed (preserves first completion date)
  if (contact.firstIntakeCompletedAt) {
    console.log(`[IntakeStore] markTier1GateCompleted: Contact ${contactId} already completed Tier 1 at ${contact.firstIntakeCompletedAt}`);
    return false;
  }

  const now = new Date().toISOString();
  updateContact({
    ...contact,
    firstIntakeCompletedAt: now,
  });

  console.log(`[IntakeStore] markTier1GateCompleted: Set firstIntakeCompletedAt for ${contactId} to ${now}`);
  return true;
};

/**
 * Abandon a session
 * @param sessionId - The session ID
 * @returns The updated session or null
 */
export const abandonSession = (sessionId: string): IntakeSession | null => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return null;
  }

  session.status = 'abandoned';
  session.updatedAt = new Date().toISOString();

  return session;
};

/**
 * Update session metrics
 * @param sessionId - The session ID
 * @param metrics - The computed metrics
 * @returns True if updated successfully
 */
export const updateSessionMetrics = (
  sessionId: string,
  metrics: IntakeMetrics
): boolean => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return false;
  }

  session.metrics = metrics;
  session.updatedAt = new Date().toISOString();

  return true;
};

/**
 * Get all answers for a session
 * @param sessionId - The session ID
 * @returns Array of answers
 */
export const getAnswersBySession = (sessionId: string): Answer[] => {
  const session = sessions.find(s => s.id === sessionId);
  return session?.answers || [];
};

/**
 * Get a specific answer by ID
 * @param sessionId - The session ID
 * @param answerId - The answer ID
 * @returns The answer or undefined
 */
export const getAnswerById = (sessionId: string, answerId: string): Answer | undefined => {
  const session = sessions.find(s => s.id === sessionId);
  return session?.answers.find(a => a.id === answerId);
};

/**
 * Delete a session (soft delete by setting status to abandoned)
 * @param sessionId - The session ID
 * @returns True if deleted successfully
 */
export const deleteSession = (sessionId: string): boolean => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    return false;
  }

  session.status = 'abandoned';
  session.updatedAt = new Date().toISOString();

  return true;
};

/**
 * Get Contact Zero's intake sessions
 * @returns Array of Contact Zero's intake sessions
 */
export const getContactZeroSessions = (): IntakeSession[] => {
  return sessions.filter(s => s.contactId === CONTACT_ZERO.id);
};

/**
 * Get Contact Zero's latest completed session
 * @returns The latest completed session for Contact Zero or undefined
 */
export const getContactZeroLatestSession = (): IntakeSession | undefined => {
  return getLatestCompletedSession(CONTACT_ZERO.id);
};

/**
 * Get all completed sessions for a tenant
 * @param tenantId - The tenant ID
 * @returns Array of completed sessions
 */
export const getCompletedSessions = (tenantId: string): IntakeSession[] => {
  return sessions.filter(s => s.tenantId === tenantId && s.status === 'completed');
};

/**
 * Get in-progress sessions for a tenant
 * @param tenantId - The tenant ID
 * @returns Array of in-progress sessions
 */
export const getInProgressSessions = (tenantId: string): IntakeSession[] => {
  return sessions.filter(s => s.tenantId === tenantId && s.status === 'in_progress');
};

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================

/**
 * Get all sessions across all tenants (for Super Admin)
 * @returns Array of all intake sessions
 */
export const getAllSessions = (): IntakeSession[] => {
  return [...sessions].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

// =============================================================================
// INTAKE PROFILE DATA EXTRACTION
// =============================================================================

/**
 * Extract and store intake profile data on Contact Zero.
 * Called when an intake session is completed.
 *
 * Maps answers to Contact Zero fields based on question `storeAs` property:
 * - contactProfile.bio: Identity answer
 * - contactProfile.workContext: Work context answer
 * - contactProfile.primaryVision: Primary vision/goal answer
 * - contactProfile.wants: Combined wants from want discovery questions
 * - contactProfile.keyConstraint: Key blocker/constraint answer
 * - contactProfile.notes: Additional notes
 * - contactProfile.selfRating: Self-rating slider value
 * - initialWants: Legacy array for backward compatibility
 *
 * @param sessionId - The completed session ID
 * @returns True if profile data was stored successfully
 */
export const storeIntakeProfileData = (sessionId: string): boolean => {
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    console.warn(`Session ${sessionId} not found`);
    return false;
  }

  // Only process Contact Zero's sessions for profile storage
  if (session.contactId !== CONTACT_ZERO.id) {
    return false;
  }

  const contact = getContactById(CONTACT_ZERO.id);
  if (!contact) {
    console.warn('Contact Zero not found');
    return false;
  }

  const now = new Date().toISOString();
  let updated = false;

  // Initialize profile objects if needed
  const contactProfile: ContactIntakeProfile = contact.contactProfile || {};
  const initialWants: string[] = contact.initialWants || [];
  const profileWants: string[] = contactProfile.wants || [];

  // Set createdAt on first update
  if (!contactProfile.createdAt) {
    contactProfile.createdAt = now;
  }

  // Process each answer based on its question's storeAs property
  for (const answer of session.answers) {
    const questionDef = getQuestionDefinition(answer.questionId);
    if (!questionDef) continue;

    const storeAs = questionDef.storeAs;

    // Map by storeAs property
    if (storeAs === 'contactProfile.bio') {
      contactProfile.bio = answer.rawText;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'contactProfile.workContext') {
      contactProfile.workContext = answer.rawText;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'contactProfile.primaryVision') {
      contactProfile.primaryVision = answer.rawText;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'contactProfile.keyConstraint') {
      contactProfile.keyConstraint = answer.rawText;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'contactProfile.notes') {
      contactProfile.notes = answer.rawText;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'contactProfile.selfRating') {
      contactProfile.selfRating = parseInt(answer.rawText, 10) || undefined;
      contactProfile.updatedAt = now;
      updated = true;
    } else if (storeAs === 'initialWants' || storeAs === 'contactProfile.wants') {
      // Append to wants arrays (both legacy and new)
      if (answer.rawText.trim()) {
        initialWants.push(answer.rawText);
        profileWants.push(answer.rawText);
        updated = true;
      }
    }

    // Also map by question type for questions without explicit storeAs
    if (!storeAs) {
      const qType = questionDef.questionType;
      if (qType === 'self_rating' && answer.inputType === 'slider') {
        contactProfile.selfRating = parseInt(answer.rawText, 10) || undefined;
        contactProfile.updatedAt = now;
        updated = true;
      }
    }
  }

  // Update profile wants array
  if (profileWants.length > 0) {
    contactProfile.wants = profileWants;
  }

  if (updated) {
    updateContact({
      ...contact,
      contactProfile,
      initialWants,
    });
  }

  return updated;
};

/**
 * Get Contact Zero's intake profile data.
 * @returns The intake profile or undefined if not set
 */
export const getContactZeroIntakeProfile = (): { bio?: string; workContext?: string } | undefined => {
  const contact = getContactById(CONTACT_ZERO.id);
  return contact?.contactProfile;
};

/**
 * Get Contact Zero's initial wants from intake.
 * @returns Array of want statements or empty array
 */
export const getContactZeroInitialWants = (): string[] => {
  const contact = getContactById(CONTACT_ZERO.id);
  return contact?.initialWants || [];
};
