import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus } from '../types';

interface AttendanceStats {
    present: number;
    absent: number;
    late: number;
    total: number;
}

interface DatePickerWithStatsProps {
    selectedDate?: Date;
    onDateSelect: (date: Date) => void;
    attendance: AttendanceRecord[];
    employees: { id: string }[];
}

const DatePickerWithStats: React.FC<DatePickerWithStatsProps> = ({
    selectedDate,
    onDateSelect,
    attendance,
    employees
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

    const formatDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getAttendanceStatsForDate = (day: number): AttendanceStats => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = formatDateString(date);

        const dayAttendance = attendance.filter(a => a.date === dateString);

        const present = dayAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const late = dayAttendance.filter(a => a.status === AttendanceStatus.LATE).length;
        const absent = employees.length - dayAttendance.length;

        return {
            present,
            absent,
            late,
            total: dayAttendance.length
        };
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

    const isToday = (day: number) => {
        const today = new Date();
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const getDateColor = (stats: AttendanceStats) => {
        if (stats.total === 0) return 'gray';
        const presentPercentage = ((stats.present + stats.late) / employees.length) * 100;

        if (presentPercentage === 100) return 'green';
        if (presentPercentage >= 80) return 'yellow';
        return 'red';
    };

    const calendarDays = generateCalendarDays();

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-4xl">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={handlePreviousMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Previous month"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <h3 className="text-2xl font-black text-gray-900">
                    {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Next month"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-bold text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const selected = isDateSelected(day);
                    const today = isToday(day);
                    const stats = getAttendanceStatsForDate(day);
                    const color = getDateColor(stats);

                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            className={`
                relative rounded-xl p-2 transition-all border-2 hover:shadow-lg
                ${selected
                                    ? 'bg-indigo-600 border-indigo-700 shadow-lg scale-105'
                                    : today
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'bg-white border-gray-200 hover:border-indigo-300'
                                }
              `}
                        >
                            {/* Date Number */}
                            <div className={`text-lg font-bold mb-1 ${selected ? 'text-white' : 'text-gray-900'}`}>
                                {day}
                            </div>

                            {/* Attendance Stats */}
                            {stats.total > 0 && (
                                <div className="space-y-0.5">
                                    <div className={`flex items-center justify-center gap-1 text-xs ${selected ? 'text-white' : 'text-green-600'}`}>
                                        <span className={`w-2 h-2 rounded-full ${selected ? 'bg-white' : 'bg-green-500'}`}></span>
                                        <span className="font-bold">{stats.present + stats.late}</span>
                                    </div>
                                    {stats.absent > 0 && (
                                        <div className={`flex items-center justify-center gap-1 text-xs ${selected ? 'text-white' : 'text-red-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${selected ? 'bg-white' : 'bg-red-500'}`}></span>
                                            <span className="font-bold">{stats.absent}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Today Indicator */}
                            {today && !selected && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-600 font-medium">Present</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-600 font-medium">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-indigo-600"></div>
                    <span className="text-gray-600 font-medium">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600 font-medium">Today</span>
                </div>
            </div>
        </div>
    );
};

export default DatePickerWithStats;
