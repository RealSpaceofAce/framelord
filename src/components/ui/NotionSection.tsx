// =============================================================================
// NOTION SECTION — Theme-aware section divider with heading
// =============================================================================
// Use inside NotionCard to create consistent section breaks.
// NOW FULLY THEME-AWARE: Uses CSS variables (border-border, text-foreground, etc.)
// to automatically respect dark/light mode from the global theme.
// =============================================================================

import * as React from "react"
import { cn } from "@/lib/utils"

export interface NotionSectionProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Section title displayed as heading
   */
  title: string
  /**
   * Optional icon to display before title
   */
  icon?: React.ReactNode
  /**
   * Optional action buttons/elements for the header
   */
  actions?: React.ReactNode
  /**
   * Whether to show the top border divider
   * @default true
   */
  showDivider?: boolean
  /**
   * Whether this is the first section (no top margin/divider)
   * @default false
   */
  isFirst?: boolean
}

/**
 * NotionSection - A section within a NotionCard with consistent styling.
 * Automatically respects the global theme (dark/light mode).
 *
 * Usage:
 * ```tsx
 * <NotionSection title="Daily Metrics" icon={<Calendar />}>
 *   <table>...</table>
 * </NotionSection>
 * ```
 */
const NotionSection = React.forwardRef<HTMLElement, NotionSectionProps>(
  ({
    className,
    title,
    icon,
    actions,
    showDivider = true,
    isFirst = false,
    children,
    ...props
  }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(
          "notion-section",
          !isFirst && showDivider && "pt-6 mt-6 border-t border-border",
          className
        )}
        {...props}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {icon && (
              <span className="text-muted-foreground">
                {icon}
              </span>
            )}
            {title}
          </h3>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Section Content */}
        <div className="notion-section-content">
          {children}
        </div>
      </section>
    )
  }
)
NotionSection.displayName = "NotionSection"

/**
 * NotionDivider - Simple horizontal divider
 */
const NotionDivider = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>(({ className, ...props }, ref) => (
  <hr
    ref={ref}
    className={cn(
      "border-t border-border my-6",
      className
    )}
    {...props}
  />
))
NotionDivider.displayName = "NotionDivider"

/**
 * NotionText - Paragraph text with Notion-style typography
 */
const NotionText = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "leading-relaxed text-[15px] text-muted-foreground",
      className
    )}
    {...props}
  />
))
NotionText.displayName = "NotionText"

/**
 * NotionLabel - Small label text
 */
const NotionLabel = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "text-xs font-medium uppercase tracking-wide text-muted-foreground",
      className
    )}
    {...props}
  />
))
NotionLabel.displayName = "NotionLabel"

export { NotionSection, NotionDivider, NotionText, NotionLabel }
