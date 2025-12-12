// =============================================================================
// DOSSIER TWO-COLUMN LAYOUT — Tabbed layout wrapper for Contact Dossier
// =============================================================================
// Provides the two-column layout structure for the Contact Dossier view:
// - Left column: Tabbed interface (Timeline, Notes, Tasks, FrameScan)
// - Right column: Card stack (Intel, Graph, Personality, NextMove, CallAnalyzer)
// =============================================================================

import React, { useState } from 'react';
import {
  Clock,
  FileText,
  CheckSquare,
  Scan,
  Phone,
  MessageSquare,
  Mail,
  FileSignature,
} from 'lucide-react';

// Plan Config
import {
  type PlanTier,
  getCurrentUserPlan,
  canUseFeature,
} from '@/config/planConfig';

// Card Components
import { PersonalIntelCard } from './PersonalIntelCard';
import { MiniGraphCard } from './MiniGraphCard';
import { PersonalityAndTestsCard } from './PersonalityAndTestsCard';
import { NextMoveCard } from './NextMoveCard';
import { CallAnalyzerCard } from './CallAnalyzerCard';

// Types
type DossierTab = 'timeline' | 'notes' | 'tasks' | 'framescan';

interface DossierTwoColumnLayoutProps {
  contactId: string;
  plan?: PlanTier;
  // Tab content render props
  renderTimeline: () => React.ReactNode;
  renderNotes: () => React.ReactNode;
  renderTasks: () => React.ReactNode;
  renderFrameScan: () => React.ReactNode;
  // Action handlers
  onCreateTask?: (title: string) => void;
  onLogInteraction?: () => void;
  onNavigateToGraph?: () => void;
  onExpandPersonality?: () => void;
  onUploadCall?: () => void;
  onExpandCalls?: () => void;
}

/**
 * Tab Button Component
 */
const TabButton: React.FC<{
  tab: DossierTab;
  activeTab: DossierTab;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ tab, activeTab, icon, label, onClick }) => {
  const isActive = tab === activeTab;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
        isActive
          ? 'text-white border-[#4433FF] bg-[#4433FF]/10'
          : 'text-gray-400 border-transparent hover:text-white hover:bg-[#1b2c45]/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
};

/**
 * Control Deck Button
 */
const ControlButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-300 bg-[#0a111d] border border-[#1b2c45] rounded-lg hover:border-[#4433FF] hover:text-white transition-colors"
  >
    {icon}
    {label}
  </button>
);

/**
 * Dossier Two-Column Layout Component
 */
export const DossierTwoColumnLayout: React.FC<DossierTwoColumnLayoutProps> = ({
  contactId,
  plan = getCurrentUserPlan(),
  renderTimeline,
  renderNotes,
  renderTasks,
  renderFrameScan,
  onCreateTask,
  onLogInteraction,
  onNavigateToGraph,
  onExpandPersonality,
  onUploadCall,
  onExpandCalls,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('timeline');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return renderTimeline();
      case 'notes':
        return renderNotes();
      case 'tasks':
        return renderTasks();
      case 'framescan':
        return renderFrameScan();
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT COLUMN - Tabbed Content */}
      <div className="lg:col-span-2 space-y-0">
        {/* Control Deck */}
        <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-t-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ControlButton
              icon={<Phone size={14} />}
              label="Call"
              onClick={() => {}}
            />
            <ControlButton
              icon={<MessageSquare size={14} />}
              label="Message"
              onClick={() => {}}
            />
            <ControlButton
              icon={<Mail size={14} />}
              label="Email"
              onClick={() => {}}
            />
            <ControlButton
              icon={<FileSignature size={14} />}
              label="Log"
              onClick={onLogInteraction}
            />
            <ControlButton
              icon={<Scan size={14} />}
              label="FrameScan"
              onClick={() => setActiveTab('framescan')}
            />
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-[#0c1424]/80 border-x border-[#1b2c45] flex overflow-x-auto">
          <TabButton
            tab="timeline"
            activeTab={activeTab}
            icon={<Clock size={14} />}
            label="Timeline"
            onClick={() => setActiveTab('timeline')}
          />
          <TabButton
            tab="notes"
            activeTab={activeTab}
            icon={<FileText size={14} />}
            label="Notes"
            onClick={() => setActiveTab('notes')}
          />
          <TabButton
            tab="tasks"
            activeTab={activeTab}
            icon={<CheckSquare size={14} />}
            label="Tasks"
            onClick={() => setActiveTab('tasks')}
          />
          <TabButton
            tab="framescan"
            activeTab={activeTab}
            icon={<Scan size={14} />}
            label="FrameScan"
            onClick={() => setActiveTab('framescan')}
          />
        </div>

        {/* Tab Content */}
        <div className="bg-[#0c1424]/80 border border-t-0 border-[#1b2c45] rounded-b-xl min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>

      {/* RIGHT COLUMN - Card Stack */}
      <div className="space-y-4">
        {/* Personal Intel Card */}
        <PersonalIntelCard
          contactId={contactId}
          tier={plan as any}
        />

        {/* Mini Graph Card */}
        <MiniGraphCard
          contactId={contactId}
          plan={plan}
          onExpandClick={onNavigateToGraph}
        />

        {/* Personality & Tests Card */}
        <PersonalityAndTestsCard
          contactId={contactId}
          plan={plan}
          onExpandClick={onExpandPersonality}
        />

        {/* Next Move Card */}
        <NextMoveCard
          contactId={contactId}
          tier={plan as any}
          onCreateTask={onCreateTask}
          onLogInteraction={onLogInteraction}
        />

        {/* Call Analyzer Card */}
        <CallAnalyzerCard
          contactId={contactId}
          plan={plan}
          onExpandClick={onExpandCalls}
          onUploadCall={onUploadCall}
        />
      </div>
    </div>
  );
};

export default DossierTwoColumnLayout;
