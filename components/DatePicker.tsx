import React, { useState } from 'react';

interface DatePickerProps {
    selectedDate?: Date;
    onDateSelect: (date: Date) => void;
    minDate?: Date;
    maxDate?: Date;
}

const DatePicker: React.FC<DatePickerProps> = ({
    selectedDate,
    onDateSelect,
    minDate,
    maxDate
}) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = (year: number, month: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const firstDayOfMonth = (year: number, month: number) => {
        return new Date(year, month, 1).getDay();
    };

    const generateCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);

        const calendarDays: (number | null)[] = [];

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            calendarDays.push(null);
        }

        // Add days of the month
        for (let day = 1; day <= days; day++) {
            calendarDays.push(day);
        }

        return calendarDays;
    };

    const handlePreviousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

        // Check if date is within min/max bounds
        if (minDate && newDate < minDate) return;
        if (maxDate && newDate > maxDate) return;

        onDateSelect(newDate);
    };

    const isDateSelected = (day: number) => {
        if (!selectedDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isDateDisabled = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (minDate && date < minDate) return true;
        if (maxDate && date > maxDate) return true;
        return false;
    };

    const isToday = (day: number) => {
        const today = new Date();
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 w-80">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Previous month"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <h3 className="text-lg font-bold text-gray-900">
                    {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Next month"
                >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const selected = isDateSelected(day);
                    const disabled = isDateDisabled(day);
                    const today = isToday(day);

                    return (
                        <button
                            key={day}
                            onClick={() => !disabled && handleDateClick(day)}
                            disabled={disabled}
                            className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${selected
                                    ? 'bg-indigo-600 text-white font-bold shadow-md'
                                    : disabled
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : today
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'text-gray-700 hover:bg-gray-100'
                                }
              `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-indigo-600"></div>
                    <span className="text-gray-600">Selected</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                    <span className="text-gray-600">Today</span>
                </div>
            </div>
        </div>
    );
};

export default DatePicker;
