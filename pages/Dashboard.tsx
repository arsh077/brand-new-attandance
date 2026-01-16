
import React from 'react';
import { UserRole, Employee, AttendanceRecord, LeaveRequest, AttendanceStatus } from '../types';
import DashboardStats from '../components/DashboardStats';
import RealtimeAttendance from '../components/RealtimeAttendance';

interface DashboardProps {
  role: UserRole;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  currentUser: Employee;
  onClockToggle: (empId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, employees, attendance, leaves, currentUser, onClockToggle }) => {
  const isAdmin = role === UserRole.ADMIN;
  const today = new Date().toISOString().split('T')[0];
  
  // Real-time attendance calculation
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentToday = todayAttendance.filter(a => a.clockIn).length; // All who clocked in today
  const lateArrivals = todayAttendance.filter(a => a.status === AttendanceStatus.LATE).length;
  const onLeaveToday = leaves.filter(l => 
    l.status === 'APPROVED' && 
    new Date(l.startDate) <= new Date(today) && 
    new Date(l.endDate) >= new Date(today)
  ).length;
  
  // Check if current user is clocked in today
  const userTodayAttendance = attendance.find(a => a.employeeId === currentUser.id && a.date === today && !a.clockOut);
  const isClockedIn = !!userTodayAttendance;

  const adminStats = [
    { 
      label: 'Total Staff', 
      value: employees.length, 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Present Today', 
      value: presentToday, 
      subValue: employees.length > 0 ? `${Math.round((presentToday/employees.length)*100)}%` : '0%', 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, 
      color: 'bg-green-500' 
    },
    { 
      label: 'On Leave', 
      value: onLeaveToday, 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, 
      color: 'bg-purple-500' 
    },
    { 
      label: 'Late Arrivals', 
      value: lateArrivals, 
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, 
      color: 'bg-orange-500' 
    },
  ];

  // Calculate Monthly aggregate for Admin only
  const monthlyReport = employees.map(emp => ({
    name: emp.name,
    daysPresent: attendance.filter(a => a.employeeId === emp.id && a.status === AttendanceStatus.PRESENT).length,
    leavesTaken: leaves.filter(l => l.employeeId === emp.id && l.status === 'APPROVED').length
  }));

  return (
    <div className="animate-fade-in space-y-10">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back, {currentUser.name}</h2>
        <p className="text-gray-400 font-medium">Dashboard Overview • Jan 2026</p>
      </div>

      <DashboardStats stats={isAdmin ? adminStats : [
        { label: 'Your Balance', value: `${currentUser.leaveBalance.CASUAL} Days`, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>, color: 'bg-indigo-500' },
        { label: 'Attended (Month)', value: attendance.filter(a => a.employeeId === currentUser.id).length, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, color: 'bg-emerald-500' }
      ]} />

      {isAdmin && (
        <>
          {/* Real-time Attendance Tracker */}
          <RealtimeAttendance employees={employees} attendance={attendance} />

          {/* Monthly Payroll Report */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 bg-indigo-50/30">
              <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">End of Month Payroll Report</h3>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days Present</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Approved Leaves</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthlyReport.map((rep, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">{rep.name}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-emerald-600">{rep.daysPresent}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-purple-600">{rep.leavesTaken}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Payroll Ready</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {!isAdmin && (
        <>
          {/* Clock In/Out Button for Employees */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 animate-slide-up">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Quick Attendance</h3>
                <p className="text-gray-500 font-medium">
                  {isClockedIn ? (
                    <>You clocked in at <span className="font-bold text-green-600">{userTodayAttendance?.clockIn}</span></>
                  ) : (
                    'Clock in to start your workday'
                  )}
                </p>
              </div>
              <button
                onClick={() => onClockToggle(currentUser.id)}
                className={`px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${
                  isClockedIn 
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-100' 
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isClockedIn ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                  )}
                </svg>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
              </button>
            </div>
          </div>

          {/* Announcement Card */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-2xl animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-100 font-bold uppercase text-xs tracking-widest mb-2">Announcement</p>
                <h4 className="text-2xl font-black mb-4">Happy New Year 2026!</h4>
                <p className="text-indigo-50/70 max-w-md">Please ensure all leave regularization for December 2025 is completed by Friday.</p>
              </div>
              <div className="bg-white/20 p-4 rounded-2xl">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
