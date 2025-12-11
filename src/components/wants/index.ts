// =============================================================================
// WANTS MODULE — Export all Want components
// =============================================================================

export { WantBoardView } from './WantBoardView';
export { WantProgressView } from './WantProgressView';
export { WantSuccessTrackingView } from './WantSuccessTrackingView';
export { WantScopeView } from './WantScopeView';
export { WantDetailView } from './WantDetailView';
export { WantDetailPanel } from './WantDetailPanel';
export { WantsPage } from './WantsPage';
export { WantTrackingBoard } from './WantTrackingBoard';
export { ConfigureWantsPanel } from './ConfigureWantsPanel';

// Route types for external navigation
export type WantsViewMode = 'board' | 'progress' | 'scope' | 'detail' | 'want-progress' | 'want-scope';
export interface WantsPageRoute {
  view: WantsViewMode;
  wantId?: string;
}
