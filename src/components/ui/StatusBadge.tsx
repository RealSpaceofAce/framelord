// =============================================================================
// STATUS BADGE — Specialized badge for Want/Step status indicators
// =============================================================================
// Provides consistent styling for status values across the Wants module.
// Supports both dark mode (for dark chrome) and light mode (for NotionCard).
// =============================================================================

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Clock, Circle } from "lucide-react"
import type { WantStatus } from "@/services/wantStore"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The status value to display
   */
  status: WantStatus
  /**
   * Whether to show the status icon
   * @default true
   */
  showIcon?: boolean
  /**
   * Size variant
   * @default "default"
   */
  size?: "sm" | "default" | "lg"
  /**
   * Whether to use light mode styling (for white backgrounds)
   * @default false
   */
  light?: boolean
}

const statusConfig: Record<WantStatus, {
  label: string
  icon: React.ElementType
  darkStyles: string
  lightStyles: string
}> = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    darkStyles: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    lightStyles: "bg-gray-100 text-gray-600 border-gray-200",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    darkStyles: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    lightStyles: "bg-amber-100 text-amber-700 border-amber-200",
  },
  done: {
    label: "Done",
    icon: Check,
    darkStyles: "bg-green-500/20 text-green-400 border-green-500/30",
    lightStyles: "bg-green-100 text-green-700 border-green-200",
  },
}

const sizeConfig = {
  sm: {
    padding: "px-1.5 py-0.5",
    text: "text-[10px]",
    iconSize: 10,
  },
  default: {
    padding: "px-2 py-0.5",
    text: "text-xs",
    iconSize: 12,
  },
  lg: {
    padding: "px-3 py-1",
    text: "text-sm",
    iconSize: 14,
  },
}

/**
 * StatusBadge - Display Want/Step status with consistent styling.
 *
 * Usage:
 * ```tsx
 * <StatusBadge status="in_progress" />
 * <StatusBadge status="done" light size="sm" />
 * ```
 */
const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({
    className,
    status,
    showIcon = true,
    size = "default",
    light = false,
    ...props
  }, ref) => {
    const config = statusConfig[status]
    const sizeStyles = sizeConfig[size]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 rounded-md border font-medium",
          sizeStyles.padding,
          sizeStyles.text,
          light ? config.lightStyles : config.darkStyles,
          className
        )}
        {...props}
      >
        {showIcon && <Icon size={sizeStyles.iconSize} />}
        {config.label}
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusConfig }
