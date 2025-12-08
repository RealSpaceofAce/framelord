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
import { WantsBanner, type WantsViewMode } from './WantsBanner';
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
const DEFAULT_COVER_PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="50%" style="stop-color:#16213e"/>
      <stop offset="100%" style="stop-color:#0f3460"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#4433FF" font-size="48" font-family="system-ui" opacity="0.2">WANT</text>
</svg>
`);
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

  // Memoize gallery items to prevent re-renders
  const galleryItems = useMemo(() => {
    return wants.map((want) => ({
      image: want.coverImageUrl || DEFAULT_COVER_PLACEHOLDER,
      text: want.title,
    }));
  }, [wants]);

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

  return (
    <div className="h-full flex flex-col">
      {/* Circular Gallery Header */}
      {wants.length > 0 && (
        <div className="shrink-0 px-6 pt-6">
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 h-[320px]">
            <CircularGallery
              items={galleryItems}
              bend={2}
              textColor="#ffffff"
              borderRadius={0.08}
              font="bold 20px Figtree, system-ui"
              scrollSpeed={1.5}
              scrollEase={0.06}
            />
            {/* Gallery hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-background/80 backdrop-blur-sm rounded-full text-[10px] text-muted-foreground">
              Drag to browse
            </div>
          </div>
        </div>
      )}

      {/* List View */}
      <ScrollArea className="flex-1 mt-4">
        <div className="p-6 pt-2 max-w-3xl mx-auto space-y-3">
        {wants.map((want, index) => {
          const scope = getScope(want.id);
          const congruency = getCongruencyScore(want.id);
          const isInert = isScopeInert(want.id);
          const iterationCount = scope?.iterationEntries.length || 0;
          const doctrineNotes = scope?.doctrineNotes.length || 0;
          const stepsCount = want.steps.length;
          const completedSteps = want.steps.filter(s => s.status === 'done').length;

          return (
            <React.Fragment key={want.id}>
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50 group",
                  "bg-card border-border"
                )}
                onClick={() => onSelectWant(want.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-foreground truncate">{want.title}</h3>
                        <StatusBadge status={want.status} size="sm" />
                        {isInert && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0.5">
                            <AlertCircle size={10} className="mr-1" />
                            Inert
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {scope?.objective || want.reason || 'No objective set'}
                      </p>
                      {/* Summary line */}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {completedSteps}/{stepsCount} steps • {iterationCount} iterations • {doctrineNotes} notes
                      </p>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      <CongruencyBadge score={congruency} size="default" />

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="text-center" title="Iteration entries">
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <MessageSquare size={10} className="text-muted-foreground" />
                            {iterationCount}
                          </div>
                        </div>
                        <div className="text-center" title="Doctrine notes">
                          <div className="flex items-center gap-1 text-foreground font-medium">
                            <BookOpen size={10} className="text-muted-foreground" />
                            {doctrineNotes}
                          </div>
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              {index < wants.length - 1 && <Separator className="bg-border/50" />}
            </React.Fragment>
          );
        })}
        </div>
      </ScrollArea>
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
      {/* Unified Banner with Aurora */}
      {/* DOCTRINE: Only one action at the global level - New Want (via Little Lord) */}
      <WantsBanner
        activeView={getActiveBannerView()}
        onViewChange={handleViewChange}
        onNewWant={handleNewWant}
      />

      {/* DEV ONLY: demo data seeding */}
      {import.meta.env.DEV && (
        <div className="px-6 py-2 border-b border-border flex items-center gap-2">
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
        </div>
      )}

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
