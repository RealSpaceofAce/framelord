<objective>
Integrate the AISpirit floating orb animation from `aether-entity-interface/` into the Little Lord chat system. When the Little Lord modal is maximized/fullscreen, replace the standard chat UI with the immersive orb experience where:
1. The AISpirit orb floats in the center of the screen
2. Chat messages scroll up from below, fading as they approach the orb
3. LL refers to himself as "LL" (not "Little Lord") in his messages
4. Users can still scroll to see older messages, but the orb has visual priority
</objective>

<context>
Project: FrameLord - AI-powered authority diagnostics platform
Tech stack: React 19 + TypeScript + Vite (no backend, in-memory stores)

Current Little Lord architecture:
- `src/components/littleLord/LittleLordFloatingButton.tsx` - Corner button that opens modal
- `src/components/littleLord/LittleLordGlobalModal.tsx` - Draggable/resizable floating window with minimize/maximize
- `src/components/littleLord/LittleLordChat.tsx` - Chat interface component with messages
- `src/components/littleLord/LittleLordProvider.tsx` - Context provider for LL state
- `src/services/littleLord/` - Backend services for LL AI responses

The aether-entity-interface prototype:
- `aether-entity-interface/components/AISpirit.tsx` - Canvas-based 3D particle orb with:
  - Simplex noise for organic movement
  - Mouse/touch interactivity (drag, ripple effects)
  - "Thinking" and "speaking" visual states
  - Particle cloud around a morphing sphere mesh
- `aether-entity-interface/components/ChatInterface.tsx` - Layout showing orb with messages below
- `aether-entity-interface/types.ts` - SpiritState interface (isThinking, isSpeaking, emotion)

Current maximize behavior in LittleLordGlobalModal.tsx:
- `isMaximized` state controls fullscreen mode
- handleMaximize() expands to near-fullscreen (20px padding)
- Currently just scales the standard chat interface
</context>

<requirements>
1. Create `src/components/littleLord/LittleLordOrbView.tsx`:
   - Port the AISpirit component from aether-entity-interface
   - Integrate with existing SpiritState from LittleLord context
   - Position orb in center of screen with proper z-indexing

2. Create `src/components/littleLord/LittleLordFullscreenChat.tsx`:
   - New chat layout for fullscreen/orb mode
   - Messages appear below the orb and scroll upward
   - Messages fade with gradient as they approach the orb center
   - Maintain scrollability for message history
   - Input field fixed at bottom
   - The orb takes visual priority - messages must not overlap it

3. Modify `src/components/littleLord/LittleLordGlobalModal.tsx`:
   - When `isMaximized === true`, render LittleLordFullscreenChat with orb
   - When `isMaximized === false`, render current LittleLordChat (no change)
   - Pass appropriate state to control orb animation (thinking, speaking)

4. Update LL's self-reference:
   - Modify `src/services/littleLord/doctrine.ts` or system prompt
   - LL should refer to himself as "LL" not "Little Lord" in responses
   - The title can remain "Little Lord" in headers/UI

5. Add SpiritState type if not exists:
   - `isThinking: boolean` - When waiting for AI response
   - `isSpeaking: boolean` - When displaying new message (animate during typewriter)
   - `emotion: 'neutral' | 'excited' | 'contemplative'`

6. Message fade effect requirements:
   - Messages should fade to transparent as they scroll up toward the orb
   - Use CSS mask/gradient: solid at bottom, fading to transparent at top
   - Leave enough clear space around orb (at least 200px radius) for the animation
</requirements>

<implementation>
Port AISpirit.tsx with minimal changes:
- Keep the SimplexNoise class, Particle class, and all animation logic
- Update imports to match FrameLord's structure
- Remove Gemini service integration (LL already has its own AI service)
- Connect `isThinking` state to provider's loading state

Fullscreen layout structure:
```tsx
<div className="fixed inset-0 z-[100] bg-[#0A0A0A] flex flex-col">
  {/* Header with minimize/close buttons */}
  <div className="shrink-0 p-4 flex justify-between items-center">
    <h2>Little Lord</h2>
    <buttons />
  </div>

  {/* Main content - orb centered, messages below */}
  <div className="flex-1 relative overflow-hidden">
    {/* Orb - centered, z-10 */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
      <LittleLordOrbView state={spiritState} />
    </div>

    {/* Messages - scrollable area below orb with fade mask */}
    <div className="absolute bottom-0 left-0 right-0 h-[40%] overflow-y-auto mask-gradient-up">
      <MessageList messages={messages} />
    </div>
  </div>

  {/* Input - fixed at bottom */}
  <div className="shrink-0 p-4 bg-[#0E0E0E]">
    <ChatInput />
  </div>
</div>
```

CSS mask for message fade:
```css
.mask-gradient-up {
  mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, black 0%, black 60%, transparent 100%);
}
```

Orb integration with LL state:
```tsx
// In LittleLordFullscreenChat.tsx
const spiritState: SpiritState = {
  isThinking: loading,  // from chat state
  isSpeaking: isTyping, // if using typewriter effect
  emotion: 'neutral'
};
```
</implementation>

<constraints>
- No external file storage or server calls (per CLAUDE.md rules)
- Must work with existing LL provider and services
- Framer Motion for animations where appropriate
- Preserve all existing non-fullscreen functionality
- The orb canvas must be performant (60fps target)
- Touch support required for mobile
- Do not break existing LittleLordChat component
- Keep file sizes reasonable - AISpirit is already ~570 lines
</constraints>

<output>
Create/modify these files:
- `./src/components/littleLord/LittleLordOrbView.tsx` - New: Ported AISpirit orb component
- `./src/components/littleLord/LittleLordFullscreenChat.tsx` - New: Fullscreen layout with orb + messages
- `./src/components/littleLord/LittleLordGlobalModal.tsx` - Modified: Switch views based on isMaximized
- `./src/components/littleLord/LittleLordChat.css` - New or modified: Mask gradient styles
- `./src/services/littleLord/doctrine.ts` - Modified: Update LL self-reference to "LL"
- `./src/components/littleLord/index.ts` - Modified: Export new components
</output>

<verification>
Before declaring complete, verify:
1. Run `npm run build` - Build must succeed with no TypeScript errors
2. Run `npm run dev` and navigate to Dashboard
3. Click the floating LL button to open modal
4. Resize to non-maximized state - Should show standard chat UI
5. Click maximize button - Should transition to orb view:
   - Orb renders in center with particle animation
   - Messages appear below orb
   - Messages fade as they scroll up toward orb
   - Input remains at bottom
   - Orb responds to mouse hover/drag
6. Send a message - Orb should show "thinking" animation while waiting
7. Receive response - LL should refer to himself as "LL" not "Little Lord"
8. Click minimize/restore - Should toggle back to standard chat
9. Test on mobile viewport - Touch interactions should work
</verification>

<success_criteria>
- AISpirit orb renders in fullscreen mode with all animations working
- Messages display with proper fade effect approaching the orb
- No overlap between messages and orb center area
- LL refers to himself as "LL" in responses
- Smooth transitions between normal and fullscreen modes
- All existing LL functionality preserved (guardrails, events, etc.)
- 60fps animation performance maintained
- No TypeScript errors, build succeeds
</success_criteria>
