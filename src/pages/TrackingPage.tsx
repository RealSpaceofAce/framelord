// =============================================================================
// TRACKING PAGE — Standalone daily metrics tracking
// =============================================================================
// A clean, dedicated page for daily habit/metrics tracking.
// Separated from Wants to have its own space in the app.
// =============================================================================

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  TrendingUp,
  Settings,
  Plus,
  Target,
  Flame,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { WantTrackingBoard } from '../components/wants/WantTrackingBoard';
import { ConfigureWantsPanel } from '../components/wants/ConfigureWantsPanel';
import * as wantTrackingStore from '../services/wantTrackingStore';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface TrackingPageProps {
  theme?: 'light' | 'gray' | 'dark';
}

export const TrackingPage: React.FC<TrackingPageProps> = ({ theme = 'dark' }) => {
  const [showConfigurePanel, setShowConfigurePanel] = useState(false);

  // Subscribe to store for metrics count
  useSyncExternalStore(
    wantTrackingStore.subscribe,
    wantTrackingStore.getSnapshot
  );

  // Seed default metrics on first render if empty
  useEffect(() => {
    wantTrackingStore.seedDefaultMetrics();
  }, []);

  const metrics = wantTrackingStore.getActiveMetrics();
  const selectedMonth = wantTrackingStore.getSelectedMonth();

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0A0F]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1f2023]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Tracking</h1>
              <p className="text-sm text-gray-400">Daily metrics & habits</p>
            </div>
          </div>

          {/* Stats summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1f2023] border border-[#2d2f36]">
              <Target size={14} className="text-indigo-400" />
              <span className="text-sm text-gray-300">{metrics.length} metrics</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1f2023] border border-[#2d2f36]">
              <Calendar size={14} className="text-indigo-400" />
              <span className="text-sm text-gray-300">{formatMonth(selectedMonth)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - The tracking board */}
      <div className="flex-1 overflow-hidden">
        <WantTrackingBoard
          theme={theme}
          onConfigureMetrics={() => setShowConfigurePanel(true)}
        />
      </div>

      {/* Configure Panel */}
      {showConfigurePanel && (
        <ConfigureWantsPanel
          isOpen={showConfigurePanel}
          onClose={() => setShowConfigurePanel(false)}
        />
      )}
    </div>
  );
};

export default TrackingPage;
