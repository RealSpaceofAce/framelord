import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the value prop to Date
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;

  // Update calendar position when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCalendarPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Check if click is on the portal calendar
        const target = event.target as HTMLElement;
        if (!target.closest('.date-picker-calendar')) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatValueDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatValueDate(newDate));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    onChange(formatValueDate(today));
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstDayOfMonth = getFirstDayOfMonth(viewDate);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    const today = new Date();
    const isToday = (day: number) => {
      return (
        day === today.getDate() &&
        viewDate.getMonth() === today.getMonth() &&
        viewDate.getFullYear() === today.getFullYear()
      );
    };

    const isSelected = (day: number) => {
      if (!selectedDate) return false;
      return (
        day === selectedDate.getDate() &&
        viewDate.getMonth() === selectedDate.getMonth() &&
        viewDate.getFullYear() === selectedDate.getFullYear()
      );
    };

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-[10px] font-bold text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day, index) => (
          <div key={index}>
            {day ? (
              <button
                onClick={() => handleDateClick(day)}
                className={`
                  w-full aspect-square text-sm rounded hover:bg-[#252528] transition-colors
                  ${isSelected(day) ? 'bg-[#4433FF] text-white font-bold' : 'text-white'}
                  ${isToday(day) && !isSelected(day) ? 'border border-[#4433FF]' : ''}
                `}
              >
                {day}
              </button>
            ) : (
              <div className="w-full aspect-square" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const calendarDropdown = isOpen && (
    <div
      className="date-picker-calendar fixed z-[100] bg-[#0E0E0E] border border-[#2A2A2A] rounded-xl shadow-lg p-4 w-80"
      style={{
        top: `${calendarPosition.top}px`,
        left: `${calendarPosition.left}px`,
      }}
    >
      {/* Month/Year header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1 hover:bg-[#1A1A1D] rounded transition-colors"
        >
          <ChevronLeft size={16} className="text-white" />
        </button>

        <div className="text-sm font-bold text-white">
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1 hover:bg-[#1A1A1D] rounded transition-colors"
        >
          <ChevronRight size={16} className="text-white" />
        </button>
      </div>

      {/* Calendar grid */}
      {renderCalendar()}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
        <button
          onClick={handleToday}
          className="flex-1 px-3 py-2 bg-[#1A1A1D] hover:bg-[#252528] text-white text-xs font-bold rounded transition-colors"
        >
          Today
        </button>
        {selectedDate && (
          <button
            onClick={handleClear}
            className="flex-1 px-3 py-2 bg-[#1A1A1D] hover:bg-[#252528] text-gray-400 text-xs font-bold rounded transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        {/* Input trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-[#1A1A1D] border border-[#333] rounded px-3 py-2 text-white text-sm flex items-center justify-between hover:border-[#4433FF] transition-colors"
        >
          <span className={selectedDate ? 'text-white' : 'text-gray-500'}>
            {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
          </span>
          <CalendarIcon size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Calendar dropdown rendered at document root */}
      {calendarDropdown && createPortal(calendarDropdown, document.body)}
    </>
  );
};
