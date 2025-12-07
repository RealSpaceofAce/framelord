// =============================================================================
// CALENDAR TAB — Journal calendar for right sidebar
// =============================================================================
// Full month calendar with journal entries
// - Month/year header with < TODAY > navigation
// - Calendar grid with dots for journal dates
// - "Set a Template for the Journal" card
// - "Created X" / "Updated Y" tabs
// - List of journal entries below calendar
// =============================================================================

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, FileText } from 'lucide-react';
import { getJournalDates, getOrCreateJournalForDate, getAllNotes } from '../../../services/noteStore';

// =============================================================================
// TYPES
// =============================================================================

export interface CalendarTabProps {
  journalDates?: string[];
  theme: 'light' | 'gray' | 'dark';
  colors: Record<string, string>;
  onDateSelect?: (date: Date) => void;
  onNavigateToNote?: (noteId: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CalendarTab: React.FC<CalendarTabProps> = ({
  journalDates = [],
  theme,
  colors,
  onDateSelect,
  onNavigateToNote,
}) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entryView, setEntryView] = useState<'created' | 'updated'>('created');

  // Get month/year for display
  const monthYear = useMemo(() => {
    return viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateKey: string }> = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Next month leading days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    return days;
  }, [viewDate]);

  // Get journal notes for current month
  const journalNotes = useMemo(() => {
    const allNotes = getAllNotes();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    return allNotes
      .filter(note => note.dateKey && note.dateKey.startsWith(monthKey))
      .sort((a, b) => {
        if (entryView === 'created') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
      });
  }, [viewDate, entryView]);

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasJournal = (dateKey: string): boolean => {
    return journalDates.includes(dateKey);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
    onDateSelect?.(today);
  };

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Calendar Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: colors.textMuted }} />
            <span className="text-sm font-medium" style={{ color: colors.text }}>
              {monthYear}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: colors.textMuted }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={handleToday}
          className="w-full px-2 py-1 text-xs rounded transition-colors"
          style={{
            color: colors.accent,
            background: colors.hover,
          }}
        >
          TODAY
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium"
              style={{ color: colors.textMuted }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isTodayDate = isToday(day.date);
            const isSelectedDate = isSelected(day.date);
            const hasJournalEntry = hasJournal(day.dateKey);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(day.date, day.isCurrentMonth)}
                className="relative aspect-square flex items-center justify-center text-xs rounded transition-colors"
                style={{
                  color: day.isCurrentMonth
                    ? isSelectedDate
                      ? '#fff'
                      : colors.text
                    : colors.textMuted,
                  background: isSelectedDate
                    ? colors.accent
                    : isTodayDate
                    ? colors.hover
                    : 'transparent',
                  opacity: day.isCurrentMonth ? 1 : 0.5,
                }}
              >
                {day.date.getDate()}

                {/* Indicator dot for journal entries */}
                {hasJournalEntry && !isSelectedDate && (
                  <div
                    className="absolute bottom-0.5 w-1 h-1 rounded-full"
                    style={{ background: colors.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Card */}
      <div className="px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <button
          onClick={() => alert('Coming soon')}
          className="w-full p-3 rounded-lg text-left transition-colors hover:bg-white/5"
          style={{ background: colors.hover }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: colors.text }}>
            Set a Template for the Journal
          </p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            Create a reusable template
          </p>
        </button>
      </div>

      {/* Entry List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="px-4 py-2 flex gap-4 border-b" style={{ borderColor: colors.border }}>
          <button
            onClick={() => setEntryView('created')}
            className="text-xs font-medium pb-1 border-b-2 transition-colors"
            style={{
              color: entryView === 'created' ? colors.accent : colors.textMuted,
              borderColor: entryView === 'created' ? colors.accent : 'transparent',
            }}
          >
            Created {journalNotes.length}
          </button>
          <button
            onClick={() => setEntryView('updated')}
            className="text-xs font-medium pb-1 border-b-2 transition-colors"
            style={{
              color: entryView === 'updated' ? colors.accent : colors.textMuted,
              borderColor: entryView === 'updated' ? colors.accent : 'transparent',
            }}
          >
            Updated {journalNotes.length}
          </button>
        </div>

        {/* Journal List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {journalNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <FileText size={32} className="mb-3 opacity-20" style={{ color: colors.textMuted }} />
              <p className="text-xs" style={{ color: colors.textMuted }}>
                No journal entries this month
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {journalNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onNavigateToNote?.(note.id)}
                  className="w-full p-2 rounded text-left transition-colors hover:bg-white/5"
                  style={{ background: colors.hover }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{note.icon || '📅'}</span>
                    <p className="text-xs font-medium flex-1 truncate" style={{ color: colors.text }}>
                      {note.title || 'Untitled Journal'}
                    </p>
                  </div>
                  {note.content && (
                    <p className="text-xs truncate" style={{ color: colors.textMuted }}>
                      {note.content.slice(0, 60)}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                    {new Date(note.dateKey || note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;
