// =============================================================================
// UTILITY FUNCTIONS — For shadcn-ui component patterns
// =============================================================================

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes with proper precedence handling.
 * Used by shadcn-ui components for conditional class application.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
