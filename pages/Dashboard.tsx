import React, { useState, useEffect } from 'react';
import { UserRole, Employee, AttendanceRecord, LeaveRequest, AttendanceStatus } from '../types';
import DashboardStats from '../components/DashboardStats';
import RealtimeAttendance from '../components/RealtimeAttendance';
import BirthdayPopup from '../components/BirthdayPopup';
import { MonthlyGoals } from '../services/firebaseTargetService';
import { firebaseSalesService } from '../services/firebaseSalesService';

interface DashboardProps {
  role: UserRole;
  employees: Employee[];
  attendance: AttendanceRecord[];
  leaves: LeaveRequest[];
  currentUser: Employee;
  systemSettings: {
    lateThreshold: string;
    halfDayThreshold: string;
  };
  monthlyGoals: MonthlyGoals;
  onClockToggle: (empId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ role, employees, attendance, leaves, currentUser, systemSettings, monthlyGoals, onClockToggle }) => {
  const isAdmin = role === UserRole.ADMIN;
  // Use local date to match firebaseAttendanceService
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const yearMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [lastClickTime, setLastClickTime] = React.useState(0);
  const minClickDelay = 1000; // Minimum 1 second between clicks

  // Track current employee's monthly sales for progress vs target
  const [currentMonthSales, setCurrentMonthSales] = useState(0);
  useEffect(() => {
    if (isAdmin) return;
    const unsub = firebaseSalesService.subscribeToMonthlySales(yearMonthStr, (entries: any[]) => {
      const myTotal = entries
        .filter((e: any) => e.employeeId === currentUser.id)
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      setCurrentMonthSales(myTotal);
    });
    return () => unsub();
  }, [currentUser.id, yearMonthStr, isAdmin]);

  // Track ALL employees' sales total (for admin view)
  const [totalTeamSales, setTotalTeamSales] = useState(0);
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = firebaseSalesService.subscribeToMonthlySales(yearMonthStr, (entries: any[]) => {
      const total = entries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      setTotalTeamSales(total);
    });
    return () => unsub();
  }, [isAdmin, yearMonthStr]);

  // Computed values for target display
  const targetAmount = monthlyGoals?.targetAmount || 0;
  const salesForProgress = isAdmin ? totalTeamSales : currentMonthSales;
  const remaining = Math.max(0, targetAmount - salesForProgress);
  const progressPercent = targetAmount > 0 ? Math.min(100, Math.round((salesForProgress / targetAmount) * 100)) : 0;
  const monthName = monthlyGoals?.targetMonth
    ? new Date(monthlyGoals.targetMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Special Target computed values
  const specialTarget = monthlyGoals?.specialTarget || null;
  const specialRemaining = specialTarget ? Math.max(0, specialTarget.targetAmount - salesForProgress) : 0;
  const specialPercent = specialTarget && specialTarget.targetAmount > 0
    ? Math.min(100, Math.round((salesForProgress / specialTarget.targetAmount) * 100))
    : 0;

  // Personal Target computed values
  const personalTargetAmount = currentUser?.personalTarget || 0;
  const personalRemaining = Math.max(0, personalTargetAmount - currentMonthSales);
  const personalPercent = personalTargetAmount > 0
    ? Math.min(100, Math.round((currentMonthSales / personalTargetAmount) * 100))
    : 0;

  // Real-time attendance calculation (updates automatically from Firebase!)
  // CRITICAL: Only count TODAY's attendance, filter by exact date match
  const todayAttendance = attendance.filter(a => {
    const isTodayRecord = a.date === today;
    if (isTodayRecord) {
      console.log('📊 Today attendance record:', a.employeeName, a.date, a.clockIn, a.status);
    }
    return isTodayRecord;
  });

  // Count only unique employees who clocked in TODAY
  const presentToday = todayAttendance.filter(a => a.clockIn && a.clockIn.trim() !== '').length;
  const lateArrivals = todayAttendance.filter(a => a.status === AttendanceStatus.LATE).length;

  console.log(`📊 STATS - Date: ${today}, Total Records: ${attendance.length}, Today's Records: ${todayAttendance.length}, Present: ${presentToday}, Late: ${lateArrivals}`);

  const onLeaveToday = leaves.filter(l =>
    l.status === 'APPROVED' &&
    new Date(l.startDate) <= new Date(today) &&
    new Date(l.endDate) >= new Date(today)
  ).length;

  // Check if current user is clocked in today
  const userTodayAttendance = attendance.find(a => a.employeeId === currentUser.id && a.date === today && !a.clockOut);
  const isClockedIn = !!userTodayAttendance;

  const handleClockToggle = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // Check if already processing
    if (isProcessing) {
      console.log('Already processing, please wait...');
      return;
    }

    // Check minimum delay between clicks
    const currentTimeMs = Date.now();
    if (currentTimeMs - lastClickTime < minClickDelay) {
      console.log('Too fast! Please wait...');
      return;
    }

    setLastClickTime(currentTimeMs);
    processToggle();
  };

  const processToggle = async () => {
    setIsProcessing(true);

    try {
      // Call the parent toggle function and wait for Firebase result
      const result = await Promise.race([
        onClockToggle(currentUser.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase timeout. Check connection.')), 5000))
      ]) as any;

      if (result && result.success) {
        // Show success feedback based on what actually happened
        console.log(result.type === 'IN' ? '✅ Clocked In Successfully!' : '🔴 Clocked Out Successfully!');
      }

    } catch (error: any) {
      console.error('Error toggling attendance:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const adminStats = [
    {
      label: 'Total Staff',
      value: employees.length,
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
      color: 'bg-blue-500'
    },
    {
      label: 'Present Today',
      value: presentToday,
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      color: 'bg-green-500'
    },
    {
      label: 'On Leave',
      value: onLeaveToday,
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      color: 'bg-purple-500'
    },
    {
      label: 'Late Arrivals',
      value: lateArrivals,
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
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
    <div className="animate-fade-in space-y-10 bg-white">
      {/* Birthday Popup - Shows for all users */}
      <BirthdayPopup employees={employees} />

      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back, {currentUser.name}</h2>
        <p className="text-gray-400 font-medium">Dashboard Overview • {now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
      </div>

      <DashboardStats stats={isAdmin ? adminStats : [
        { label: 'Your Balance', value: `${currentUser.leaveBalance?.CASUAL || 0} Days`, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, color: 'bg-indigo-500' },
        { label: 'Attended (Month)', value: attendance.filter(a => a.employeeId === currentUser.id).length, icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: 'bg-emerald-500' }
      ]} />

      {isAdmin && (
        <>
          {/* ━━━ ADMIN TARGET OVERVIEW (Monthly + Special) ━━━ */}
          {(targetAmount > 0 || specialTarget) && (
            <div className="space-y-4 animate-slide-up">

              {/* Monthly Target — Team View */}
              {targetAmount > 0 && (
                <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-200 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-indigo-200 font-black uppercase tracking-[0.3em] text-[10px] mb-2">📊 Team Monthly Target — {monthName}</p>
                    <div className="text-white font-black leading-none mb-4" style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
                      ₹{targetAmount.toLocaleString('en-IN')}
                    </div>
                    {/* Team progress row */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">✅ Achieved</p>
                        <p className="text-white font-black text-2xl">₹{totalTeamSales.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">🎯 Remaining</p>
                        <p className={`font-black text-2xl ${remaining <= 0 ? 'text-emerald-300' : 'text-orange-300'}`}>
                          {remaining <= 0 ? '🏆 Done!' : `₹${remaining.toLocaleString('en-IN')}`}
                        </p>
                      </div>
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1">📈 Progress</p>
                        <p className={`font-black text-2xl ${progressPercent >= 100 ? 'text-emerald-300' : 'text-white'}`}>{progressPercent}%</p>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-1000 ${progressPercent >= 100 ? 'bg-emerald-400' : 'bg-white'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-indigo-200 text-[10px] font-bold">₹0</p>
                      <p className="text-indigo-200 text-[10px] font-bold">₹{targetAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Target Card */}
              {specialTarget && (
                <div className="relative bg-gradient-to-br from-rose-500 via-pink-600 to-orange-500 rounded-3xl p-10 text-white shadow-2xl shadow-rose-200 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <p className="text-rose-200 font-black uppercase tracking-[0.3em] text-[10px] mb-1">⚡ Special Target</p>
                    <p className="text-white font-black text-2xl mb-3" style={{ letterSpacing: '-0.01em' }}>{specialTarget.name}</p>
                    {specialTarget.description && (
                      <p className="text-rose-200 text-sm font-bold mb-4">{specialTarget.description}</p>
                    )}
                    <div className="text-white font-black leading-none mb-4" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
                      ₹{specialTarget.targetAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">✅ Achieved</p>
                        <p className="text-white font-black text-2xl">₹{totalTeamSales.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">🎯 Remaining</p>
                        <p className={`font-black text-2xl ${specialRemaining <= 0 ? 'text-emerald-300' : 'text-yellow-200'}`}>
                          {specialRemaining <= 0 ? '🏆 Done!' : `₹${specialRemaining.toLocaleString('en-IN')}`}
                        </p>
                      </div>
                      <div className="bg-white/15 rounded-2xl p-4">
                        <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">📈 Progress</p>
                        <p className={`font-black text-2xl ${specialPercent >= 100 ? 'text-emerald-300' : 'text-white'}`}>{specialPercent}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-4 rounded-full transition-all duration-1000 ${specialPercent >= 100 ? 'bg-emerald-400' : 'bg-yellow-300'}`}
                        style={{ width: `${specialPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <p className="text-rose-200 text-[10px] font-bold">₹0</p>
                      <p className="text-rose-200 text-[10px] font-bold">₹{specialTarget.targetAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Attendance Tracker */}
          <RealtimeAttendance
            employees={employees}
            attendance={attendance}
            lateThreshold={systemSettings.lateThreshold}
            halfDayThreshold={systemSettings.halfDayThreshold}
          />

          {/* Monthly Payroll Report */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">End of Month Payroll Report</h3>
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
                        <span className="text-[10px] font-black uppercase text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">Payroll Ready</span>
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
          {/* ━━━ MONTHLY TARGET SECTION (Big Font) ━━━ */}
          {targetAmount > 0 && (
            <div className="space-y-4 animate-slide-up">
              {/* Target Card — Giant font display */}
              <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-200 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <p className="text-indigo-200 font-black uppercase tracking-[0.3em] text-[10px] mb-2">📊 Target for {monthName}</p>
                  <div
                    className="text-white font-black leading-none mb-3"
                    style={{ fontSize: 'clamp(3.5rem, 8vw, 5.5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
                  >
                    ₹{targetAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-indigo-200 font-bold text-sm uppercase tracking-widest">Monthly Sales Target</p>
                </div>
              </div>

              {/* Progress Cards Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Achievement */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">✅ Your Achievement</p>
                  <p
                    className="font-black text-emerald-600 leading-none"
                    style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
                  >
                    ₹{currentMonthSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">This Month</p>
                </div>

                {/* Remaining */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${remaining <= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">🎯 Remaining</p>
                  <p
                    className={`font-black leading-none ${remaining <= 0 ? 'text-emerald-600' : 'text-orange-600'}`}
                    style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}
                  >
                    {remaining <= 0 ? '🏆 Done!' : `₹${remaining.toLocaleString('en-IN')}`}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">{remaining <= 0 ? 'Target Achieved!' : 'To Go'}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-black text-gray-800 text-sm uppercase tracking-widest">Progress</p>
                  <p className={`font-black text-3xl ${progressPercent >= 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>{progressPercent}%</p>
                </div>
                {/* Track */}
                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all duration-1000 ease-out ${progressPercent >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[10px] font-bold text-gray-400">₹0</p>
                  <p className="text-[10px] font-bold text-gray-400">₹{targetAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ SPECIAL TARGET SECTION (Employee View) ━━━ */}
          {specialTarget && (
            <div className="space-y-4 animate-slide-up">
              {/* Special Target Header Card */}
              <div className="relative bg-gradient-to-br from-rose-500 via-pink-600 to-orange-500 rounded-3xl p-10 text-white shadow-2xl shadow-rose-200 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <p className="text-rose-200 font-black uppercase tracking-[0.3em] text-[10px] mb-1">⚡ Special Target</p>
                  <p className="text-white font-black text-2xl mb-4">{specialTarget.name}</p>
                  {specialTarget.description && (
                    <p className="text-rose-200 text-sm font-bold mb-4">{specialTarget.description}</p>
                  )}
                  <div
                    className="text-white font-black leading-none mb-3"
                    style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
                  >
                    ₹{specialTarget.targetAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-rose-200 font-bold text-sm uppercase tracking-widest">Special Sales Target</p>
                </div>
              </div>

              {/* Special Progress Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-full blur-2xl" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">⚡ Your Achievement</p>
                  <p className="font-black text-rose-600 leading-none" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                    ₹{currentMonthSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">This Month</p>
                </div>
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${specialRemaining <= 0 ? 'bg-emerald-50' : 'bg-orange-50'}`} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">🎯 Remaining</p>
                  <p className={`font-black leading-none ${specialRemaining <= 0 ? 'text-emerald-600' : 'text-orange-600'}`} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                    {specialRemaining <= 0 ? '🏆 Done!' : `₹${specialRemaining.toLocaleString('en-IN')}`}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">{specialRemaining <= 0 ? 'Special Achieved!' : 'To Go'}</p>
                </div>
              </div>

              {/* Special Progress Bar */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-black text-gray-800 text-sm uppercase tracking-widest">⚡ Special Progress</p>
                  <p className={`font-black text-3xl ${specialPercent >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{specialPercent}%</p>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all duration-1000 ease-out ${specialPercent >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-rose-500 to-orange-500'}`}
                    style={{ width: `${specialPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[10px] font-bold text-gray-400">₹0</p>
                  <p className="text-[10px] font-bold text-gray-400">₹{specialTarget.targetAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {/* ━━━ PERSONAL TARGET SECTION (Employee View - Private) ━━━ */}
          {personalTargetAmount > 0 && (
            <div className="space-y-4 animate-slide-up">
              {/* Personal Target Header Card */}
              <div className="relative bg-gradient-to-br from-emerald-600 via-teal-705 to-cyan-800 rounded-3xl p-10 text-white shadow-2xl shadow-emerald-100 overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200">👤 My Personal Target</span>
                    <span className="bg-emerald-500/30 text-emerald-100 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-400/20">Private View</span>
                  </div>
                  <div
                    className="text-white font-black leading-none mb-3"
                    style={{ fontSize: 'clamp(3rem, 7.5vw, 5rem)', textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}
                  >
                    ₹{personalTargetAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-emerald-100 font-bold text-xs uppercase tracking-widest">Your Private Monthly Sales Goal</p>
                </div>
              </div>

              {/* Progress Cards Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Your Personal Sales Achievement */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full blur-2xl" />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">📈 Your Contribution</p>
                  <p className="font-black text-emerald-600 leading-none" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                    ₹{currentMonthSales.toLocaleString('en-IN')}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">Sales Done by You</p>
                </div>

                {/* Remaining */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl ${personalRemaining <= 0 ? 'bg-emerald-50' : 'bg-cyan-50'}`} />
                  <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] mb-2">🎯 Left to Achieve</p>
                  <p className={`font-black leading-none ${personalRemaining <= 0 ? 'text-emerald-600' : 'text-cyan-600'}`} style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
                    {personalRemaining <= 0 ? '🏆 Done!' : `₹${personalRemaining.toLocaleString('en-IN')}`}
                  </p>
                  <p className="text-gray-400 text-xs font-bold mt-1">{personalRemaining <= 0 ? 'Target Mastered!' : 'Remaining to Goal'}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="font-black text-gray-800 text-sm uppercase tracking-widest">Target Progress</p>
                  <p className={`font-black text-3xl ${personalPercent >= 100 ? 'text-emerald-600' : 'text-teal-600'}`}>{personalPercent}%</p>
                </div>
                {/* Track */}
                <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all duration-1000 ease-out ${personalPercent >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500'}`}
                    style={{ width: `${personalPercent}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[10px] font-bold text-gray-400">₹0</p>
                  <p className="text-[10px] font-bold text-gray-400">₹{personalTargetAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Simple Clock In/Out Toggle for Employees */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8 animate-slide-up">
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Quick Attendance</h3>
                <p className="text-gray-500 font-medium">
                  {isClockedIn ? (
                    <>You clocked in at <span className="font-bold text-green-600">{userTodayAttendance?.clockIn}</span></>
                  ) : (
                    'Clock in to start your workday'
                  )}
                </p>
              </div>

              {/* Single Toggle Switch */}
              <div className="flex items-center justify-center">
                <div
                  onClick={handleClockToggle}
                  className={`relative w-32 h-16 rounded-full transition-all duration-300 shadow-lg select-none ${isProcessing
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : isClockedIn
                      ? 'bg-red-500 shadow-red-200 cursor-pointer hover:bg-red-600 hover:scale-105'
                      : 'bg-green-500 shadow-green-200 cursor-pointer hover:bg-green-600 hover:scale-105'
                    } ${isProcessing ? 'animate-pulse' : ''}`}
                  style={{
                    pointerEvents: isProcessing ? 'none' : 'auto',
                    userSelect: 'none'
                  }}
                >
                  {/* Toggle Circle */}
                  <div className={`absolute top-2 w-12 h-12 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${isClockedIn ? 'translate-x-16' : 'translate-x-2'
                    }`}>
                    {isProcessing ? (
                      <div className="w-6 h-6 border-3 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isClockedIn ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        )}
                      </svg>
                    )}
                  </div>

                  {/* Labels inside toggle */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-white text-sm font-bold pointer-events-none">
                    <span className={`transition-opacity ${isClockedIn ? 'opacity-0' : 'opacity-100'}`}>IN</span>
                    <span className={`transition-opacity ${isClockedIn ? 'opacity-100' : 'opacity-0'}`}>OUT</span>
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center">
                <p className={`text-xl font-bold ${isProcessing
                  ? 'text-gray-500'
                  : isClockedIn
                    ? 'text-red-600'
                    : 'text-green-600'
                  }`}>
                  {isProcessing ? 'Processing...' : isClockedIn ? 'Currently Clocked In' : 'Ready to Clock In'}
                </p>
              </div>
            </div>
          </div>

          {/* Announcement Card */}
          <div className="bg-white rounded-3xl p-8 text-gray-900 shadow-lg border border-gray-200 animate-slide-up">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-2">Announcement</p>
                <h4 className="text-2xl font-black mb-4">Happy New Year 2026!</h4>
                <p className="text-gray-500 max-w-md">Please ensure all leave regularization for December 2025 is completed by Friday.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
