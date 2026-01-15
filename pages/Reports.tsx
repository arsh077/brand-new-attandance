import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';

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
  earlyDepartures: number;
  totalHours: string;
  overtimeHours: string;
  monthlyStatus: string;
  notes: string;
}

const Reports: React.FC<ReportsProps> = ({ employees, attendance }) => {
  // Default to February 2026 (month index 1)
  const [selectedMonth, setSelectedMonth] = useState(1); // February
  const [selectedYear, setSelectedYear] = useState(2026);
  const [reportData, setReportData] = useState<MonthlyReport[]>([]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedYear, employees, attendance]);

  const calculateWorkingDays = (year: number, month: number): number => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
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
    const workingDays = calculateWorkingDays(selectedYear, selectedMonth);
    const monthStart = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-01`;
    const monthEnd = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, '0')}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`;

    const reports: MonthlyReport[] = employees.map(emp => {
      // Filter attendance for this employee and month
      const empAttendance = attendance.filter(a => {
        return a.employeeId === emp.id && 
               a.date >= monthStart && 
               a.date <= monthEnd;
      });

      const daysPresent = empAttendance.filter(a => 
        a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE
      ).length;

      const lateArrivals = empAttendance.filter(a => 
        a.status === AttendanceStatus.LATE
      ).length;

      const earlyDepartures = empAttendance.filter(a => {
        if (!a.clockOut) return false;
        const [time] = a.clockOut.split(' ');
        const [hours] = time.split(':').map(Number);
        return hours < 18; // Before 6 PM
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

      const daysAbsent = workingDays - daysPresent;
      const attendancePercentage = (daysPresent / workingDays) * 100;

      let monthlyStatus = 'Payroll Ready';
      let notes = '';

      if (lateArrivals > 3) {
        notes = `${lateArrivals} late arrivals`;
      }
      if (earlyDepartures > 0) {
        notes += notes ? `, ${earlyDepartures} early exits` : `${earlyDepartures} early exits`;
      }
      if (attendancePercentage < 85) {
        monthlyStatus = 'Review Required';
      }

      return {
        employeeName: emp.name,
        department: emp.department,
        totalDays: workingDays,
        daysPresent,
        daysAbsent,
        daysOnLeave: 0, // Can be calculated from leave requests
        lateArrivals,
        earlyDepartures,
        totalHours: totalHours.toFixed(0),
        overtimeHours: overtimeHours.toFixed(0),
        monthlyStatus,
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
        'Days on Leave', 'Late Arrivals', 'Early Departures', 'Total Hrs Wrkd',
        'Overtime Hrs', 'Monthly Status', 'Notes'
      ],
      ...reportData.map(r => [
        r.employeeName, r.department, r.totalDays, r.daysPresent, r.daysAbsent,
        r.daysOnLeave, r.lateArrivals, r.earlyDepartures, r.totalHours,
        r.overtimeHours, r.monthlyStatus, r.notes
      ]),
      [],
      [
        'SUMMARY', 'All Depts',
        reportData.reduce((sum, r) => sum + r.totalDays, 0),
        reportData.reduce((sum, r) => sum + r.daysPresent, 0),
        reportData.reduce((sum, r) => sum + r.daysAbsent, 0),
        reportData.reduce((sum, r) => sum + r.daysOnLeave, 0),
        reportData.reduce((sum, r) => sum + r.lateArrivals, 0),
        reportData.reduce((sum, r) => sum + r.earlyDepartures, 0),
        reportData.reduce((sum, r) => sum + parseInt(r.totalHours), 0),
        reportData.reduce((sum, r) => sum + parseInt(r.overtimeHours), 0),
        'All Clear',
        `${reportData.length} employees`
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Download Excel
        </button>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
          <button
            onClick={generateReport}
            className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
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
            {months[selectedMonth]} {selectedYear} - All employees on track
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
                <th className="px-4 py-3 text-center text-xs font-black uppercase">Early Departures</th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase">Total Hrs Wrkd</th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase">Overtime Hrs</th>
                <th className="px-4 py-3 text-center text-xs font-black uppercase">Monthly Status</th>
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
                  <td className="px-4 py-3 text-center font-bold">{row.earlyDepartures}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{row.totalHours}</td>
                  <td className="px-4 py-3 text-center font-bold text-purple-600">{row.overtimeHours}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      {row.monthlyStatus}
                    </span>
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
                <td className="px-4 py-3 text-center">All Clear</td>
                <td className="px-4 py-3">{reportData.length} employees</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
