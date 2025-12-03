// =============================================================================
// TASKS VIEW — Redesigned to match NotesView style
// =============================================================================

import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, Square, Clock, Calendar,
  ArrowRight, Filter, Search, Mic, Pencil, FileText, Map, Notebook
} from 'lucide-react';
import { getAllTasks, updateTaskStatus } from '../../services/taskStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { Task, TaskStatus } from '../../types';

interface TasksViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
  onNavigateToNotes?: () => void;
}

type StatusFilter = 'all' | TaskStatus;

export const TasksView: React.FC<TasksViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier,
  onNavigateToNotes,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allTasks = useMemo(() => getAllTasks(), [refreshKey]);

  const filteredTasks = useMemo(() => {
    let tasks = statusFilter === 'all' ? allTasks : allTasks.filter(t => t.status === statusFilter);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      tasks = tasks.filter(task => 
        task.title.toLowerCase().includes(query)
      );
    }
    
    return tasks;
  }, [allTasks, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const open = allTasks.filter(t => t.status === 'open').length;
    const done = allTasks.filter(t => t.status === 'done').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    return { total: allTasks.length, open, done, blocked };
  }, [allTasks]);

  const handleMarkTaskDone = (taskId: string) => {
    updateTaskStatus(taskId, 'done');
    setRefreshKey(k => k + 1);
  };

  const handleMarkTaskOpen = (taskId: string) => {
    updateTaskStatus(taskId, 'open');
    setRefreshKey(k => k + 1);
  };

  const handleContactClick = (contactId: string) => {
    setSelectedContactId(contactId);
    onNavigateToDossier();
  };

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

  return (
    <div className="flex h-full bg-[#0B0C14] text-white">
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-[#0E0E0E] border-r border-[#1C1D26] flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-[#1C1D26]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-[#0A0A12] border border-[#1F2028] rounded-lg pl-9 pr-8 py-2 text-sm text-gray-200 focus:border-[#4433FF] outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <kbd className="text-[10px] text-gray-500 bg-[#1A1A1D] px-1.5 py-0.5 rounded">⌘K</kbd>
              <button className="p-1 text-gray-500 hover:text-gray-300">
                <Mic size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <button
            onClick={() => onNavigateToNotes && onNavigateToNotes()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:text-white hover:bg-[#151623]"
          >
            <Pencil size={14} />
            Daily notes
          </button>
          <button
            onClick={() => onNavigateToNotes && onNavigateToNotes()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:text-white hover:bg-[#151623]"
          >
            <FileText size={14} />
            All notes
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors bg-[#4433FF]/20 text-[#4433FF]"
          >
            <CheckSquare size={14} />
            Tasks
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:text-white hover:bg-[#151623]"
          >
            <Map size={14} />
            Map
          </button>

          {/* Filter Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3 px-3">
              <Filter size={12} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filter</span>
            </div>
            <div className="space-y-1">
              {(['all', 'open', 'done', 'blocked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    statusFilter === status
                      ? 'bg-[#4433FF]/20 text-[#4433FF]'
                      : 'text-gray-400 hover:text-white hover:bg-[#151623]'
                  }`}
                >
                  <span className="capitalize">{status}</span>
                  <span className="text-[10px] opacity-60">
                    {status === 'all' ? stats.total : stats[status as TaskStatus]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-[#1C1D26]">
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
                <CheckSquare size={14} className="text-green-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Done</span>
              </div>
              <div className="text-3xl font-display font-bold text-green-400">{stats.done}</div>
            </div>

            <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#333]">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-red-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Blocked</span>
              </div>
              <div className="text-3xl font-display font-bold text-red-400">{stats.blocked}</div>
            </div>
          </div>
        </div>

        {/* Bottom Icon */}
        <div className="p-4 border-t border-[#1C1D26]">
          <div className="w-8 h-8 rounded-lg bg-[#4433FF]/20 flex items-center justify-center">
            <Notebook size={16} className="text-[#4433FF]" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Tasks</h2>
            {searchQuery && (
              <span className="text-sm text-gray-500">
                {filteredTasks.length} result{filteredTasks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

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
                    className={`p-4 bg-[#0E0E16] border rounded-lg transition-colors ${
                      task.status === 'done' 
                        ? 'border-[#1C1D26] opacity-60' 
                        : isOverdue(task.dueAt)
                          ? 'border-red-500/30 hover:border-red-500/50'
                          : 'border-[#1C1D26] hover:border-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
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
                        {task.status === 'done' ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${
                          task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </p>

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
                                : 'text-gray-500'
                            }`}>
                              <Calendar size={12} />
                              {formatDueDate(task.dueAt)}
                            </div>
                          )}

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
