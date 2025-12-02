// =============================================================================
// TASKS VIEW — Global Tasks Dashboard
// =============================================================================
// Shows all tasks across all contacts with filtering and sorting.
// Tasks can be filtered by status and are sorted by due date.
// Contact names are clickable to navigate to their dossier.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Square, CheckCircle, Clock, Calendar,
  ArrowRight, Filter, AlertCircle, XCircle
} from 'lucide-react';
import { getAllTasks, updateTaskStatus } from '../../services/taskStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { Task, TaskStatus } from '../../types';

// --- PROPS ---

interface TasksViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
}

type StatusFilter = 'all' | TaskStatus;

// --- COMPONENT ---

export const TasksView: React.FC<TasksViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all tasks
  const allTasks = useMemo(() => getAllTasks(), [refreshKey]);

  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return allTasks;
    return allTasks.filter(t => t.status === statusFilter);
  }, [allTasks, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const open = allTasks.filter(t => t.status === 'open').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    return { total: allTasks.length, open, done, blocked };
  }, [allTasks]);

  // Handle marking task as done
  const handleMarkTaskDone = (taskId: string) => {
    updateTaskStatus(taskId, 'done');
    setRefreshKey(k => k + 1);
  };

  // Handle marking task as open (undo done)
  const handleMarkTaskOpen = (taskId: string) => {
    updateTaskStatus(taskId, 'open');
    setRefreshKey(k => k + 1);
  };

  // Handle contact click
  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

  // Format date
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

  const isDueUrgent = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  };

  const isOverdue = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Status badge styles
  const statusBadge = (status: TaskStatus) => {
    const styles: Record<TaskStatus, string> = {
      open: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      done: 'bg-green-500/20 text-green-400 border-green-500/30',
      blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status];
  };

  return (
    <div className="flex h-full bg-[#030412]">
      {/* Sidebar */}
      <div className="w-72 bg-[#0E0E0E] border-r border-[#2A2A2A] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={18} className="text-cyan-500" />
            <h2 className="font-display font-bold text-white">TASKS</h2>
          </div>
          <p className="text-[10px] text-gray-500">Manage tasks across all contacts</p>
        </div>

        {/* Filter Buttons */}
        <div className="p-4 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={12} className="text-gray-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter by Status</span>
          </div>
          <div className="space-y-1">
            {(['all', 'open', 'done', 'blocked'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-bold uppercase transition-colors ${
                  statusFilter === status
                    ? 'bg-[#4433FF] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                }`}
              >
                <span>{status}</span>
                <span className="text-[10px] opacity-60">
                  {status === 'all' ? stats.total : stats[status as TaskStatus]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 flex-1">
          <div className="space-y-3">
            <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <Square size={14} className="text-cyan-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Open</span>
              </div>
              <div className="text-3xl font-display font-bold text-cyan-400">{stats.open}</div>
            </div>

            <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Done</span>
              </div>
              <div className="text-3xl font-display font-bold text-green-400">{stats.done}</div>
            </div>

            <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={14} className="text-red-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Blocked</span>
              </div>
              <div className="text-3xl font-display font-bold text-red-400">{stats.blocked}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <h1 className="text-xl font-display font-bold text-white">
            {statusFilter === 'all' ? 'All Tasks' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Tasks`}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} • Sorted by due date
          </p>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CheckSquare size={48} className="text-gray-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-500 mb-2">No tasks found</h3>
              <p className="text-sm text-gray-600 max-w-sm">
                {statusFilter === 'all' 
                  ? 'Create tasks from contact dossiers to get started'
                  : `No ${statusFilter} tasks at the moment`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const taskContact = getContactById(task.contactId);
                if (!taskContact) return null;
                const isContactZeroTask = task.contactId === CONTACT_ZERO.id;

                return (
                  <div 
                    key={task.id}
                    className={`bg-[#0E0E0E] border rounded-lg p-4 transition-colors ${
                      task.status === 'done' 
                        ? 'border-[#2A2A2A] opacity-60' 
                        : isOverdue(task.dueAt)
                          ? 'border-red-500/30 hover:border-red-500/50'
                          : 'border-[#2A2A2A] hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => task.status === 'done' 
                          ? handleMarkTaskOpen(task.id) 
                          : handleMarkTaskDone(task.id)
                        }
                        className={`mt-1 transition-colors ${
                          task.status === 'done' 
                            ? 'text-green-500 hover:text-gray-400' 
                            : 'text-gray-500 hover:text-cyan-500'
                        }`}
                        title={task.status === 'done' ? 'Mark as open' : 'Mark as done'}
                      >
                        {task.status === 'done' ? <CheckCircle size={20} /> : <Square size={20} />}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p className={`text-sm font-medium ${
                          task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </p>

                        {/* Meta Row */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {/* Contact */}
                          <button
                            onClick={() => handleContactClick(taskContact.id)}
                            className="flex items-center gap-2 hover:bg-[#1A1A1D] rounded px-2 py-1 -ml-2 transition-colors group"
                          >
                            <img
                              src={taskContact.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${taskContact.id}`}
                              alt={taskContact.fullName}
                              className="w-5 h-5 rounded-full border border-[#333]"
                            />
                            <span className="text-xs text-[#4433FF] group-hover:text-white font-medium flex items-center gap-1">
                              {taskContact.fullName}
                              {isContactZeroTask && (
                                <span className="text-[9px] bg-[#4433FF]/20 text-[#4433FF] px-1 py-0.5 rounded">You</span>
                              )}
                              <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </button>

                          {/* Due Date */}
                          {task.dueAt && (
                            <div className={`flex items-center gap-1 text-xs ${
                              isOverdue(task.dueAt) && task.status !== 'done'
                                ? 'text-red-400'
                                : isDueUrgent(task.dueAt) && task.status !== 'done'
                                  ? 'text-orange-400'
                                  : 'text-gray-500'
                            }`}>
                              <Calendar size={12} />
                              {formatDueDate(task.dueAt)}
                            </div>
                          )}

                          {/* Status Badge */}
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${statusBadge(task.status)}`}>
                            {task.status}
                          </span>

                          {/* Created Date */}
                          <div className="flex items-center gap-1 text-xs text-gray-600">
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
    </div>
  );
};

