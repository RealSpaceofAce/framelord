// =============================================================================
// WANTS PAGE — Main page component with unified WantsBanner
// =============================================================================
// SIMPLIFIED NAVIGATION (post-refactor):
// - Board: 3-column Kanban of Wants by status
// - All Steps: Horizontal Wants columns with vertical Steps stacks
// - Progress: Summary stats and charts
// - Scope: List of Wants with scope summary → clicks go to WantDetailView
// - Detail: The true Want Dashboard (cover, steps, metrics, doctrine, iterations)
//
// REMOVED: want-scope as separate route - scope is now embedded in WantDetailView
// =============================================================================

import React, { useState, useEffect, useSyncExternalStore, useCallback, useMemo } from 'react';
import { WantBoardView } from './WantBoardView';
import { WantProgressView } from './WantProgressView';
import { WantDetailView } from './WantDetailView';
import { WantDetailPanel } from './WantDetailPanel';
import { GlobalStepsBoardView } from './GlobalStepsBoardView';
import { WantsBanner, NAV_TABS, type WantsViewMode } from './WantsBanner';
import { Sparkles } from 'lucide-react';
import CircularGallery from './ui/CircularGallery';
import { Target, AlertCircle, ChevronRight, FlaskConical, MessageSquare, BookOpen } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Separator } from '../ui/Separator';
import { ScrollArea } from '../ui/ScrollArea';
import { CongruencyBadge } from '../ui/CongruencyBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { seedDemoWantsAndScopes } from '../../dev/seedWants';
import { useLittleLord } from '../littleLord/LittleLordProvider';
import { cn } from '@/lib/utils';

// Default placeholder image for Wants without cover images
const DEFAULT_COVER_PLACEHOLDER = '/images-demo/people-7707981_640.jpg';
import {
  getAllWants,
  subscribe as wantSubscribe,
  getSnapshot as wantGetSnapshot,
  type Want,
} from '../../services/wantStore';
import {
  getScope,
  getCongruencyScore,
  isScopeInert,
  subscribe as scopeSubscribe,
  getSnapshot as scopeGetSnapshot,
} from '../../services/wantScopeStore';

// =============================================================================
// SCOPE LIST VIEW — Shows all Wants with their scope summary
// =============================================================================
// Clicking a row navigates to WantDetailView (not a separate want-scope page).
// This is the canonical entry point for viewing Want scope data.
// =============================================================================

interface ScopeListViewProps {
  /** Navigates to WantDetailView with scope section focused */
  onSelectWant: (wantId: string) => void;
}

