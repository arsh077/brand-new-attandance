import React, { useEffect, useState } from 'react';
import { Employee, AttendanceRecord, AttendanceStatus } from '../types';

interface RealtimeAttendanceProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  lateThreshold?: string;
  halfDayThreshold?: string;
}

interface LiveAttendance {
  employee: Employee;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NOT_STARTED' | 'LATE' | 'HALFDAY';
  clockIn?: string;
  clockOut?: string;
  duration?: string;
}

const RealtimeAttendance: React.FC<RealtimeAttendanceProps> = ({ employees, attendance, lateThreshold, halfDayThreshold }) => {
  const [liveData, setLiveData] = useState<LiveAttendance[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Force re-render when attendance prop changes
  useEffect(() => {
    console.log('📊 Attendance data updated, recalculating live data...');
  }, [attendance]);

  useEffect(() => {
    // Calculate live attendance data
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.filter(a => a.date === today);
    const lateThresholdMinutes = timeStringToMinutes(lateThreshold);
    const halfDayThresholdMinutes = timeStringToMinutes(halfDayThreshold);

    const liveAttendanceData: LiveAttendance[] = employees.map(emp => {
      const empAttendance = todayAttendance.find(a => a.employeeId === emp.id);

      if (!empAttendance) {
        return {
          employee: emp,
          status: 'NOT_STARTED'
        };
      }

      const derivedStatus = getDerivedStatus(
        empAttendance.status,
        empAttendance.clockIn,
        lateThresholdMinutes,
        halfDayThresholdMinutes
      );
      const isLate = derivedStatus === AttendanceStatus.LATE;
      const isHalfDay = derivedStatus === AttendanceStatus.HALFDAY;
      const hasClockOut = !!empAttendance.clockOut;

      let duration = '';
      if (empAttendance.clockIn) {
        const clockInTime = parseTime(empAttendance.clockIn);
        const endTime = hasClockOut ? parseTime(empAttendance.clockOut!) : currentTime;
        duration = calculateDuration(clockInTime, endTime);
      }

      let status: LiveAttendance['status'] = 'CLOCKED_IN';
      if (hasClockOut) status = 'CLOCKED_OUT';
      else if (isHalfDay) status = 'HALFDAY';
      else if (isLate) status = 'LATE';

      return {
        employee: emp,
        status: status,
        clockIn: empAttendance.clockIn,
        clockOut: empAttendance.clockOut,
        duration
      };
    });

    // Sort: Clocked in first, then late, then clocked out, then not started
    liveAttendanceData.sort((a, b) => {
      const order = { 'CLOCKED_IN': 1, 'LATE': 2, 'HALFDAY': 3, 'CLOCKED_OUT': 4, 'NOT_STARTED': 5 };
      return order[a.status] - order[b.status];
    });

    setLiveData(liveAttendanceData);
  }, [employees, attendance, currentTime, lateThreshold, halfDayThreshold]);

  const parseTime = (timeStr: string): Date => {
    const today = new Date();
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    today.setHours(hours, minutes, 0, 0);
    return today;
  };

  const timeStringToMinutes = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const timeLabelToMinutes = (timeStr?: string): number | null => {
    if (!timeStr) return null;
    const [time, period] = timeStr.split(' ');
    if (!time || !period) return null;
    let [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getDerivedStatus = (
    baseStatus: AttendanceStatus,
    clockIn?: string,
    lateMinutes?: number | null,
    halfDayMinutes?: number | null
  ): AttendanceStatus => {
    const clockInMinutes = timeLabelToMinutes(clockIn);
    if (clockInMinutes === null) return baseStatus;
    if (halfDayMinutes !== null && clockInMinutes >= halfDayMinutes) {
      return AttendanceStatus.HALFDAY;
    }
    if (lateMinutes !== null && clockInMinutes > lateMinutes) {
      return AttendanceStatus.LATE;
    }
    return baseStatus;
  };

  const calculateDuration = (start: Date, end: Date): string => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN': return 'bg-green-100 text-green-700 border-green-300';
      case 'LATE': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'HALFDAY': return 'bg-red-100 text-red-700 border-red-300';
      case 'CLOCKED_OUT': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'NOT_STARTED': return 'bg-slate-100 text-slate-500 border-slate-300';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>;
      case 'LATE':
        return <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>;
      case 'HALFDAY':
        return <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>;
      case 'CLOCKED_OUT':
        return <div className="w-3 h-3 bg-gray-400 rounded-full"></div>;
      case 'NOT_STARTED':
        return <div className="w-3 h-3 bg-slate-300 rounded-full"></div>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CLOCKED_IN': return 'Active Now';
      case 'LATE': return 'Late Arrival';
      case 'HALFDAY': return 'Half Day';
      case 'CLOCKED_OUT': return 'Completed';
      case 'NOT_STARTED': return 'Not Started';
    }
  };

  const clockedInCount = liveData.filter(d => d.status === 'CLOCKED_IN' || d.status === 'LATE' || d.status === 'HALFDAY').length;
  const lateCount = liveData.filter(d => d.status === 'LATE' || d.status === 'HALFDAY').length;
  const completedCount = liveData.filter(d => d.status === 'CLOCKED_OUT').length;

  return (
    <div className="space-y-6">
      {/* Real-time Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Now</p>
              <p className="text-3xl font-black text-green-600 mt-1">{clockedInCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Late Today</p>
              <p className="text-3xl font-black text-orange-600 mt-1">{lateCount}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</p>
              <p className="text-3xl font-black text-gray-600 mt-1">{completedCount}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Time</p>
              <p className="text-xl font-black text-indigo-600 mt-1">
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live Attendance List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Live Attendance Tracker</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Real-time employee status • Updates every second</p>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl border border-gray-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-gray-700">LIVE</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Clock In</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Clock Out</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {liveData.map((data, index) => (
                <tr key={data.employee.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(data.status)}
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusColor(data.status)}`}>
                        {getStatusText(data.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{data.employee.name}</p>
                      <p className="text-xs text-gray-500">{data.employee.designation}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-700">
                      {data.clockIn || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-700">
                      {data.clockOut || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-indigo-600">
                      {data.duration || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {data.employee.department}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RealtimeAttendance;
