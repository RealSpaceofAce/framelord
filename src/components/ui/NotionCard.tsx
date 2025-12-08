// =============================================================================
// NOTION CARD — Theme-aware surface for document-like content
// =============================================================================
// This component creates a Notion-like presentation for content.
// NOW FULLY THEME-AWARE: Uses CSS variables (bg-card, border-border, etc.)
// to automatically respect dark/light mode from the global theme.
// =============================================================================

import * as React from "react"
import { cn } from "@/lib/utils"

export interface NotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Variant style for different contexts
   * @default "page"
   */
  variant?: "page" | "section" | "inline"
}

/**
 * NotionCard - A theme-aware container for document-like content.
 * Automatically respects the global theme (dark/light mode).
 *
 * Usage:
 * ```tsx
 * <NotionCard variant="page">
 *   <NotionSection title="Objective">Content...</NotionSection>
 * </NotionCard>
 * ```
 */
const NotionCard = React.forwardRef<HTMLDivElement, NotionCardProps>(
  ({ className, variant = "page", children, ...props }, ref) => {
    const variantStyles = {
      page: "bg-card rounded-xl shadow-lg border border-border p-8",
      section: "bg-card rounded-lg shadow-md border border-border p-6",
      inline: "bg-muted rounded-md border border-border p-4",
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "notion-card",
          // Typography - theme-aware
          "text-foreground",
          // Variant-specific styles - all theme-aware
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
NotionCard.displayName = "NotionCard"

/**
 * NotionCardHeader - Header area for NotionCard with title and optional actions
 */
const NotionCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between pb-4 mb-4 border-b border-border",
      className
    )}
    {...props}
  />
))
NotionCardHeader.displayName = "NotionCardHeader"

/**
 * NotionCardTitle - Large title for NotionCard
 */
const NotionCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-xl font-semibold tracking-tight text-foreground",
      className
    )}
    {...props}
  />
))
NotionCardTitle.displayName = "NotionCardTitle"

/**
 * NotionCardContent - Main content area with proper spacing
 */
const NotionCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-6", className)}
    {...props}
  />
))
NotionCardContent.displayName = "NotionCardContent"

export { NotionCard, NotionCardHeader, NotionCardTitle, NotionCardContent }
