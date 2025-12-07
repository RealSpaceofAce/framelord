// =============================================================================
// RIGHT SIDEBAR — Tabbed interface for Notes (AFFiNE-style)
// =============================================================================
// Complete redesign with 6 tabs:
// 1. AI (✨) - LittleLord chat
// 2. TOC (📋) - Table of Contents
// 3. Calendar (📅) - Journal calendar + entries
// 4. Outline (☰) - Document outline
// 5. Frames (🔲) - Edgeless frames/presentation
// 6. Comments (💬) - Document comments
//
// IMPORTANT: NO gray overlay, sidebar sits alongside content
// =============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Sparkles,
  List,
  Calendar,
  Menu,
  Grid3X3,
  MessageCircle,
} from 'lucide-react';
import { AITab } from './RightSidebarTabs/AITab';
import { TOCTab } from './RightSidebarTabs/TOCTab';
import { CalendarTab } from './RightSidebarTabs/CalendarTab';
import { OutlineTab } from './RightSidebarTabs/OutlineTab';
import { FramesTab } from './RightSidebarTabs/FramesTab';
import { CommentsTab } from './RightSidebarTabs/CommentsTab';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

export type RightSidebarTab = 'ai' | 'toc' | 'calendar' | 'outline' | 'frames' | 'comments';

export interface RightSidebarProps {
  /** Whether sidebar is open */
  isOpen: boolean;
  /** Active tab */
  activeTab: RightSidebarTab;
  /** Tab change handler */
  onTabChange: (tab: RightSidebarTab) => void;
  /** Close handler */
  onClose: () => void;
  /** Theme */
  theme: 'light' | 'gray' | 'dark';
  /** Theme colors */
  colors: Record<string, string>;

  // Props for child tabs
  /** Current note ID (for AI context) */
  noteId?: string;
  /** Current note content (for AI, TOC, Outline) */
  noteContent?: string;
  /** Journal dates for calendar */
  journalDates?: string[];
  /** Tenant ID */
  tenantId?: string;
  /** User ID */
  userId?: string;
  /** Callback to insert text into editor */
  onInsert?: (text: string) => void;
  /** Callback when new note created */
  onNoteCreated?: (noteId: string) => void;
  /** Callback to switch to edgeless mode */
  onSwitchToEdgeless?: () => void;
  /** Callback to navigate to a note */
  onNavigateToNote?: (noteId: string) => void;
  /** Callback when journal date selected */
  onJournalDateSelect?: (date: Date) => void;
}

// =============================================================================
// TAB DEFINITIONS
// =============================================================================

interface TabDefinition {
  id: RightSidebarTab;
  icon: React.ReactNode;
  label: string;
  title: string;
}

const TABS: TabDefinition[] = [
  { id: 'ai', icon: <Sparkles size={16} />, label: 'AI', title: 'AI Assistant' },
  { id: 'toc', icon: <List size={16} />, label: 'TOC', title: 'Table of Contents' },
  { id: 'calendar', icon: <Calendar size={16} />, label: 'Calendar', title: 'Calendar & Journals' },
  { id: 'outline', icon: <Menu size={16} />, label: 'Outline', title: 'Document Outline' },
  { id: 'frames', icon: <Grid3X3 size={16} />, label: 'Frames', title: 'Edgeless Frames' },
  { id: 'comments', icon: <MessageCircle size={16} />, label: 'Comments', title: 'Comments' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  onClose,
  theme,
  colors,
  noteId,
  noteContent,
  journalDates = [],
  tenantId = 'default',
  userId,
  onInsert,
  onNoteCreated,
  onSwitchToEdgeless,
  onNavigateToNote,
  onJournalDateSelect,
}) => {
  if (!isOpen) return null;

  const activeTabDef = TABS.find(t => t.id === activeTab);

  return (
    <MotionDiv
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 flex-shrink-0 border-l flex flex-col overflow-hidden"
      style={{
        background: colors.sidebar,
        borderColor: colors.border,
      }}
    >
      {/* Tab Bar */}
      <div
        className="flex items-center border-b px-2 py-2 gap-1"
        style={{ borderColor: colors.border }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="p-2 rounded transition-colors"
            style={{
              background: activeTab === tab.id ? colors.hover : 'transparent',
              color: activeTab === tab.id ? colors.accent : colors.textMuted,
            }}
            title={tab.title}
          >
            {tab.icon}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-2 rounded transition-colors"
          style={{ color: colors.textMuted }}
          title="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'ai' && (
          <AITab
            noteId={noteId}
            noteContent={noteContent}
            theme={theme}
            colors={colors}
            tenantId={tenantId}
            userId={userId}
            onInsert={onInsert}
            onNoteCreated={onNoteCreated}
            onSwitchToEdgeless={onSwitchToEdgeless}
          />
        )}
        {activeTab === 'toc' && (
          <TOCTab
            noteContent={noteContent}
            theme={theme}
            colors={colors}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            journalDates={journalDates}
            theme={theme}
            colors={colors}
            onDateSelect={onJournalDateSelect}
            onNavigateToNote={onNavigateToNote}
          />
        )}
        {activeTab === 'outline' && (
          <OutlineTab
            noteContent={noteContent}
            theme={theme}
            colors={colors}
          />
        )}
        {activeTab === 'frames' && (
          <FramesTab
            theme={theme}
            colors={colors}
          />
        )}
        {activeTab === 'comments' && (
          <CommentsTab
            noteId={noteId}
            theme={theme}
            colors={colors}
          />
        )}
      </div>
    </MotionDiv>
  );
};

export default RightSidebar;
