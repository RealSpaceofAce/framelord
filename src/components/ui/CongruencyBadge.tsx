// =============================================================================
// CONGRUENCY BADGE — Color-coded score display for Wants
// =============================================================================
// Displays congruency scores with semantic coloring.
// Supports both dark mode (for dark chrome) and light mode (for NotionCard).
// =============================================================================

import * as React from "react"
import { cn } from "@/lib/utils"
import { Target } from "lucide-react"

export interface CongruencyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Congruency score (0-100)
   */
  score: number
  /**
   * Whether to show the label
   * @default false
   */
  showLabel?: boolean
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

const getScoreStyles = (score: number, light: boolean) => {
  if (score >= 70) {
    return light
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-green-500/20 text-green-400 border-green-500/30"
  }
  if (score >= 40) {
    return light
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-amber-500/20 text-amber-400 border-amber-500/30"
  }
  return light
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-red-500/20 text-red-400 border-red-500/30"
}

const getScoreColor = (score: number, light: boolean) => {
  if (score >= 70) return light ? "text-green-700" : "text-green-400"
  if (score >= 40) return light ? "text-amber-700" : "text-amber-400"
  return light ? "text-red-700" : "text-red-400"
}

const sizeConfig = {
  sm: {
    padding: "px-1.5 py-0.5",
    text: "text-xs",
    scoreText: "text-sm font-bold",
    iconSize: 10,
  },
  default: {
    padding: "px-2 py-1",
    text: "text-xs",
    scoreText: "text-lg font-bold",
    iconSize: 12,
  },
  lg: {
    padding: "px-3 py-1.5",
    text: "text-sm",
    scoreText: "text-2xl font-bold",
    iconSize: 14,
  },
}

/**
 * CongruencyBadge - Display congruency score with semantic coloring.
 *
 * Usage:
 * ```tsx
 * <CongruencyBadge score={75} />
 * <CongruencyBadge score={45} showLabel light />
 * ```
 */
const CongruencyBadge = React.forwardRef<HTMLDivElement, CongruencyBadgeProps>(
  ({
    className,
    score,
    showLabel = false,
    size = "default",
    light = false,
    ...props
  }, ref) => {
    const sizeStyles = sizeConfig[size]
    const scoreStyles = getScoreStyles(score, light)

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          className
        )}
        {...props}
      >
        {showLabel && (
          <span className={cn(
            sizeStyles.text,
            light ? "text-gray-500" : "text-gray-500"
          )}>
            Congruency
          </span>
        )}
        <div className={cn(
          "inline-flex items-center gap-1 rounded-md border font-medium",
          sizeStyles.padding,
          scoreStyles
        )}>
          <Target size={sizeStyles.iconSize} />
          <span className={sizeStyles.scoreText}>{score}</span>
        </div>
      </div>
    )
  }
)
CongruencyBadge.displayName = "CongruencyBadge"

/**
 * CongruencyScore - Simple score display (just the number)
 */
const CongruencyScore = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    score: number
    size?: "sm" | "default" | "lg"
    light?: boolean
  }
>(({ className, score, size = "default", light = false, ...props }, ref) => {
  const sizeStyles = sizeConfig[size]

  return (
    <span
      ref={ref}
      className={cn(
        sizeStyles.scoreText,
        getScoreColor(score, light),
        className
      )}
      {...props}
    >
      {score}
    </span>
  )
})
CongruencyScore.displayName = "CongruencyScore"

export { CongruencyBadge, CongruencyScore, getScoreColor, getScoreStyles }
