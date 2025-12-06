import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JournalWeekStrip } from '../../components/notes/JournalWeekStrip';

describe('JournalWeekStrip', () => {
  const defaultProps = {
    selectedDate: new Date('2025-12-05'),
    onDateSelect: vi.fn(),
    onPrevWeek: vi.fn(),
    onNextWeek: vi.fn(),
    onToday: vi.fn(),
    theme: 'dark' as const,
    colors: {
      text: '#fff',
      textMuted: '#888',
      accent: '#6366f1',
      hover: '#333',
      border: '#444',
    },
  };

  it('should render week days', () => {
    render(<JournalWeekStrip {...defaultProps} />);
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
  });

  it('should call onToday when Today button clicked', () => {
    render(<JournalWeekStrip {...defaultProps} />);
    fireEvent.click(screen.getByText('Today'));
    expect(defaultProps.onToday).toHaveBeenCalled();
  });

  it('should call onPrevWeek when left arrow clicked', () => {
    render(<JournalWeekStrip {...defaultProps} />);
    const leftArrow = screen.getByTitle('Previous week');
    fireEvent.click(leftArrow);
    expect(defaultProps.onPrevWeek).toHaveBeenCalled();
  });
});
