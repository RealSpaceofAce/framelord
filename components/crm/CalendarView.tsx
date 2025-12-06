// =============================================================================
// CALENDAR VIEW — Task-driven calendar showing tasks by due date
// =============================================================================
// Displays a month grid with task counts per day.
// Clicking a day shows tasks for that date.
// Tasks with time components show the time.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, 
  CheckSquare, Square, CheckCircle, ArrowRight
} from 'lucide-react';
import { 
  getTasksByDate, 
  getTaskCountByDate, 
  updateTaskStatus,
  formatDueTime,
  hasTimeComponent
} from '../../services/taskStore';
import { getContactById, CONTACT_ZERO } from '../../services/contactStore';
import { Task } from '../../types';

// --- PROPS ---

interface CalendarViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
}

// --- HELPER FUNCTIONS ---

const getMonthName = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const formatDateKey = (year: number, month: number, day: number): string => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const getTodayKey = (): string => {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- COMPONENT ---

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedContactId,
  setSelectedContactId,
  onNavigateToDossier
}) => {
  // State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [refreshKey, setRefreshKey] = useState(0);

  // Derived values
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const todayKey = getTodayKey();

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    return getTasksByDate(selectedDate);
  }, [selectedDate, refreshKey]);

  // Build calendar grid data
  const calendarDays = useMemo(() => {
    const days: Array<{ day: number; dateKey: string; taskCount: number } | null> = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = formatDateKey(year, month, day);
      const taskCount = getTaskCountByDate(dateKey);
      days.push({ day, dateKey, taskCount });
    }
    
    return days;
  }, [year, month, daysInMonth, firstDayOfMonth, refreshKey]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getTodayKey());
  };

  // Task handlers
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

  // Format selected date for display
  const formatSelectedDate = (dateKey: string): string => {
    const date = new Date(dateKey + 'T00:00:00');
    if (dateKey === todayKey) {
      return 'Today, ' + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Status badge styles
  const statusBadge = (status: Task['status']) => {
    const styles = {
      open: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      done: 'bg-green-500/20 text-green-400 border-green-500/30',
      blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return styles[status];
  };

  return (
    <div className="flex h-full bg-[#030412]">
      {/* Left: Calendar Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A] bg-[#0E0E0E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-[#4433FF]" />
              <h1 className="text-xl font-display font-bold text-white">
                {getMonthName(currentMonth)}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-[#1A1A1D] rounded transition-colors"
              >
                Today
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-[#1A1A1D] rounded transition-colors text-gray-400 hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-[#1A1A1D] rounded transition-colors text-gray-400 hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => {
              if (!dayData) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const { day, dateKey, taskCount } = dayData;
              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`aspect-square p-2 rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-[#4433FF]/20 border-[#4433FF] text-white'
                      : isToday
                        ? 'bg-[#1A1A1D] border-[#4433FF]/50 text-white'
                        : 'bg-[#0E0E0E] border-[#2A2A2A] text-gray-400 hover:border-[#333] hover:bg-[#1A1A1D]'
                  }`}
                >
                  <span className={`text-sm font-bold ${isSelected || isToday ? 'text-white' : ''}`}>
                    {day}
                  </span>
                  {taskCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected 
                        ? 'bg-[#4433FF] text-white' 
                        : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {taskCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Selected Day Tasks */}
      <div className="w-96 bg-[#0E0E0E] border-l border-[#2A2A2A] flex flex-col">
        {/* Day Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={16} className="text-cyan-500" />
            <h2 className="font-display font-bold text-white text-sm">
              Tasks for {formatSelectedDate(selectedDate)}
            </h2>
          </div>
          <p className="text-[10px] text-gray-500">
            {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedDateTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Calendar size={40} className="text-gray-700 mb-3" />
              <h3 className="text-sm font-bold text-gray-500 mb-1">No tasks</h3>
              <p className="text-xs text-gray-600">
                No tasks scheduled for this day
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => {
                const taskContact = getContactById(task.contactId);
                if (!taskContact) return null;
                const isContactZeroTask = task.contactId === CONTACT_ZERO.id;
                const timeStr = formatDueTime(task.dueAt);

                return (
                  <div
                    key={task.id}
                    className={`bg-[#1A1A1D] border rounded-lg p-4 transition-colors ${
                      task.status === 'done'
                        ? 'border-[#333] opacity-60'
                        : 'border-[#333] hover:border-cyan-500/30'
                    }`}
                  >
                    {/* Time & Status Row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {timeStr && (
                          <span className="flex items-center gap-1 text-xs text-cyan-400">
                            <Clock size={12} />
                            {timeStr}
                          </span>
                        )}
                        {!timeStr && (
                          <span className="text-xs text-gray-600">All day</span>
                        )}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${statusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </div>

                    {/* Task Content */}
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => task.status === 'done' 
                          ? handleMarkTaskOpen(task.id) 
                          : handleMarkTaskDone(task.id)
                        }
                        className={`mt-0.5 transition-colors ${
                          task.status === 'done'
                            ? 'text-green-500 hover:text-gray-400'
                            : 'text-gray-500 hover:text-cyan-500'
                        }`}
                      >
                        {task.status === 'done' ? <CheckCircle size={18} /> : <Square size={18} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <p className={`text-sm ${
                          task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </p>

                        {/* Contact */}
                        <button
                          onClick={() => handleContactClick(taskContact.id)}
                          className="flex items-center gap-2 mt-2 hover:bg-[#0E0E0E] rounded px-1 py-0.5 -ml-1 transition-colors group"
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







