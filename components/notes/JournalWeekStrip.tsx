// =============================================================================
// JOURNAL WEEK STRIP — Week navigation for journal editor header
// =============================================================================
// AFFiNE-style week strip that appears in the journal editor header
// - Shows 7 days (Sun-Sat) of the current week
// - Left/right arrows to navigate between weeks
// - "Today" button to jump to current date
// - Selected day highlighted with blue background
// - Dots indicate days with journal entries
// =============================================================================

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JournalWeekStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  theme: 'light' | 'dark';
  colors: Record<string, string>;
  journalDates?: string[]; // Optional: dates that have journal entries (YYYY-MM-DD)
}

export const JournalWeekStrip: React.FC<JournalWeekStripProps> = ({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
  onToday,
  theme,
  colors,
  journalDates = [],
}) => {
  // Calculate the week days (Sun-Sat) containing the selected date
  const weekDays = useMemo(() => {
    const days: Array<{ date: Date; dateKey: string; dayName: string; dayNumber: number }> = [];

    // Get the Sunday of the week containing selectedDate
    const sunday = new Date(selectedDate);
    sunday.setDate(selectedDate.getDate() - selectedDate.getDay());

    // Generate 7 days from Sunday to Saturday
    for (let i = 0; i < 7; i++) {
      const date = new Date(sunday);
      date.setDate(sunday.getDate() + i);

      days.push({
        date,
        dateKey: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
      });
    }

    return days;
  }, [selectedDate]);

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

  return (
    <div className="flex items-center gap-2">
      {/* Previous week button */}
      <button
        onClick={onPrevWeek}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: colors.textMuted }}
        title="Previous week"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Week days strip */}
      <div className="flex items-center gap-1">
        {weekDays.map((day, index) => {
          const isTodayDate = isToday(day.date);
          const isSelectedDate = isSelected(day.date);
          const hasJournalEntry = hasJournal(day.dateKey);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(day.date)}
              className="relative flex flex-col items-center px-2 py-1 rounded transition-colors min-w-[44px]"
              style={{
                background: isSelectedDate
                  ? colors.accent
                  : isTodayDate
                  ? colors.hover
                  : 'transparent',
                color: isSelectedDate ? '#fff' : colors.text,
              }}
              title={day.date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            >
              {/* Day name */}
              <span className="text-xs font-medium" style={{
                color: isSelectedDate ? '#fff' : colors.textMuted
              }}>
                {day.dayName}
              </span>

              {/* Day number */}
              <span className="text-sm font-semibold">
                {day.dayNumber}
              </span>

              {/* Indicator dot for days with journal entries */}
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

      {/* Next week button */}
      <button
        onClick={onNextWeek}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: colors.textMuted }}
        title="Next week"
      >
        <ChevronRight size={16} />
      </button>

      {/* Today button */}
      <button
        onClick={onToday}
        className="px-3 py-1 text-sm font-medium rounded transition-colors"
        style={{
          color: colors.accent,
          background: colors.hover,
        }}
      >
        Today
      </button>
    </div>
  );
};
