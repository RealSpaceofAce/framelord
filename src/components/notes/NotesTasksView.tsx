// =============================================================================
// NOTES TASKS VIEW — Unified task list embedded in Notes module
// =============================================================================
// This component replaces the standalone TasksView for the canonical tasks
// experience. It lives inside the Notes module sidebar and uses the same
// taskStore as the rest of the app.
// =============================================================================

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  Calendar,
  ArrowRight,
  Filter,
  Search,
  AlertCircle,
} from 'lucide-react';
import { getAllTasks, updateTaskStatus } from '../../services/taskStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { Task, TaskStatus } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

interface NotesTasksViewProps {
  /** Callback when clicking a contact to view their dossier */
  onNavigateToContact?: (contactId: string) => void;
  /** Theme colors from parent Notes component */
  colors: {
    bg: string;
    sidebar: string;
    border: string;
    text: string;
    textMuted: string;
    hover: string;
    active: string;
    accent: string;
  };
}

type StatusFilter = 'all' | TaskStatus;

// =============================================================================
// COMPONENT
// =============================================================================

export const NotesTasksView: React.FC<NotesTasksViewProps> = ({
  onNavigateToContact,
  colors,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all tasks
  const allTasks = useMemo(() => getAllTasks(), [refreshKey]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let tasks = statusFilter === 'all'
      ? allTasks
      : allTasks.filter(t => t.status === statusFilter);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(task =>
        task.title.toLowerCase().includes(query)
      );
    }

    // Sort: open tasks first, then by due date, then by created date
    return tasks.sort((a, b) => {
      // Done tasks go to the bottom
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (a.status !== 'done' && b.status === 'done') return -1;

      // Then by due date (tasks with due dates first, then by date)
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);

      // Finally by created date
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [allTasks, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const open = allTasks.filter(t => t.status === 'open').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const overdue = allTasks.filter(t =>
      t.status === 'open' && t.dueAt && new Date(t.dueAt) < new Date()
    ).length;
    return { total: allTasks.length, open, done, blocked, overdue };
  }, [allTasks]);

  // Handlers
  const handleMarkTaskDone = (taskId: string) => {
    updateTaskStatus(taskId, 'done');
    setRefreshKey(k => k + 1);
  };

  const handleMarkTaskOpen = (taskId: string) => {
    updateTaskStatus(taskId, 'open');
    setRefreshKey(k => k + 1);
  };

  const handleContactClick = (contactId: string) => {
    onNavigateToContact?.(contactId);
  };

  // Date formatting
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDueDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue (${formatDate(dateStr)})`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due ${formatDate(dateStr)}`;
  };

  const isOverdue = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const filterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'done', label: 'Done' },
    { key: 'blocked', label: 'Blocked' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: colors.bg }}>
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: colors.text }}>
            Tasks
          </h2>
          {stats.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs">
              <AlertCircle size={12} />
              {stats.overdue} overdue
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: colors.textMuted }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none border"
            style={{
              background: colors.hover,
              borderColor: colors.border,
              color: colors.text,
            }}
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {filterButtons.map(({ key, label }) => {
            const count = key === 'all' ? stats.total : stats[key as TaskStatus];
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                style={{
                  background: statusFilter === key ? colors.accent : colors.hover,
                  color: statusFilter === key ? '#fff' : colors.textMuted,
                }}
              >
                {label}
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: statusFilter === key ? 'rgba(255,255,255,0.2)' : colors.border,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <CheckSquare size={48} style={{ color: colors.textMuted }} className="mb-4 opacity-50" />
            <h3 className="text-base font-semibold mb-2" style={{ color: colors.textMuted }}>
              {searchQuery ? 'No matching tasks' : 'No tasks found'}
            </h3>
            <p className="text-sm max-w-sm" style={{ color: colors.textMuted }}>
              {statusFilter === 'all'
                ? 'Create tasks from contact dossiers, Wants, or Little Lord to get started'
                : `No ${statusFilter} tasks at the moment`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const contact = getContactById(task.contactId);
              if (!contact) return null;
              const isContactZero = task.contactId === CONTACT_ZERO.id;

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border transition-colors"
                  style={{
                    background: colors.hover,
                    borderColor: task.status === 'done'
                      ? colors.border
                      : isOverdue(task.dueAt) && task.status !== 'done'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : colors.border,
                    opacity: task.status === 'done' ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() =>
                        task.status === 'done'
                          ? handleMarkTaskOpen(task.id)
                          : handleMarkTaskDone(task.id)
                      }
                      className="mt-0.5 transition-colors"
                      style={{
                        color: task.status === 'done' ? colors.accent : colors.textMuted,
                      }}
                      title={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                    >
                      {task.status === 'done' ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm"
                        style={{
                          color: task.status === 'done' ? colors.textMuted : colors.text,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Contact */}
                        <button
                          onClick={() => handleContactClick(contact.id)}
                          className="flex items-center gap-2 rounded px-2 py-1 -ml-2 transition-colors group"
                          style={{ background: 'transparent' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = colors.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <img
                            src={
                              contact.avatarUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`
                            }
                            alt={contact.fullName}
                            className="w-5 h-5 rounded-full border"
                            style={{ borderColor: colors.border }}
                          />
                          <span
                            className="text-xs font-medium flex items-center gap-1"
                            style={{ color: colors.accent }}
                          >
                            {contact.fullName}
                            {isContactZero && (
                              <span
                                className="text-[9px] px-1 py-0.5 rounded"
                                style={{
                                  background: `${colors.accent}20`,
                                  color: colors.accent,
                                }}
                              >
                                You
                              </span>
                            )}
                            <ArrowRight
                              size={10}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </span>
                        </button>

                        {/* Due Date */}
                        {task.dueAt && (
                          <div
                            className="flex items-center gap-1 text-xs"
                            style={{
                              color:
                                isOverdue(task.dueAt) && task.status !== 'done'
                                  ? '#ef4444'
                                  : colors.textMuted,
                            }}
                          >
                            <Calendar size={12} />
                            {formatDueDate(task.dueAt)}
                          </div>
                        )}

                        {/* Created Date */}
                        <div
                          className="flex items-center gap-1 text-xs"
                          style={{ color: colors.textMuted }}
                        >
                          <Clock size={10} />
                          Created {formatDate(task.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesTasksView;
