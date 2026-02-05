import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';
import DatePicker from '../components/DatePicker';
import DatePickerWithStats from '../components/DatePickerWithStats';

interface ReportsProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
}

interface MonthlyReport {
  employeeName: string;
  department: string;
  totalDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysOnLeave: number;
  lateArrivals: number;
  halfDays: number;
  earlyDepartures: number;
  totalHours: string;
  overtimeHours: string;
  payableDays: number;
  notes: string;
}

const Reports: React.FC<ReportsProps> = ({ employees, attendance }) => {
  // Default to February 2026 (month index 1)
  const [selectedMonth, setSelectedMonth] = useState(1); // February
  const [selectedYear, setSelectedYear] = useState(2026);
  const [reportData, setReportData] = useState<MonthlyReport[]>([]);

  // Date range picker state
  const [viewMode, setViewMode] = useState<'monthly' | 'dateRange' | 'calendar'>('monthly');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Calendar view state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>();
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>(employees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedYear, startDate, endDate, viewMode, employees, attendance, selectedEmployeeId]);

  // System Start Date: Feb 2, 2026
  const SYSTEM_START_DATE = new Date('2026-02-02');

  const calculateWorkingDays = (year: number, month: number): number => {
    // Determine the end date for calculation
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let endDay = daysInMonth;

    // If current month, stop at today
    if (year === now.getFullYear() && month === now.getMonth()) {
      endDay = now.getDate();
    }

    // If future month, return 0
    if (new Date(year, month, 1) > now) return 0;

    let workingDays = 0;

    for (let day = 1; day <= endDay; day++) {
      const date = new Date(year, month, day);

      // Skip if before system start date
      if (date < SYSTEM_START_DATE) continue;

      const dayOfWeek = date.getDay();
      // Exclude Sunday (0)
      if (dayOfWeek !== 0) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const calculateHours = (clockIn: string, clockOut: string): number => {
    if (!clockIn || !clockOut) return 0;

    const parseTime = (timeStr: string): Date => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const start = parseTime(clockIn);
    const end = parseTime(clockOut);
    const diff = end.getTime() - start.getTime();
    return diff / (1000 * 60 * 60); // Convert to hours
  };

  const generateReport = () => {
    let workingDays: number;
    let monthStart: string;
    let monthEnd: string;
    let reportStartDate: Date;
    let reportEndDate: Date;

    // Determine date range based on view mode
    if (viewMode === 'dateRange' && startDate && endDate) {
      // Custom date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      reportStartDate = start < SYSTEM_START_DATE ? SYSTEM_START_DATE : start;
      const now = new Date();
      reportEndDate = end > now ? now : end;

      // Calculate working days in range
      workingDays = 0;
      for (let d = new Date(reportStartDate); d <= reportEndDate; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0) workingDays++; // Exclude Sundays
      }

      monthStart = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`;
      monthEnd = `${end.getFullYear()}-${(end.getMonth() + 1).toString().padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')}`;
    } else {
      // Monthly view
      workingDays = calculateWorkingDays(selectedYear, selectedMonth);
      monthStart = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
      monthEnd = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;
    }

    // Filter employees based on selection (for Monthly and Date Range views)
    const employeesToReport = selectedEmployeeId === 'all'
      ? employees
      : employees.filter(emp => emp.id === selectedEmployeeId);

    const reports: MonthlyReport[] = employeesToReport.map(emp => {
      // Filter attendance for this employee and date range
      const empAttendance = attendance.filter(a => {
        return a.employeeId === emp.id &&
          a.date >= monthStart &&
          a.date <= monthEnd;
      });

      const daysPresent = empAttendance.filter(a =>
        a.status === AttendanceStatus.PRESENT ||
        a.status === AttendanceStatus.LATE ||
        a.status === AttendanceStatus.HALFDAY
      ).length;

      const lateArrivals = empAttendance.filter(a =>
        a.status === AttendanceStatus.LATE
      ).length;

      const halfDays = empAttendance.filter(a =>
        a.status === AttendanceStatus.HALFDAY
      ).length;

      const earlyDepartures = empAttendance.filter(a => {
        if (!a.clockOut) return false;
        const [time] = a.clockOut.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        // Early if before 6:30 PM (18 hours 30 minutes) - Updated to match system settings default
        return hours < 18 || (hours === 18 && minutes < 30);
      }).length;

      // Calculate total hours
      let totalHours = 0;
      empAttendance.forEach(a => {
        if (a.clockIn && a.clockOut) {
          totalHours += calculateHours(a.clockIn, a.clockOut);
        }
      });

      // Calculate overtime (hours beyond 8 per day)
      const expectedHours = daysPresent * 8;
      const overtimeHours = Math.max(0, totalHours - expectedHours);

      // Days Absent logic: Total Working Days - Days Present
      // If employee has 0 present days, absent should be workingDays (assuming they were employed)
      // If workingDays is 0 (future dates), absent is 0.
      const daysAbsent = Math.max(0, workingDays - daysPresent);

      const attendancePercentage = workingDays > 0 ? (daysPresent / workingDays) * 100 : 0;

      // Payable Days: Days Present (includes half days) - (Half Days * 0.5)
      const payableDays = daysPresent - (halfDays * 0.5);

      let notes = '';

      if (lateArrivals > 3) {
        notes = `${lateArrivals} late arrivals`;
      }
      if (halfDays > 0) {
        notes += notes ? `, ${halfDays} half days` : `${halfDays} half days`;
      }
      if (earlyDepartures > 0) {
        notes += notes ? `, ${earlyDepartures} early exits` : `${earlyDepartures} early exits`;
      }

      return {
        employeeName: emp.name,
        department: emp.department,
        totalDays: workingDays,
        daysPresent,
        daysAbsent,
        daysOnLeave: 0, // Can be calculated from leave requests
        lateArrivals,
        halfDays,
        earlyDepartures,
        totalHours: totalHours.toFixed(0),
        overtimeHours: overtimeHours.toFixed(0),
        payableDays,
        notes: notes || '-'
      };
    });

    setReportData(reports);
  };

  const downloadExcel = () => {
    const wsData = [
      ['Monthly Employee Attendance Report'],
      [`${months[selectedMonth]} ${selectedYear}`],
      [],
      [
        'Employee Name', 'Department', 'Total Days', 'Days Present', 'Days Absent',
        'Days on Leave', 'Late Arrivals', 'Half Days', 'Early Departures', 'Total Hrs Wrkd',
        'Overtime Hrs', 'Payable Days', 'Notes'
      ],
      ...reportData.map(r => [
        r.employeeName, r.department, r.totalDays, r.daysPresent, r.daysAbsent,
        r.daysOnLeave, r.lateArrivals, r.halfDays, r.earlyDepartures, r.totalHours,
        r.overtimeHours, r.payableDays, r.notes
      ]),
      [],
      [
        'SUMMARY', 'All Depts',
        reportData.reduce((sum, r) => sum + r.totalDays, 0),
        reportData.reduce((sum, r) => sum + r.daysPresent, 0),
        reportData.reduce((sum, r) => sum + r.daysAbsent, 0),
        reportData.reduce((sum, r) => sum + r.daysOnLeave, 0),
        reportData.reduce((sum, r) => sum + r.lateArrivals, 0),
        reportData.reduce((sum, r) => sum + r.halfDays, 0),
        reportData.reduce((sum, r) => sum + r.earlyDepartures, 0),
        reportData.reduce((sum, r) => sum + parseInt(r.totalHours), 0),
        reportData.reduce((sum, r) => sum + parseInt(r.overtimeHours), 0),
        reportData.reduce((sum, r) => sum + r.payableDays, 0),
        `${reportData.length} employees`
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
    XLSX.writeFile(wb, `Attendance_Report_${months[selectedMonth]}_${selectedYear}.xlsx`);
  };

  const summaryData = {
    totalDays: reportData.reduce((sum, r) => sum + r.totalDays, 0),
    totalPresent: reportData.reduce((sum, r) => sum + r.daysPresent, 0),
    totalAbsent: reportData.reduce((sum, r) => sum + r.daysAbsent, 0),
    totalLate: reportData.reduce((sum, r) => sum + r.lateArrivals, 0),
    totalHours: reportData.reduce((sum, r) => sum + parseInt(r.totalHours), 0),
    totalOvertime: reportData.reduce((sum, r) => sum + parseInt(r.overtimeHours), 0)
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Monthly Reports</h2>
          <p className="text-gray-400 font-medium">Generate comprehensive attendance reports</p>
        </div>
        <button
          onClick={downloadExcel}
          className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Excel
        </button>
      </div>

      {/* View Mode Toggle & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'monthly'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📅 Monthly View
          </button>
          <button
            onClick={() => setViewMode('dateRange')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'dateRange'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📆 Date Range View
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${viewMode === 'calendar'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            📊 Calendar View
          </button>
        </div>

        {/* Monthly View Controls */}
        {viewMode === 'monthly' && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {months.map((month, idx) => (
                    <option key={idx} value={idx}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Filter Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                  <option value="all">📊 All Employees ({employees.length})</option>
                  <optgroup label="─── Individual Employees ───">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <button
                onClick={generateReport}
                className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
              >
                Generate Report
              </button>
            </div>
            {selectedEmployeeId !== 'all' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold">
                    Filtered View: {employees.find(e => e.id === selectedEmployeeId)?.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEmployeeId('all')}
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold"
                >
                  ✕ Clear Filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Date Range View Controls */}
        {viewMode === 'dateRange' && (
          <div className="space-y-4">
            <div className="flex gap-6 items-start flex-wrap">
              {/* Start Date Picker */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Start Date
                </label>
                <button
                  onClick={() => {
                    setShowStartCalendar(!showStartCalendar);
                    setShowEndCalendar(false);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {startDate ? startDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Select Date'}
                </button>
                {showStartCalendar && (
                  <div className="absolute top-full mt-2 z-10">
                    <DatePicker
                      selectedDate={startDate}
                      onDateSelect={(date) => {
                        setStartDate(date);
                        setShowStartCalendar(false);
                      }}
                      maxDate={endDate}
                    />
                  </div>
                )}
              </div>

              {/* End Date Picker */}
              <div className="relative">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  End Date
                </label>
                <button
                  onClick={() => {
                    setShowEndCalendar(!showEndCalendar);
                    setShowStartCalendar(false);
                  }}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {endDate ? endDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  }) : 'Select Date'}
                </button>
                {showEndCalendar && (
                  <div className="absolute top-full mt-2 z-10">
                    <DatePicker
                      selectedDate={endDate}
                      onDateSelect={(date) => {
                        setEndDate(date);
                        setShowEndCalendar(false);
                      }}
                      minDate={startDate}
                    />
                  </div>
                )}
              </div>

              {/* Employee Filter */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Filter Employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
                >
                  <option value="all">📊 All Employees ({employees.length})</option>
                  <optgroup label="─── Individual Employees ───">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        👤 {emp.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Generate Button for Date Range */}
              <button
                onClick={generateReport}
                disabled={!startDate || !endDate}
                className={`mt-6 px-6 py-2 rounded-lg font-bold transition-colors ${startDate && endDate
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Generate Report
              </button>
            </div>

            {/* Filter Info */}
            {selectedEmployeeId !== 'all' && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold">
                    Filtered View: {employees.find(e => e.id === selectedEmployeeId)?.name}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEmployeeId('all')}
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold"
                >
                  ✕ Clear Filter
                </button>
              </div>
            )}

            {/* Date Range Display */}
            {startDate && endDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-bold">
                    Showing data from {startDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })} to {endDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View Controls */}
        {viewMode === 'calendar' && (
          <div className="space-y-6">
            {/* Selected Date Info */}
            {selectedCalendarDate && (
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <h4 className="font-bold text-indigo-900">Selected Date</h4>
                      <p className="text-indigo-700 text-lg font-black">
                        {selectedCalendarDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {(() => {
                      const dateString = `${selectedCalendarDate.getFullYear()}-${(selectedCalendarDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedCalendarDate.getDate().toString().padStart(2, '0')}`;
                      const dayAttendance = attendance.filter(a => a.date === dateString);
                      const presentCount = dayAttendance.filter(a =>
                        a.status === AttendanceStatus.PRESENT ||
                        a.status === AttendanceStatus.LATE ||
                        a.status === AttendanceStatus.HALFDAY
                      ).length;
                      const absentCount = employees.length - dayAttendance.length;

                      return (
                        <>
                          <div className="text-center bg-white rounded-lg px-4 py-2 shadow-sm">
                            <p className="text-xs text-gray-500 font-bold">PRESENT</p>
                            <p className="text-2xl font-black text-green-600">{presentCount}</p>
                          </div>
                          <div className="text-center bg-white rounded-lg px-4 py-2 shadow-sm">
                            <p className="text-xs text-gray-500 font-bold">ABSENT</p>
                            <p className="text-2xl font-black text-red-600">{absentCount}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar and Filter Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Interactive Calendar - Takes 2 columns */}
              <div className="lg:col-span-2">
                <DatePickerWithStats
                  selectedDate={selectedCalendarDate}
                  onDateSelect={(date) => setSelectedCalendarDate(date)}
                  attendance={attendance}
                  employees={employees}
                  selectedEmployeeId={selectedEmployeeId}
                />
              </div>

              {/* Employee Filter - Takes 1 column (right side) */}
              <div className="space-y-4">
                {/* Employee Filter Dropdown */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-5 shadow-lg sticky top-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <label className="text-sm font-black text-indigo-900 uppercase tracking-wider">
                      Filter by Employee
                    </label>
                  </div>

                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all hover:border-indigo-400"
                  >
                    <option value="all">📊 All Employees ({employees.length})</option>
                    <optgroup label="─── Individual Employees ───">
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          👤 {emp.name} - {emp.department}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {selectedEmployeeId !== 'all' && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-200">
                      <div className="flex items-start gap-2 text-sm text-indigo-700 mb-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-bold text-indigo-900">Filtered View</p>
                          <p className="text-xs text-indigo-600 mt-1">
                            Showing: <span className="font-bold">{employees.find(e => e.id === selectedEmployeeId)?.name}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedEmployeeId('all')}
                        className="w-full text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow-sm"
                      >
                        ✕ Clear Filter
                      </button>
                    </div>
                  )}

                  {/* Filter Info */}
                  <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                    <p className="text-xs text-indigo-700 font-medium">
                      💡 <span className="font-bold">Tip:</span> Select an employee to view their individual attendance on the calendar
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Attendance Table for Selected Date */}
            {selectedCalendarDate && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    Employee Attendance - {selectedCalendarDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Click any date on the calendar to view attendance details
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-cyan-500 text-white">
                        <th className="px-4 py-3 text-left text-xs font-black uppercase">Employee Name</th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase">Department</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase">Date</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase">Clock In</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase">Clock Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const dateString = `${selectedCalendarDate.getFullYear()}-${(selectedCalendarDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedCalendarDate.getDate().toString().padStart(2, '0')}`;

                        // Filter employees based on selection
                        const displayEmployees = selectedEmployeeId === 'all'
                          ? employees
                          : employees.filter(emp => emp.id === selectedEmployeeId);

                        return displayEmployees.map(emp => {
                          const empAttendance = attendance.find(a => a.employeeId === emp.id && a.date === dateString);

                          return (
                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{emp.name}</td>
                              <td className="px-4 py-3 text-gray-700">{emp.department}</td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600 font-medium">
                                {selectedCalendarDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {empAttendance ? (
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${empAttendance.status === AttendanceStatus.PRESENT
                                    ? 'bg-green-100 text-green-700'
                                    : empAttendance.status === AttendanceStatus.LATE
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-red-100 text-red-700'
                                    }`}>
                                    {empAttendance.status}
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                    ABSENT
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700 font-medium">
                                {empAttendance?.clockIn || '-'}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-700 font-medium">
                                {empAttendance?.clockOut || '-'}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Instructions */}
            {!selectedCalendarDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Select a Date to View Attendance</h3>
                <p className="text-blue-700">
                  Click on any date in the calendar above to see which employees were present or absent on that day.
                  <br />
                  Green dots show present count, red dots show absent count.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards - Only show in Monthly and Date Range views */}
      {viewMode !== 'calendar' && (
        <>
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Total Days</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{summaryData.totalDays}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Present</p>
              <p className="text-2xl font-black text-green-600 mt-1">{summaryData.totalPresent}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Absent</p>
              <p className="text-2xl font-black text-red-600 mt-1">{summaryData.totalAbsent}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Late</p>
              <p className="text-2xl font-black text-orange-600 mt-1">{summaryData.totalLate}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Total Hours</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{summaryData.totalHours}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase">Overtime</p>
              <p className="text-2xl font-black text-purple-600 mt-1">{summaryData.totalOvertime}</p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                Monthly Employee Attendance Report
              </h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {viewMode === 'dateRange' && startDate && endDate
                  ? `${startDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} - ${endDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} - All employees on track`
                  : `${months[selectedMonth]} ${selectedYear} - All employees on track`
                }
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-cyan-500 text-white">
                    <th className="px-4 py-3 text-left text-xs font-black uppercase">Employee Name</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase">Department</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Total Days</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Days Present</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Days Absent</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Days on Leave</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Late Arrivals</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Half Days</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Early Departures</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Total Hrs Wrkd</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Overtime Hrs</th>
                    <th className="px-4 py-3 text-center text-xs font-black uppercase">Payable Days</th>
                    <th className="px-4 py-3 text-left text-xs font-black uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.employeeName}</td>
                      <td className="px-4 py-3 text-gray-700">{row.department}</td>
                      <td className="px-4 py-3 text-center font-bold">{row.totalDays}</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{row.daysPresent}</td>
                      <td className="px-4 py-3 text-center font-bold text-red-600">{row.daysAbsent}</td>
                      <td className="px-4 py-3 text-center font-bold">{row.daysOnLeave}</td>
                      <td className="px-4 py-3 text-center font-bold text-orange-600">{row.lateArrivals}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">{row.halfDays}</td>
                      <td className="px-4 py-3 text-center font-bold text-orange-600">{row.lateArrivals}</td>
                      <td className="px-4 py-3 text-center font-bold">{row.earlyDepartures}</td>
                      <td className="px-4 py-3 text-center font-bold text-blue-600">{row.totalHours}</td>
                      <td className="px-4 py-3 text-center font-bold text-purple-600">{row.overtimeHours}</td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600 text-lg">
                        {row.payableDays}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{row.notes}</td>
                    </tr>
                  ))}
                  {/* Summary Row */}
                  <tr className="bg-cyan-100 font-bold">
                    <td className="px-4 py-3">SUMMARY</td>
                    <td className="px-4 py-3">All Depts</td>
                    <td className="px-4 py-3 text-center">{summaryData.totalDays}</td>
                    <td className="px-4 py-3 text-center text-green-600">{summaryData.totalPresent}</td>
                    <td className="px-4 py-3 text-center text-red-600">{summaryData.totalAbsent}</td>
                    <td className="px-4 py-3 text-center">0</td>
                    <td className="px-4 py-3 text-center text-orange-600">{summaryData.totalLate}</td>
                    <td className="px-4 py-3 text-center">0</td>
                    <td className="px-4 py-3 text-center text-blue-600">{summaryData.totalHours}</td>
                    <td className="px-4 py-3 text-center text-purple-600">{summaryData.totalOvertime}</td>
                    <td className="px-4 py-3 text-center font-black text-indigo-600">{reportData.reduce((sum, r) => sum + r.payableDays, 0)}</td>
                    <td className="px-4 py-3">{reportData.length} employees</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
