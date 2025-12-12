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
  Plus,
  X,
  User,
  ChevronDown,
} from 'lucide-react';
import { getAllTasks, updateTaskStatus, createTask } from '../../services/taskStore';
import { getContactById, getAllContacts, CONTACT_ZERO } from '../../services/contactStore';
import { Task, TaskStatus, Contact } from '../../types';
import { DatePicker } from '../DatePicker';

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

  // Task creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskContactId, setNewTaskContactId] = useState<string>(CONTACT_ZERO.id);
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | null>(null);
  const [isContactDropdownOpen, setIsContactDropdownOpen] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Get all tasks
  const allTasks = useMemo(() => getAllTasks(), [refreshKey]);

  // Get all contacts for picker
  const allContacts = useMemo(() => {
    const contacts = getAllContacts();
    // Filter by search query if any
    if (contactSearchQuery.trim()) {
      const query = contactSearchQuery.toLowerCase();
      return contacts.filter(c => c.fullName.toLowerCase().includes(query));
    }
    return contacts;
  }, [contactSearchQuery]);

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

  // Task creation handlers
  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;

    createTask({
      contactId: newTaskContactId,
      title: newTaskTitle.trim(),
      dueAt: newTaskDueDate,
    });

    // Reset form
    setNewTaskTitle('');
    setNewTaskContactId(CONTACT_ZERO.id);
    setNewTaskDueDate(null);
    setIsCreating(false);
    setRefreshKey(k => k + 1);
  };

  const handleCancelCreate = () => {
    setNewTaskTitle('');
    setNewTaskContactId(CONTACT_ZERO.id);
    setNewTaskDueDate(null);
    setIsCreating(false);
  };

  const handleSelectContact = (contactId: string) => {
    setNewTaskContactId(contactId);
    setIsContactDropdownOpen(false);
    setContactSearchQuery('');
  };

  // Get selected contact for display
  const selectedContact = getContactById(newTaskContactId);

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
          <div className="flex items-center gap-2">
            {stats.overdue > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-400 text-xs">
                <AlertCircle size={12} />
                {stats.overdue} overdue
              </div>
            )}
            {!isCreating && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: colors.accent, color: '#fff' }}
              >
                <Plus size={14} />
                New Task
              </button>
            )}
          </div>
        </div>

        {/* Task Creation Form */}
        {isCreating && (
          <div
            className="mb-4 p-4 rounded-lg border"
            style={{ background: colors.hover, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: colors.text }}>
                Create New Task
              </span>
              <button
                onClick={handleCancelCreate}
                className="p-1 rounded transition-colors"
                style={{ color: colors.textMuted }}
                onMouseEnter={(e) => { e.currentTarget.style.color = colors.text; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Title Input */}
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="w-full px-3 py-2 text-sm rounded-md outline-none border mb-3"
              style={{
                background: colors.bg,
                borderColor: colors.border,
                color: colors.text,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskTitle.trim()) {
                  handleCreateTask();
                }
                if (e.key === 'Escape') {
                  handleCancelCreate();
                }
              }}
            />

            {/* Contact Picker & Due Date Row */}
            <div className="flex items-center gap-3 mb-3">
              {/* Contact Picker */}
              <div className="relative flex-1">
                <button
                  onClick={() => setIsContactDropdownOpen(!isContactDropdownOpen)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left"
                  style={{
                    background: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                >
                  {selectedContact ? (
                    <>
                      <img
                        src={selectedContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedContact.id}`}
                        alt={selectedContact.fullName}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="flex-1 truncate">{selectedContact.fullName}</span>
                      {selectedContact.id === CONTACT_ZERO.id && (
                        <span
                          className="text-[9px] px-1 py-0.5 rounded"
                          style={{ background: `${colors.accent}20`, color: colors.accent }}
                        >
                          You
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <User size={14} style={{ color: colors.textMuted }} />
                      <span style={{ color: colors.textMuted }}>Select contact...</span>
                    </>
                  )}
                  <ChevronDown size={14} style={{ color: colors.textMuted }} />
                </button>

                {/* Contact Dropdown */}
                {isContactDropdownOpen && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1 rounded-md border shadow-lg z-50 max-h-48 overflow-y-auto"
                    style={{ background: colors.bg, borderColor: colors.border }}
                  >
                    <div className="p-2 border-b" style={{ borderColor: colors.border }}>
                      <input
                        type="text"
                        value={contactSearchQuery}
                        onChange={(e) => setContactSearchQuery(e.target.value)}
                        placeholder="Search contacts..."
                        autoFocus
                        className="w-full px-2 py-1.5 text-sm rounded outline-none"
                        style={{
                          background: colors.hover,
                          color: colors.text,
                        }}
                      />
                    </div>
                    {allContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors"
                        style={{ color: colors.text }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = colors.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <img
                          src={contact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.id}`}
                          alt={contact.fullName}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="flex-1 truncate">{contact.fullName}</span>
                        {contact.id === CONTACT_ZERO.id && (
                          <span
                            className="text-[9px] px-1 py-0.5 rounded"
                            style={{ background: `${colors.accent}20`, color: colors.accent }}
                          >
                            You
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date Picker */}
              <DatePicker
                value={newTaskDueDate}
                onChange={setNewTaskDueDate}
                placeholder="Due date (optional)"
                className="flex-1"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateTask}
              disabled={!newTaskTitle.trim()}
              className="w-full py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: newTaskTitle.trim() ? colors.accent : colors.border,
                color: newTaskTitle.trim() ? '#fff' : colors.textMuted,
              }}
            >
              Create Task
            </button>
          </div>
        )}

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
