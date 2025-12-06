// =============================================================================
// COOKIE CONSENT STORE — Cookie consent management
// =============================================================================
// Manages cookie consent state for GDPR/CCPA compliance.
// =============================================================================

import type { CookieConsent } from '../types/multiTenant';
import { cookieConsentConfig } from '../config/appConfig';

const STORAGE_KEY = cookieConsentConfig.storageKey;

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

/**
 * Get current cookie consent status
 */
export function getCookieConsent(): CookieConsent | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CookieConsent;
    }
  } catch {
    console.warn('[CookieConsentStore] Failed to read consent');
  }
  return null;
}

/**
 * Check if user has accepted cookies
 */
export function hasAcceptedCookies(): boolean {
  const consent = getCookieConsent();
  if (!consent) return false;
  
  // Check if version matches current version
  if (consent.version !== cookieConsentConfig.currentVersion) {
    return false;
  }
  
  return consent.accepted;
}

/**
 * Accept cookies
 */
export function acceptCookies(): CookieConsent {
  const consent: CookieConsent = {
    accepted: true,
    acceptedAt: new Date().toISOString(),
    version: cookieConsentConfig.currentVersion,
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    console.warn('[CookieConsentStore] Failed to save consent');
  }
  
  return consent;
}

/**
 * Decline cookies (not typically offered, but included for completeness)
 */
export function declineCookies(): CookieConsent {
  const consent: CookieConsent = {
    accepted: false,
    acceptedAt: new Date().toISOString(),
    version: cookieConsentConfig.currentVersion,
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  } catch {
    console.warn('[CookieConsentStore] Failed to save consent');
  }
  
  return consent;
}

/**
 * Reset cookie consent (for re-prompting after version update)
 */
export function resetCookieConsent(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn('[CookieConsentStore] Failed to reset consent');
  }
}

/**
 * Check if should show cookie banner
 */
export function shouldShowCookieBanner(): boolean {
  const consent = getCookieConsent();
  
  // No consent recorded
  if (!consent) return true;
  
  // Version outdated
  if (consent.version !== cookieConsentConfig.currentVersion) {
    return true;
  }
  
  // Already responded (either accepted or declined)
  return false;
}






