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

// Stores
import { getContactById } from '@/services/contactStore';
import { logAutoInteraction } from '@/services/interactionStore';

// Card Components
import { PersonalIntelCard } from './PersonalIntelCard';
import { MiniGraphCard } from './MiniGraphCard';
import { PersonalityAndTestsCard } from './PersonalityAndTestsCard';
import { NextMoveCard } from './NextMoveCard';
import { CallAnalyzerCard } from './CallAnalyzerCard';
import { LogInteractionModal } from './LogInteractionModal';

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
  onNavigateToFrameScan?: () => void;
  onRefresh?: () => void;
  onNavigateToDossier?: (contactId: string) => void;
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
  disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0a111d] border border-[#1b2c45] rounded-lg transition-colors ${
      disabled
        ? 'text-gray-600 cursor-not-allowed opacity-50'
        : 'text-gray-300 hover:border-[#4433FF] hover:text-white'
    }`}
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
  onNavigateToFrameScan,
  onRefresh,
  onNavigateToDossier,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTab>('timeline');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const contact = getContactById(contactId);

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

  // Quick action handlers
  const handleCall = () => {
    if (!contact) return;

    // Log the interaction
    logAutoInteraction({
      contactId,
      type: 'call',
      direction: 'outbound',
      source: 'quick_action',
    });

    // Trigger the phone call
    if (contact.phone) {
      window.location.href = `tel:${contact.phone}`;
    }

    // Refresh timeline
    onRefresh?.();
  };

  const handleMessage = () => {
    if (!contact) return;

    // Log the interaction
    logAutoInteraction({
      contactId,
      type: 'message',
      direction: 'outbound',
      source: 'quick_action',
    });

    // Trigger SMS
    if (contact.phone) {
      window.location.href = `sms:${contact.phone}`;
    }

    // Refresh timeline
    onRefresh?.();
  };

  const handleEmail = () => {
    if (!contact) return;

    // Log the interaction
    logAutoInteraction({
      contactId,
      type: 'email',
      direction: 'outbound_draft',
      source: 'quick_action',
    });

    // Trigger mailto
    if (contact.email) {
      const subject = encodeURIComponent(`Regarding: ${contact.fullName}`);
      window.location.href = `mailto:${contact.email}?subject=${subject}`;
    }

    // Refresh timeline
    onRefresh?.();
  };

  const handleLogInteraction = () => {
    setIsLogModalOpen(true);
  };

  const handleFrameScan = () => {
    // If there's a navigation handler, use it
    if (onNavigateToFrameScan) {
      onNavigateToFrameScan();
    } else {
      // Otherwise just switch to the FrameScan tab
      setActiveTab('framescan');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Log Interaction Modal */}
      <LogInteractionModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        contactId={contactId}
        contactName={contact?.fullName || 'Contact'}
        onSuccess={() => {
          onRefresh?.();
          onLogInteraction?.();
        }}
      />

      {/* LEFT COLUMN - Tabbed Content */}
      <div className="lg:col-span-2 space-y-0">
        {/* Control Deck */}
        <div className="bg-[#0c1424]/80 border border-[#1b2c45] rounded-t-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ControlButton
              icon={<Phone size={14} />}
              label="Call"
              onClick={handleCall}
              disabled={!contact?.phone}
            />
            <ControlButton
              icon={<MessageSquare size={14} />}
              label="Message"
              onClick={handleMessage}
              disabled={!contact?.phone}
            />
            <ControlButton
              icon={<Mail size={14} />}
              label="Email"
              onClick={handleEmail}
              disabled={!contact?.email}
            />
            <ControlButton
              icon={<FileSignature size={14} />}
              label="Log"
              onClick={handleLogInteraction}
            />
            <ControlButton
              icon={<Scan size={14} />}
              label="FrameScan"
              onClick={handleFrameScan}
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
          onRefresh={onRefresh}
          onNavigateToTimeline={() => setActiveTab('timeline')}
        />

        {/* Mini Graph Card */}
        <MiniGraphCard
          contactId={contactId}
          plan={plan}
          onExpandClick={onNavigateToGraph}
          onNavigateToDossier={onNavigateToDossier}
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
          onLogInteraction={handleLogInteraction}
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
