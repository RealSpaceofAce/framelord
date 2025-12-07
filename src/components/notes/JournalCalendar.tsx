// =============================================================================
// JOURNAL CALENDAR — Mini calendar for journal date navigation
// =============================================================================
// AFFiNE-style calendar widget for the journal sidebar
// - Shows current month with date grid
// - Highlights dates with journal entries
// - Click to select/create journal for that date
// - Previous/Next month navigation
// - Today button to jump to current date
// =============================================================================

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface JournalCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  journalDates: string[]; // dates that have journals (ISO format YYYY-MM-DD)
  colors: Record<string, string>;
}

export const JournalCalendar: React.FC<JournalCalendarProps> = ({
  selectedDate,
  onDateSelect,
  journalDates,
  colors,
}) => {
  const [viewDate, setViewDate] = useState(selectedDate);

  // Get month/year for display
  const monthYear = useMemo(() => {
    return viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewDate]);

  // Get days in current month
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of month (0 = Sunday, 6 = Saturday)
    const firstDay = new Date(year, month, 1).getDay();

    // Number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Previous month's trailing days
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ date: Date; isCurrentMonth: boolean; dateKey: string }> = [];

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({
        date,
        isCurrentMonth: false,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        dateKey: date.toISOString().split('T')[0],
      });
    }

    // Add next month's leading days to fill the grid (42 days = 6 weeks)
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

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is selected
  const isSelected = (date: Date): boolean => {
    return date.toDateString() === selectedDate.toDateString();
  };

  // Check if a date has a journal entry
  const hasJournal = (dateKey: string): boolean => {
    return journalDates.includes(dateKey);
  };

  // Navigate to previous month
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Jump to today
  const handleToday = () => {
    const today = new Date();
    setViewDate(today);
    onDateSelect(today);
  };

  // Handle date click
  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      // If clicking a date from prev/next month, navigate to that month first
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    onDateSelect(date);
  };

  return (
    <div className="p-3 border-b" style={{ borderColor: colors.border }}>
      {/* Header with month/year and navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: colors.textMuted }}
          title="Previous month"
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
          title="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Today button */}
      <button
        onClick={handleToday}
        className="w-full mb-2 px-2 py-1 text-xs rounded transition-colors"
        style={{
          color: colors.accent,
          background: colors.hover,
        }}
      >
        Today
      </button>

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

      {/* Calendar grid */}
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
              title={day.date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            >
              {day.date.getDate()}

              {/* Indicator dot for dates with journal entries */}
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
  );
};
