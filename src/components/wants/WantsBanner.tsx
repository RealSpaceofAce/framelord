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
  CalendarCheck,
} from 'lucide-react';
import { Aurora } from '../ui/Aurora';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export type WantsViewMode = 'board' | 'tracking' | 'progress' | 'scope' | 'all-steps' | 'settings';

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

export const NAV_TABS: NavTab[] = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'tracking', label: 'Tracking', icon: CalendarCheck },
  { id: 'all-steps', label: 'All Wants', icon: Layers },
  { id: 'progress', label: 'Progress', icon: TrendingUp },
  { id: 'scope', label: 'Scope', icon: Crosshair },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export type { NavTab };

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
      amplitude={1.5}
      blend={0.8}
      speed={0.6}
      className={cn(
        "relative w-full",
        "min-h-[250px]",
        "bg-gradient-to-b from-[#050508] via-[#080810] to-[#0A0A0F]",
        "border-b border-border/50"
      )}
    >
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
      amplitude={1.2}
      blend={0.7}
      speed={0.5}
      className="min-h-[250px] bg-gradient-to-b from-[#050508] via-[#080810] to-[#0A0A0F] border-b border-border/50"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8">
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
