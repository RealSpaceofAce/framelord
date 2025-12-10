# FrameLord QA Checklist

Last Updated: December 2024

## Pre-Release Checklist

### Build Verification
- [ ] `npm run build` completes without errors
- [ ] `npx tsc --noEmit` passes (excluding _legacy directory)
- [ ] No console errors on app load
- [ ] All assets load correctly (fonts, images, icons)

### Landing Page
- [ ] Landing page loads at `/`
- [ ] Particles render and animate correctly (~4000 particles, ~50% density)
- [ ] Hero section displays correctly
- [ ] "GET ACCESS" button scrolls to scanner
- [ ] Scanner demo area visible and interactive
- [ ] Pricing section displays correctly
- [ ] Footer links all functional

### Scanner (Landing Page)
- [ ] Text scan works with sample text
- [ ] Image upload works (drag & drop and click)
- [ ] Image preview displays correctly
- [ ] Clear image button works
- [ ] "RUN DIAGNOSTIC" button initiates scan
- [ ] Loading state shows scanning animation
- [ ] Results display with:
  - [ ] Frame score (0-100)
  - [ ] Subscores (8 categories)
  - [ ] Critical signal with title/description
  - [ ] Corrections list
- [ ] "Elite Intervention" CTA appears for low scores

### Legal Pages
- [ ] Terms of Service page loads at `/terms`
- [ ] Privacy Policy page loads at `/privacy`
- [ ] Acceptable Use Policy page loads at `/acceptable-use`
- [ ] Data Processing Addendum loads at `/dpa`
- [ ] Back button returns to landing page
- [ ] Footer contact email links work
- [ ] All pages have "Last updated: December 2024"
- [ ] TODO markers present for final legal copy

### Navigation
- [ ] Nav bar appears on all non-dashboard pages
- [ ] Logo click returns to landing
- [ ] Footer dev links work:
  - [ ] Application Page
  - [ ] Booking (placeholder)
  - [ ] Beta Program
  - [ ] Dashboard

### Dashboard (CRM)
- [ ] Dashboard loads correctly
- [ ] Home view shows Contact Zero
- [ ] Notes interface functional
- [ ] FrameScan page accessible
- [ ] Contacts list functional
- [ ] Exit Dashboard button works

### FrameScan (Dashboard)
- [ ] Text scan works
- [ ] Results save to report store
- [ ] Contact frame metrics update after scan
- [ ] Multi-contact attribution works (subjectContactIds)
- [ ] Report detail view accessible
- [ ] UI report renders correctly

### Little Lord
- [ ] Opens/closes correctly
- [ ] View-aware behavior respects current view
- [ ] User profile persists preferences
- [ ] Writing assistant only available in notes/framescan views

### Credit System
- [ ] Initial 10 credits available
- [ ] Basic image scans don't consume credits
- [ ] Detailed image scans consume 5 credits
- [ ] Credit packages display correctly
- [ ] Transaction history tracks usage

### Upsell Triggers
- [ ] Low score trigger fires at < 45 score
- [ ] Low credits trigger fires at < 3 credits
- [ ] Upgrade detailed trigger fires after 3 basic scans
- [ ] Recurring pattern trigger fires on repeat patterns
- [ ] Dismissing trigger prevents re-fire

### Telemetry (Dev Mode)
- [ ] `framescan_started` logs on scan initiation
- [ ] `framescan_completed` logs with score
- [ ] `littlelord_opened` logs on open
- [ ] `upsell_trigger_fired` logs on trigger
- [ ] Console shows `[Telemetry]` prefix in dev mode

## Responsive Design
- [ ] Landing page responsive on mobile (< 768px)
- [ ] Scanner area usable on mobile
- [ ] Dashboard functional on tablet (768px-1024px)
- [ ] Legal pages readable on all screen sizes

## Performance
- [ ] Initial page load < 3 seconds
- [ ] Particle system maintains 60fps
- [ ] No memory leaks on navigation
- [ ] Build size warnings addressed (chunking)

## Security
- [ ] No API keys in client-side code
- [ ] No PII in console logs
- [ ] All external links use `rel="noopener noreferrer"`
- [ ] No XSS vulnerabilities in user input

## Accessibility
- [ ] All interactive elements focusable
- [ ] Color contrast meets WCAG AA
- [ ] Form inputs have labels
- [ ] Error messages readable

## Known Issues / Deferred
- [ ] TypeScript errors in _legacy directory (acceptable - not in active use)
- [ ] Some pre-existing TS errors in AffineNotes (tracked separately)
- [ ] Bundle size warning (code splitting TODO)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

## Notes

Add any testing notes, edge cases, or observations here:

```
[Date] [Tester] - Notes
```
