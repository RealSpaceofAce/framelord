// =============================================================================
// WANTS BANNER — Unified header for all Wants-related pages
// =============================================================================
// Features:
// - ReactBits Aurora animated background
// - Large title + subtitle
// - Navigation tabs: Board, All Wants, Progress, Scope, Settings
// - Theme-aware styling (dark/light mode)
// - Little Lord and New Want actions
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  TrendingUp,
  Crosshair,
  Layers,
  Settings,
  Sparkles,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { Aurora } from '../ui/Aurora';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export type WantsViewMode = 'board' | 'progress' | 'scope' | 'all-steps' | 'settings';

interface WantsBannerProps {
  /** Currently active view */
  activeView: WantsViewMode;
  /** Callback when view changes */
  onViewChange: (view: WantsViewMode) => void;
  /** Callback when "New Want" is clicked (opens Little Lord for guided creation) */
  onNewWant?: () => void;
  /** Optional compact mode for detail views */
  compact?: boolean;
  /** Optional custom title (for detail views) */
  customTitle?: string;
  /** Optional custom subtitle */
  customSubtitle?: string;
  /** Whether to show the navigation tabs */
  showNav?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
}

// =============================================================================
// NAV TABS CONFIG
// =============================================================================

interface NavTab {
  id: WantsViewMode;
  label: string;
  icon: React.ElementType;
}

const NAV_TABS: NavTab[] = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'all-steps', label: 'All Wants', icon: Layers },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'scope', label: 'Scope', icon: Crosshair },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const WantsBanner: React.FC<WantsBannerProps> = ({
  activeView,
  onViewChange,
  onNewWant,
  compact = false,
  customTitle,
  customSubtitle,
  showNav = true,
  showActions = true,
}) => {
  return (
    <Aurora
      colorStops={['#2B1AFF', '#4433FF', '#3322EE']}
      amplitude={compact ? 0.6 : 1.4}
      blend={0.6}
      speed={0.4}
      className={cn(
        "relative",
        compact ? "py-12" : "py-20",
        "bg-gradient-to-b from-[#050508] via-[#080810] to-[#0A0A0F]",
        "border-b border-border/50"
      )}
    >
      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Title and Navigation Row */}
        <MotionDiv
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-start justify-between gap-4"
        >
          {/* Left: Title */}
          <div className={compact ? "mb-0" : "mb-4"}>
            <h1
              className={cn(
                "font-bold tracking-tight text-foreground",
                compact ? "text-xl" : "text-3xl"
              )}
            >
              {customTitle || 'WANTS'}
            </h1>
            {!compact && (
              <p className="text-sm text-muted-foreground mt-1">
                {customSubtitle || 'Declare. Align. Advance.'}
              </p>
            )}
          </div>

          {/* Right: Navigation + Actions aligned together */}
          <div className="flex items-center gap-4">
            {/* Navigation tabs */}
            {showNav && (
              <MotionDiv
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-lg p-1 border border-border">
                  {NAV_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeView === tab.id;
                    const isDisabled = tab.id === 'settings'; // Placeholder

                    return (
                      <button
                        key={tab.id}
                        onClick={() => !isDisabled && onViewChange(tab.id)}
                        disabled={isDisabled}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                          isDisabled && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        <Icon size={14} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </MotionDiv>
            )}

            {/* Action button - aligned with nav */}
            {showActions && onNewWant && (
              <Button
                variant="brand"
                size={compact ? 'sm' : 'default'}
                onClick={onNewWant}
                className="gap-1.5 shrink-0"
                title="New Wants are created through Little Lord to ensure they're real Wants, not Shoulds"
              >
                <Sparkles size={compact ? 14 : 16} />
                <span className={compact ? 'hidden sm:inline' : ''}>
                  New Want
                </span>
              </Button>
            )}
          </div>
        </MotionDiv>
      </div>

      {/* Gradient overlay for smooth blending to background */}
      <div
        className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
      />
    </Aurora>
  );
};

// =============================================================================
// COMPACT VARIANT FOR DETAIL VIEWS
// =============================================================================

interface WantsBannerCompactProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onTalkToLittleLord?: () => void;
}

export const WantsBannerCompact: React.FC<WantsBannerCompactProps> = ({
  title,
  subtitle,
  onBack,
  onTalkToLittleLord,
}) => {
  return (
    <Aurora
      colorStops={['#2B1AFF', '#4433FF', '#3322EE']}
      amplitude={1.0}
      blend={0.6}
      speed={0.4}
      className="py-16 bg-gradient-to-b from-[#050508] via-[#080810] to-[#0A0A0F] border-b border-border/50"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-1 max-w-lg mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          {onTalkToLittleLord && (
            <Button
              variant="brand-outline"
              size="default"
              onClick={onTalkToLittleLord}
              className="gap-1.5"
            >
              <Sparkles size={14} />
              Little Lord
            </Button>
          )}
        </div>
      </div>

      {/* Gradient overlay for smooth blending */}
      <div
        className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"
      />
    </Aurora>
  );
};

export default WantsBanner;
