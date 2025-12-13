# Intake, Beta, and Admin Current Behavior Audit

**Date:** 2025-12-13
**Purpose:** Document current implementation state before refactoring

---

## 1. Beta Application Implementation

### Location
- **Component:** `src/components/BetaPage.tsx`
- **Route:** Accessed via App.tsx view state `'beta'` (no URL routing)
- **Entry point:** Footer dev link "Beta Program" in landing page

### Current Behavior
- Chat-based UI with AI "Beta Program Director"
- Uses `submitBetaApplicationChat()` from `lib/llm/geminiService.ts`
- Conversation-style application (not form-based)
- **No persistent storage** - chat history only exists in React state
- **No database table** - applications are not saved
- **No admin notification** - no email or console log when someone completes

### Data Storage
- **None currently** - conversations disappear on page refresh
- `src/stores/applicationStore.ts` has `BetaApplicationV2` type and localStorage storage, but is NOT connected to BetaPage.tsx
- The applicationStore uses a form-based model, not the chat-based flow in BetaPage.tsx

### Admin Panel
- `PlatformAdminPortal.tsx` has "Beta Apps" tab
- Uses `BetaApplicationsPanel` from `ApplicationAdminPanels.tsx`
- Reads from `applicationStore.ts` (which BetaPage does NOT write to)
- **Current state:** Empty because BetaPage doesn't persist anything

---

## 2. Case Call Application Implementation

### Location
- **No dedicated component exists** for /case-call
- **No route** defined in App.tsx

### Current Behavior
- References exist in:
  - `IntakeResults.tsx` - mentions booking a case call
  - `notificationService.ts` - has `caseCallBooked` event type
  - Email templates reference case calls
- Actual booking flow appears incomplete

### Data Storage
- **None** - no Supabase table, no localStorage
- No `caseCallApplications` or similar store

---

## 3. Tier 1 Intake Implementation

### Location
- **Component:** `src/components/intake/IntakeFlow.tsx`
- **Store:** `src/services/intakeStore.ts`
- **Questions:** `docs/specs/business_frame_spec.json`

### Current Behavior
1. User enters intake via App.tsx view `'intake'`
2. Shows "TIER 1: FIRST-ACCESS GATE" intro
3. Questions loaded from `business_frame_spec.json` (tier=1 filter)
4. Questions include:
   - Identity/role questions
   - Business context
   - Frame problems
   - Wants/constraints
   - Self-rating slider (1-10)
5. After completion:
   - Shows "Analyzing..." animation (1.5s)
   - Shows "ACCESS GRANTED" with checkmark
   - "See your results" button leads to IntakeResults

### Question Count
- Filtered by `q.tier === 1` from spec
- Mix of text and slider input types
- Character limits: minLength ~80, maxLength ~800

### Tier 1 Gate
- `markTier1GateCompleted(contactId)` sets `firstIntakeCompletedAt`
- `needsTier1Intake(contactId)` checks if user needs intake
- App.tsx redirects to intake if `needsTier1Intake(CONTACT_ZERO.id)` is true
- Dev mode can bypass via `bypassIntakeGateRef`

### Completion Storage
- `completeSession(sessionId)` marks status='completed'
- `storeIntakeProfileData(sessionId)` saves to contact profile
- Sessions stored in localStorage via `intakeStore.ts`

### Notifications
- `onIntakeCompleted(sessionId)` hook fires on Tier 1 completion
- Calls `sendIntakeCompletionEmail()` which:
  - Logs to console (EMAIL_ENABLED=false)
  - Would send via SendGrid if server-side enabled
- Also calls `notifyUser()` for user-facing notification

---

## 4. Tier 2 (Apex Blueprint) Implementation

### Location
- Same component: `IntakeFlow.tsx`
- Module selection after Tier 1 completion

### Current Behavior
1. User clicks "Continue to Tier 2" from Tier 1 results
2. Shows "TIER 2: APEX BLUEPRINT" intro
3. Module selection: Money, Authority, Operations
4. Questions filtered by `tier === 2 && module === selectedModule`
5. On completion, `onTier2ModuleCompleted(sessionId)` fires

### Current Access Point
- From IntakeResults.tsx "TIER 2 APEX BLUEPRINT" button
- **NOT** accessible from Contact Zero dashboard
- **NOT** a global nav item (correct per requirements)

