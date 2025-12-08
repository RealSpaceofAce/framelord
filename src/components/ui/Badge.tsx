// =============================================================================
// BADGE COMPONENT — shadcn-ui pattern with variants
// =============================================================================
// Local implementation following shadcn patterns.
// Provides semantic variants for status indicators.
// =============================================================================

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Custom variants for Wants module
        success:
          "border-transparent bg-green-500/20 text-green-400 border border-green-500/30",
        warning:
          "border-transparent bg-amber-500/20 text-amber-400 border border-amber-500/30",
        danger:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        info:
          "border-transparent bg-blue-500/20 text-blue-400 border border-blue-500/30",
        muted:
          "border-transparent bg-gray-500/20 text-gray-400 border border-gray-500/30",
        // Notion-style light variants (for white backgrounds)
        "success-light":
          "border-transparent bg-green-100 text-green-700 border border-green-200",
        "warning-light":
          "border-transparent bg-amber-100 text-amber-700 border border-amber-200",
        "danger-light":
          "border-transparent bg-red-100 text-red-700 border border-red-200",
        "info-light":
          "border-transparent bg-blue-100 text-blue-700 border border-blue-200",
        "muted-light":
          "border-transparent bg-gray-100 text-gray-600 border border-gray-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