const ScopeListView: React.FC<ScopeListViewProps> = ({ onSelectWant }) => {
  // Subscribe to both stores
  useSyncExternalStore(wantSubscribe, wantGetSnapshot);
  useSyncExternalStore(scopeSubscribe, scopeGetSnapshot);

  const wants = getAllWants();

  // Create a stable key based on actual content (not array reference)
  const galleryKey = useMemo(() => {
    return wants.map(w => `${w.id}:${w.coverImageUrl || ''}:${w.title}`).join('|');
  }, [wants]);

  // Memoize gallery items using the stable key
  const galleryItems = useMemo(() => {
    return wants.map((want) => ({
      image: want.coverImageUrl || DEFAULT_COVER_PLACEHOLDER,
      text: want.title,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryKey]);

  if (wants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Target size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Wants Yet</h3>
          <p className="text-sm text-muted-foreground">Create a Want to start tracking scope.</p>
        </div>
      </div>
    );
  }

  // Handle gallery item click
  const handleGalleryClick = (index: number) => {
    if (wants[index]) {
      onSelectWant(wants[index].id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Circular Gallery - Full screen experience */}
      {wants.length > 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative overflow-hidden rounded-xl border border-[#0043ff]/30 bg-[#0043ff]/5 w-full max-w-4xl h-[450px] cursor-pointer hover:border-[#0043ff]/50 transition-colors">
            <CircularGallery
              key={galleryKey}
              items={galleryItems}
              bend={2}
              textColor="#ffffff"
              borderRadius={0.08}
              font="bold 24px Figtree, system-ui"
              scrollSpeed={1.5}
              scrollEase={0.06}
              onItemClick={handleGalleryClick}
            />
            {/* Gallery hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#0043ff]/10 backdrop-blur-sm rounded-full text-xs text-muted-foreground border border-[#0043ff]/30">
              Drag to browse your Wants • Click to open
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Target size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Wants Yet</h3>
            <p className="text-sm text-muted-foreground">Create a Want to see it in the gallery.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// TYPES
// =============================================================================
// SIMPLIFIED: Removed 'want-scope' and 'want-progress' - scope is embedded in detail view

type ViewMode = 'board' | 'progress' | 'scope' | 'all-steps' | 'detail';

interface WantsPageRoute {
  view: ViewMode;
  wantId?: string;
  /** Optional section to scroll to in detail view (e.g., 'scope') */
  detailSection?: 'steps' | 'metrics' | 'scope';
}

interface WantsPageProps {
  initialWantId?: string;
  initialRoute?: WantsPageRoute;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
// SIMPLIFIED: No more scopeSubView toggle. Scope tab shows ScopeListView directly.
// Clicking any Want in Scope tab → WantDetailView with scope section focused.

export const WantsPage: React.FC<WantsPageProps> = ({ initialWantId, initialRoute }) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialRoute?.view || 'board');
  const [selectedWantId, setSelectedWantId] = useState<string | null>(
    initialRoute?.wantId || initialWantId || null
  );
  const [panelWantId, setPanelWantId] = useState<string | null>(null);
  // Track which section to focus when entering detail view from scope
  const [detailSection, setDetailSection] = useState<'steps' | 'metrics' | 'scope' | null>(
    initialRoute?.detailSection || null
  );

  // Little Lord integration
  const littleLord = useLittleLord();

  // Handle Talk to Little Lord from banner or detail view
  const handleTalkToLittleLord = useCallback((wantId?: string) => {
    littleLord.open(wantId ? 'want_detail' : 'wants_board', {
      activeWantId: wantId || undefined,
      suggestedPrompt: wantId
        ? 'Help me make progress on this Want.'
        : 'Help me clarify my Wants.',
    });
  }, [littleLord]);

  // Handle New Want creation via Little Lord (NEVER direct create)
  const handleNewWant = useCallback(() => {
    littleLord.open('wants_board', {
      wantCreation: true,
      suggestedPrompt: 'Help me define a new Want. What do I truly desire?',
    });
  }, [littleLord]);

  // Sync route when props change
  useEffect(() => {
    if (initialRoute) {
      setViewMode(initialRoute.view);
      if (initialRoute.wantId) {
        setSelectedWantId(initialRoute.wantId);
      }
    }
  }, [initialRoute]);

  // Convert banner view mode to internal view mode
  const handleViewChange = (bannerView: WantsViewMode) => {
    const viewMap: Record<WantsViewMode, ViewMode> = {
      'board': 'board',
      'progress': 'progress',
      'scope': 'scope',
      'all-steps': 'all-steps',
      'settings': 'board', // Placeholder
    };
    setViewMode(viewMap[bannerView]);
    setSelectedWantId(null);
    setPanelWantId(null);
    setDetailSection(null);
  };

  // Navigate to a specific route
  const navigateTo = (route: WantsPageRoute) => {
    setViewMode(route.view);
    setSelectedWantId(route.wantId || null);
    setPanelWantId(null);
    setDetailSection(route.detailSection || null);
  };

  // Handle selecting a want - opens panel instead of navigating
  const handleSelectWant = (wantId: string) => {
    setPanelWantId(wantId);
  };

  // Navigate to full detail view
  const handleNavigateToFullView = () => {
    if (panelWantId) {
      navigateTo({ view: 'detail', wantId: panelWantId });
    }
  };

  // Get active banner view from current viewMode
  const getActiveBannerView = (): WantsViewMode => {
    const viewMap: Record<ViewMode, WantsViewMode> = {
      'board': 'board',
      'progress': 'progress',
      'scope': 'scope',
      'all-steps': 'all-steps',
      'detail': 'board', // Detail shows "Board" as active since it's the entry point
    };
    return viewMap[viewMode] || 'board';
  };

  // Route: /wants/:wantId (detail view - THE WANT DASHBOARD)
  // This is the canonical detail page. Scope is embedded here, not a separate route.
  if (viewMode === 'detail' && selectedWantId) {
    return (
      <WantDetailView
        wantId={selectedWantId}
        onBack={() => navigateTo({ view: 'board' })}
        onTalkToLittleLord={(id) => handleTalkToLittleLord(id)}
        initialSection={detailSection || undefined}
      />
    );
  }

  // Route: /wants or /wants?view=board|progress|scope|all-steps
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Unified Banner with Aurora (title/subtitle only) */}
      <WantsBanner
        activeView={getActiveBannerView()}
        onViewChange={handleViewChange}
        showNav={false}
        showActions={false}
      />

      {/* Unified Control Bar: Nav Left | Actions Right */}
      <div className="px-6 py-3 border-b border-[#0043ff]/20 bg-[#0A0A0F] flex items-center justify-between">
        {/* Left: Navigation tabs */}
        <div className="flex items-center gap-1 bg-[#0E0E16] rounded-lg p-1 border border-[#0043ff]/20">
          {NAV_TABS.filter(tab => tab.id !== 'settings').map((tab) => {
            const Icon = tab.icon;
            const isActive = getActiveBannerView() === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleViewChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* DEV ONLY: Load Demo Data */}
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.removeItem('framelord_demo_seeded');
                const seeded = seedDemoWantsAndScopes();
                if (seeded) {
                  console.log('[Demo] Seeding complete, UI should update automatically');
                } else {
                  alert('Demo data already exists. Refresh the page to clear in-memory state, then try again.');
                }
              }}
              className="gap-2 text-purple-400 border-purple-600/30 hover:bg-purple-600/10"
            >
              <FlaskConical size={14} />
              Load Demo Data
            </Button>
          )}

          {/* New Want (via Little Lord) */}
          <Button
            variant="brand"
            size="sm"
            onClick={handleNewWant}
            className="gap-1.5"
            title="New Wants are created through Little Lord to ensure they're real Wants, not Shoulds"
          >
            <Sparkles size={14} />
            New Want
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'board' && (
          <WantBoardView onSelectWant={handleSelectWant} onNewWant={handleNewWant} />
        )}
        {viewMode === 'progress' && (
          <WantProgressView onSelectWant={handleSelectWant} />
        )}
        {viewMode === 'all-steps' && (
          <GlobalStepsBoardView onNavigateToWant={(wantId) => navigateTo({ view: 'detail', wantId })} />
        )}
        {viewMode === 'scope' && (
          // SIMPLIFIED: No sub-toggle. Scope shows list of Wants with scope summary.
          // Clicking any Want navigates to WantDetailView with scope section focused.
          <ScopeListView
            onSelectWant={(wantId) => navigateTo({
              view: 'detail',
              wantId,
              detailSection: 'scope'
            })}
          />
        )}
      </div>

      {/* Detail Panel (slide-out sheet) */}
      {panelWantId && (
        <WantDetailPanel
          wantId={panelWantId}
          isOpen={!!panelWantId}
          onClose={() => setPanelWantId(null)}
          onNavigateToFullView={handleNavigateToFullView}
        />
      )}
    </div>
  );
};

export default WantsPage;