---

## 5. Intake Voice Implementation

### Location
- `src/components/intake/AnswerInput.tsx`

### Current Behavior
- Web Speech API integration (`SpeechRecognition`)
- Mic button appears if `isSpeechSupported`
- Records up to 60 seconds (`MAX_RECORDING_MS = 60000`)
- Shows "Listening...", "Transcribing...", or error states
- Real-time interim text display
- Final transcript inserted into textarea
- **Fully functional** - no "coming soon" text

### Voice Status States
- `idle` - not recording
- `waiting` - listening but no speech detected yet
- `active` - actively transcribing
- `error` - no speech detected after 5s

---

## 6. Super Admin Portal

### Location
- `src/components/admin/PlatformAdminPortal.tsx`

### Current Visibility
- Sidebar entry exists in Dashboard.tsx (lines 2028-2041)
- **Dev mode only:** `{import.meta.env.DEV && ...}`
- Shows "Super Admin" button with Shield icon
- Appears below Settings in footer zone

### Access Control
- `canAccessPlatformAdmin(userScope)` check
- `isSuperAdmin(userScope)` for super-admin-only tabs
- Uses `userScope.staffRole` from authStore

### Current Tabs
1. Tenants
2. Users
3. Coaching Apps
4. Beta Apps
5. Pending Calls
6. Struggling Users
7. Intake Sessions (shows all Q/A)
8. Usage Analytics
9. Enterprise Usage
10. User Usage
11. Frame Score Analytics
12. Data Requests
13. System Logs (Super Admin only)
14. Staff Roles (Super Admin only)
15. Broadcast (Super Admin only)

### Intake Sessions Panel
- Shows all sessions from `getAllSessions()`
- Expandable rows with full Q/A content
- Displays metrics: Frame Score, Frame Type, Self Rating, Active Flags
- **Working correctly**

---

## 7. Notification Service Current State

### Location
- `src/services/intakeNotificationService.ts`
- `src/services/notificationService.ts` (general)

### intakeNotificationService.ts
- `formatIntakeEmailPayload()` - builds structured payload
- `generateEmailHtml()` / `generateEmailText()` - email content
- `sendIntakeCompletionEmail()` - main send function
- `onIntakeCompleted()` - Tier 1 hook
- `onTier2ModuleCompleted()` - Tier 2 hook

### Email Configuration
- `EMAIL_ENABLED = false` (security - client-side)
- `EMAIL_FROM_ADDRESS = 'FrameLord Intake <no-reply@framelord.com>'`
- Logs to console when disabled
- SendGrid integration stub exists

### What's Missing
- No `onBetaApplicationSubmitted()` hook
- No `onCaseCallApplicationSubmitted()` hook
- Beta and case-call flows don't call notification service

---

## 8. Super Admin Email Detection

### Current Implementation
- No email-based allowlist exists
- Uses `userScope.staffRole === 'SUPER_ADMIN'`
- Set via `loginAsSuperAdminDev()` in authStore (dev only)
- Real users need `staffRole` set in Supabase/database

### Required Email
- `realaaronernst@gmail.com` should be SUPER_ADMIN (per brief)
- Currently no code checks this email specifically

---

## Summary of Gaps

| Feature | Current State | Needed |
|---------|--------------|--------|
| Beta application storage | None (chat only) | Supabase table |
| Beta admin notification | None | Email hook |
| Case call route | Missing | /case-call component |
| Case call storage | None | Supabase table |
| Super Admin sidebar | Dev-only | Production visibility for realaaronernst@gmail.com |
| Tier 2 on Contact Zero | Only via IntakeResults | Card/CTA on Contact Zero page |
| Email allowlist | None | Check for super admin email |

---

## Files to Modify

1. `src/services/intakeNotificationService.ts` - Add beta/case-call hooks
2. `src/components/BetaPage.tsx` - Connect to storage and notifications
3. `src/components/Dashboard.tsx` - Fix Super Admin visibility
4. `src/components/crm/ContactZeroView.tsx` - Add Tier 2 section
5. `src/App.tsx` - Add /case-call route
6. New: `src/components/CaseCallPage.tsx` - Case call application
