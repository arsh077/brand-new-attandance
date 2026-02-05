import React, { useState } from 'react';
import { AttendanceRecord, AttendanceStatus, Employee } from '../types';

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
    employees: Employee[];
    selectedEmployeeId?: string;
}

const DatePickerWithStats: React.FC<DatePickerWithStatsProps> = ({
    selectedDate,
    onDateSelect,
    attendance,
    employees,
    selectedEmployeeId = 'all'
}) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
    const [hoveredDate, setHoveredDate] = useState<number | null>(null);

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

    const getAttendanceStatsForDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = formatDateString(date);

        // Filter employees based on selected employee
        const filteredEmployees = selectedEmployeeId === 'all'
            ? employees
            : employees.filter(emp => emp.id === selectedEmployeeId);

        const dayAttendance = selectedEmployeeId === 'all'
            ? attendance.filter(a => a.date === dateString)
            : attendance.filter(a => a.date === dateString && a.employeeId === selectedEmployeeId);

        const presentRecords = dayAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.HALFDAY);
        const lateRecords = dayAttendance.filter(a => a.status === AttendanceStatus.LATE);

        // Get employee details for late and absent
        const lateEmployees = lateRecords.map(record => {
            const emp = employees.find(e => e.id === record.employeeId);
            return { name: emp?.name || 'Unknown', clockIn: record.clockIn };
        });

        const absentEmployees = filteredEmployees
            .filter(emp => !dayAttendance.find(a => a.employeeId === emp.id))
            .map(emp => emp.name);

        return {
            present: presentRecords.length,
            absent: filteredEmployees.length - dayAttendance.length,
            late: lateRecords.length,
            total: dayAttendance.length,
            lateEmployees,
            absentEmployees
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
                    const isHovered = hoveredDate === day;

                    // Determine background color based on attendance status
                    let bgColorClass = 'bg-white';
                    let borderColorClass = 'border-gray-200';

                    if (!selected && stats.total > 0) {
                        if (stats.absent > 0) {
                            bgColorClass = 'bg-red-50';
                            borderColorClass = 'border-red-300';
                        } else if (stats.late > 0) {
                            bgColorClass = 'bg-orange-50';
                            borderColorClass = 'border-orange-300';
                        } else {
                            bgColorClass = 'bg-green-50';
                            borderColorClass = 'border-green-300';
                        }
                    }

                    return (
                        <div
                            key={day}
                            className="relative"
                            onMouseEnter={() => setHoveredDate(day)}
                            onMouseLeave={() => setHoveredDate(null)}
                        >
                            <button
                                onClick={() => handleDateClick(day)}
                                className={`
                    w-full relative rounded-xl p-2 transition-all border-2 hover:shadow-lg
                    ${selected
                                        ? 'bg-indigo-600 border-indigo-700 shadow-lg scale-105'
                                        : today
                                            ? 'bg-blue-50 border-blue-300'
                                            : `${bgColorClass} ${borderColorClass} hover:border-indigo-300`
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

                            {/* Hover Tooltip */}
                            {isHovered && stats.total > 0 && (
                                <div className="absolute z-50 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 bg-gray-900 text-white rounded-lg shadow-2xl p-4 pointer-events-none">
                                    {/* Tooltip Arrow */}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                        <div className="border-8 border-transparent border-t-gray-900"></div>
                                    </div>

                                    {/* Tooltip Content */}
                                    <div className="space-y-3">
                                        {/* Summary */}
                                        <div className="border-b border-gray-700 pb-2">
                                            <p className="text-xs font-bold text-gray-300 uppercase">Attendance Summary</p>
                                            <div className="grid grid-cols-3 gap-2 mt-2">
                                                <div className="text-center">
                                                    <p className="text-green-400 font-black text-lg">{stats.present + stats.late}</p>
                                                    <p className="text-xs text-gray-400">Present</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-orange-400 font-black text-lg">{stats.late}</p>
                                                    <p className="text-xs text-gray-400">Late</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-red-400 font-black text-lg">{stats.absent}</p>
                                                    <p className="text-xs text-gray-400">Absent</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Late Employees */}
                                        {stats.lateEmployees && stats.lateEmployees.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-orange-400 mb-1">⏰ Late Arrivals:</p>
                                                <div className="space-y-1">
                                                    {stats.lateEmployees.map((emp, idx) => (
                                                        <div key={idx} className="text-xs bg-orange-900/30 rounded px-2 py-1">
                                                            <span className="font-medium">{emp.name}</span>
                                                            <span className="text-gray-400 ml-2">• {emp.clockIn}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Absent Employees */}
                                        {stats.absentEmployees && stats.absentEmployees.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-red-400 mb-1">❌ Absent:</p>
                                                <div className="space-y-1">
                                                    {stats.absentEmployees.slice(0, 5).map((name, idx) => (
                                                        <div key={idx} className="text-xs bg-red-900/30 rounded px-2 py-1">
                                                            {name}
                                                        </div>
                                                    ))}
                                                    {stats.absentEmployees.length > 5 && (
                                                        <p className="text-xs text-gray-400 italic">
                                                            +{stats.absentEmployees.length - 5} more...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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
