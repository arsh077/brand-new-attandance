import React, { useState, useEffect } from 'react';
import { UserRole, Employee, AttendanceRecord, AttendanceStatus } from '../types';
import { MonthlyGoals, IncentiveTier } from '../services/firebaseTargetService';
import { firebaseSalesService } from '../services/firebaseSalesService';
import { firebaseEmployeeService } from '../services/firebaseEmployeeService';
import { SalesEntry } from '../types';

interface EmployeePayrollProps {
  currentUser: Employee;
  employees: Employee[];
  attendance: AttendanceRecord[];
  monthlyGoals: MonthlyGoals;
}

// ─── Business Logic Constants ──────────────────────────────────────────────────
const WORKING_DAYS_PER_MONTH = 26;
// Rule: every 2 late days → 1 day salary deducted
const LATE_DAYS_PER_CUT = 2;

function computePayroll(emp: Employee, attendance: AttendanceRecord[], yearMonthStr: string) {
  const monthAttendance = attendance.filter(
    (a) => a.employeeId === emp.id && a.date.startsWith(yearMonthStr)
  );
  const lateDays = monthAttendance.filter((a) => a.status === AttendanceStatus.LATE).length;
  const halfDays = monthAttendance.filter((a) => a.status === AttendanceStatus.HALFDAY).length;
  const presentDays = monthAttendance.filter((a) => a.status === AttendanceStatus.PRESENT).length;

  const salaryCutDays = Math.floor(lateDays / LATE_DAYS_PER_CUT);
  const dailyRate = (emp.salary || 0) / WORKING_DAYS_PER_MONTH;
  const lateDeduction = salaryCutDays * dailyRate;
  const halfDayDeduction = halfDays * (dailyRate / 2);
  const totalDeduction = lateDeduction + halfDayDeduction;
  const netSalary = Math.max(0, (emp.salary || 0) - totalDeduction);

  return {
    baseSalary: emp.salary || 0,
    lateDays,
    halfDays,
    presentDays,
    salaryCutDays,
    dailyRate,
    lateDeduction,
    halfDayDeduction,
    totalDeduction,
    netSalary,
  };
}

function computeIncentiveTier(
  mySales: number,
  tiers: IncentiveTier[]
): { currentTier: IncentiveTier | null; nextTier: IncentiveTier | null; bonusEarned: number } {
  if (!tiers || tiers.length === 0) return { currentTier: null, nextTier: null, bonusEarned: 0 };
  const sorted = [...tiers].sort((a, b) => a.salesAmount - b.salesAmount);
  let currentTier: IncentiveTier | null = null;
  let nextTier: IncentiveTier | null = null;
  for (let i = 0; i < sorted.length; i++) {
    if (mySales >= sorted[i].salesAmount) {
      currentTier = sorted[i];
    } else {
      nextTier = sorted[i];
      break;
    }
  }
  return { currentTier, nextTier, bonusEarned: currentTier?.bonus || 0 };
}

// ─── Employee Profile Modal ────────────────────────────────────────────────────
interface ProfileModalProps {
  emp: Employee;
  attendance: AttendanceRecord[];
  monthlyGoals: MonthlyGoals;
  yearMonthStr: string;
  mySales: number;
  isAdmin: boolean;
  onSalaryUpdate: (empId: string, newSalary: number) => void;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ emp, attendance, monthlyGoals, yearMonthStr, mySales, isAdmin, onSalaryUpdate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'salary' | 'incentive'>('salary');
  const [editingSalary, setEditingSalary] = useState(false);
  const [salaryInput, setSalaryInput] = useState(emp.salary || 0);
  const [savingSalary, setSavingSalary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use local salary state so UI updates instantly after save
  const [localSalary, setLocalSalary] = useState(emp.salary || 0);
  const empWithLocalSalary = { ...emp, salary: localSalary };

  const payroll = computePayroll(empWithLocalSalary, attendance, yearMonthStr);
  const now = new Date();

  const specialTarget = monthlyGoals?.specialTarget || null;
  const tiers = specialTarget?.tiers || [];
  const { currentTier, nextTier, bonusEarned } = computeIncentiveTier(mySales, tiers);
  const personalTarget = emp.personalTarget || 0;
  const personalPercent = personalTarget > 0 ? Math.min(100, Math.round((mySales / personalTarget) * 100)) : 0;
  const specialPercent =
    specialTarget && specialTarget.targetAmount > 0
      ? Math.min(100, Math.round((mySales / specialTarget.targetAmount) * 100))
      : 0;

  // Countdown for special target campaign
  const today = now.toISOString().split('T')[0];
  const endDate = specialTarget?.endDate || null;
  const daysLeft = endDate
    ? Math.max(0, Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / 86400000))
    : null;
  const isExpired = endDate ? new Date(endDate) < new Date(today) : false;

  const initials = emp.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleSaveSalary = async () => {
    if (salaryInput <= 0) return;
    setSavingSalary(true);
    try {
      await firebaseEmployeeService.updateEmployee({ ...emp, salary: salaryInput });
      setLocalSalary(salaryInput);
      onSalaryUpdate(emp.id, salaryInput);
      setEditingSalary(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('❌ Salary update failed: ' + err);
    } finally {
      setSavingSalary(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideUp 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-t-3xl p-8 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative z-10 flex items-center space-x-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-black border border-white/20 shadow-inner">
              {initials}
            </div>
            <div>
              <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Employee Profile</p>
              <h3 className="text-2xl font-black text-white leading-tight">{emp.name}</h3>
              <p className="text-indigo-200 text-sm font-bold">{emp.designation} · {emp.department}</p>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('salary')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === 'salary'
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            💰 Salary Details
          </button>
          <button
            onClick={() => setActiveTab('incentive')}
            className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === 'incentive'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            🎯 Incentives
          </button>
        </div>

        {/* ── SALARY TAB ── */}
        {activeTab === 'salary' && (
          <div className="p-6 space-y-5">

            {/* ── ADMIN: Edit Base Salary ── */}
            {isAdmin && (
              <div className={`rounded-2xl border-2 p-5 transition-all duration-200 ${
                editingSalary ? 'border-indigo-300 bg-indigo-50' : 'border-dashed border-gray-200 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50/40'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">✏️</span>
                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">Edit Base Salary</p>
                    {saveSuccess && (
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">✅ Saved!</span>
                    )}
                  </div>
                  {!editingSalary ? (
                    <button
                      onClick={() => { setSalaryInput(localSalary); setEditingSalary(true); }}
                      className="flex items-center space-x-1.5 bg-indigo-600 text-white text-xs font-black px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Salary</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingSalary(false)}
                        className="text-xs font-black text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveSalary}
                        disabled={savingSalary}
                        className={`flex items-center space-x-1.5 text-xs font-black px-4 py-2 rounded-xl text-white transition-all ${
                          savingSalary ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100'
                        }`}
                      >
                        {savingSalary ? (
                          <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> <span>Saving...</span></>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg><span>Save</span></>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {!editingSalary ? (
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-black text-gray-800">₹{localSalary.toLocaleString('en-IN')}</p>
                    <p className="text-xs font-bold text-gray-400">current base salary</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 font-black text-xl">₹</span>
                      <input
                        type="number"
                        min="0"
                        autoFocus
                        value={salaryInput || ''}
                        onChange={(e) => setSalaryInput(Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSalary(); if (e.key === 'Escape') setEditingSalary(false); }}
                        className="w-full bg-white border-2 border-indigo-200 rounded-2xl pl-10 pr-4 py-3.5 font-black text-gray-900 text-2xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder="Enter new salary"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {[8000, 10000, 12000, 15000, 20000, 25000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setSalaryInput(amt)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                            salaryInput === amt
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                        >
                          ₹{(amt/1000)}k
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400">Press Enter to save · Escape to cancel</p>
                  </div>
                )}
              </div>
            )}

            {/* Big net salary */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100 text-center">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Net Salary This Month</p>
              <p className={`font-black leading-none ${payroll.totalDeduction > 0 ? 'text-orange-600' : 'text-emerald-600'}`}
                style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}>
                ₹{payroll.netSalary.toLocaleString('en-IN')}
              </p>
              {payroll.totalDeduction > 0 && (
                <p className="text-rose-500 font-bold text-sm mt-2">
                  ₹{Math.round(payroll.totalDeduction).toLocaleString('en-IN')} deducted
                </p>
              )}
            </div>

            {/* Salary Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Base Salary</p>
                <p className="text-gray-900 font-black text-xl">₹{payroll.baseSalary.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Rate</p>
                <p className="text-gray-900 font-black text-xl">₹{Math.round(payroll.dailyRate).toLocaleString('en-IN')}</p>
                <p className="text-gray-400 text-[10px] font-bold">÷ {WORKING_DAYS_PER_MONTH} working days</p>
              </div>
              <div className="bg-white border border-orange-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">⏰ Late Days</p>
                <p className="text-orange-600 font-black text-xl">{payroll.lateDays} days</p>
                <p className="text-gray-400 text-[10px] font-bold">Every 2 lates = 1 day cut</p>
              </div>
              <div className="bg-white border border-rose-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">✂️ Days Cut</p>
                <p className="text-rose-600 font-black text-xl">{payroll.salaryCutDays} days</p>
                <p className="text-gray-400 text-[10px] font-bold">= ₹{Math.round(payroll.lateDeduction).toLocaleString('en-IN')} deducted</p>
              </div>
              {payroll.halfDays > 0 && (
                <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">🌓 Half Days</p>
                  <p className="text-amber-600 font-black text-xl">{payroll.halfDays} days</p>
                  <p className="text-gray-400 text-[10px] font-bold">= ₹{Math.round(payroll.halfDayDeduction).toLocaleString('en-IN')} deducted</p>
                </div>
              )}
              <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">✅ Present Days</p>
                <p className="text-emerald-600 font-black text-xl">{payroll.presentDays} days</p>
              </div>
            </div>

            {/* Deduction Bar */}
            {payroll.baseSalary > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-black text-gray-700 uppercase tracking-widest">Salary Breakdown</p>
                  <p className="text-sm font-bold text-gray-400">
                    {Math.round((payroll.totalDeduction / payroll.baseSalary) * 100)}% deducted
                  </p>
                </div>
                <div className="w-full h-5 rounded-full bg-gray-100 overflow-hidden flex">
                  <div
                    className="h-5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-l-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round((payroll.netSalary / payroll.baseSalary) * 100))}%` }}
                  />
                  {payroll.totalDeduction > 0 && (
                    <div
                      className="h-5 bg-gradient-to-r from-rose-400 to-rose-600 rounded-r-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, Math.round((payroll.totalDeduction / payroll.baseSalary) * 100))}%` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold">
                  <span className="text-emerald-600">Net ₹{payroll.netSalary.toLocaleString('en-IN')}</span>
                  {payroll.totalDeduction > 0 && (
                    <span className="text-rose-500">Cut ₹{Math.round(payroll.totalDeduction).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Deduction Rule Note */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-amber-800 text-xs font-black uppercase tracking-widest mb-1">📋 Deduction Rule</p>
              <p className="text-amber-700 text-sm font-bold">
                Every <span className="text-amber-900">2 late days</span> = <span className="text-red-700">1 day salary deducted</span>.
                Half-days count as 0.5 day deduction.
              </p>
            </div>
          </div>
        )}

        {/* ── INCENTIVE TAB ── */}
        {activeTab === 'incentive' && (
          <div className="p-6 space-y-5">
            {/* Personal Target Progress */}
            {personalTarget > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">👤 Personal Target</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target</p>
                    <p className="text-indigo-700 font-black text-lg">₹{personalTarget.toLocaleString('en-IN')}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Achieved</p>
                    <p className="text-emerald-700 font-black text-lg">₹{mySales.toLocaleString('en-IN')}</p>
                  </div>
                  <div className={`rounded-2xl p-4 border ${personalPercent >= 100 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Progress</p>
                    <p className={`font-black text-lg ${personalPercent >= 100 ? 'text-emerald-700' : 'text-orange-600'}`}>{personalPercent}%</p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-1000 ${personalPercent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
                    style={{ width: `${personalPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Special Target */}
            {specialTarget ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-widest">⚡ Special Target: {specialTarget.name}</p>
                  {daysLeft !== null && (
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                      isExpired ? 'bg-gray-100 text-gray-500' :
                      daysLeft === 0 ? 'bg-red-100 text-red-700' :
                      daysLeft <= 2 ? 'bg-orange-100 text-orange-700 animate-pulse' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isExpired ? '⏰ Expired' : daysLeft === 0 ? '🔥 Last Day!' : `⏳ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
                    </span>
                  )}
                </div>

                {specialTarget.description && (
                  <p className="text-gray-500 text-sm font-medium">{specialTarget.description}</p>
                )}

                {/* Special Progress */}
                <div className="relative bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-6 text-white overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">Your Sales</p>
                        <p className="text-white font-black text-2xl">₹{mySales.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-rose-200 text-[10px] font-black uppercase tracking-widest mb-1">Campaign Target</p>
                        <p className="text-white font-black text-2xl">₹{specialTarget.targetAmount.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000 ${specialPercent >= 100 ? 'bg-emerald-400' : 'bg-yellow-300'}`}
                        style={{ width: `${specialPercent}%` }}
                      />
                    </div>
                    <p className="text-rose-200 text-right text-xs font-bold mt-1">{specialPercent}% achieved</p>
                  </div>
                </div>

                {/* Incentive Tiers */}
                {tiers.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-amber-50 px-5 py-3 border-b border-amber-100">
                      <p className="text-xs font-black text-amber-800 uppercase tracking-widest">💰 Incentive Slabs</p>
                    </div>
                    <div className="p-4 space-y-2">
                      {[...tiers]
                        .sort((a, b) => a.salesAmount - b.salesAmount)
                        .map((tier, i) => {
                          const achieved = mySales >= tier.salesAmount;
                          const isCurrent = currentTier?.salesAmount === tier.salesAmount;
                          return (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                isCurrent
                                  ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                                  : achieved
                                  ? 'bg-green-50 border-green-100'
                                  : 'bg-gray-50 border-gray-100 opacity-60'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <span className="text-lg">
                                  {isCurrent ? '🏆' : achieved ? '✅' : '🔒'}
                                </span>
                                <div>
                                  <p className={`font-black text-sm ${achieved ? 'text-gray-900' : 'text-gray-400'}`}>
                                    ₹{tier.salesAmount.toLocaleString('en-IN')} sales
                                  </p>
                                  {!achieved && (
                                    <p className="text-[10px] font-bold text-gray-400">
                                      ₹{(tier.salesAmount - mySales).toLocaleString('en-IN')} more to unlock
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`font-black text-base ${isCurrent ? 'text-emerald-600' : achieved ? 'text-emerald-500' : 'text-gray-400'}`}>
                                  +₹{tier.bonus.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] font-bold text-gray-400">bonus</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Bonus Earned Summary */}
                    <div className={`p-4 border-t ${bonusEarned > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex justify-between items-center">
                        <p className={`font-black text-sm uppercase tracking-widest ${bonusEarned > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {bonusEarned > 0 ? '🎉 Bonus Earned' : '⏳ No Bonus Yet'}
                        </p>
                        <p className={`font-black text-2xl ${bonusEarned > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {bonusEarned > 0 ? `+₹${bonusEarned.toLocaleString('en-IN')}` : '₹0'}
                        </p>
                      </div>
                      {nextTier && (
                        <p className="text-xs font-bold text-gray-500 mt-2">
                          Next tier: Sell ₹{nextTier.salesAmount.toLocaleString('en-IN')} → earn ₹{nextTier.bonus.toLocaleString('en-IN')} bonus
                          (₹{(nextTier.salesAmount - mySales).toLocaleString('en-IN')} more needed)
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-gray-500 font-bold">No Special Target active</p>
                <p className="text-gray-400 text-sm font-medium">Admin can set one from the Admin Panel → Monthly Goals</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main EmployeePayroll Page ─────────────────────────────────────────────────
const EmployeePayroll: React.FC<EmployeePayrollProps> = ({
  currentUser,
  employees: initialEmployees,
  attendance,
  monthlyGoals,
}) => {
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const now = new Date();
  const yearMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Local employees state so salary edits reflect instantly in cards
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  useEffect(() => { setEmployees(initialEmployees); }, [initialEmployees]);

  const handleSalaryUpdate = (empId: string, newSalary: number) => {
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, salary: newSalary } : e));
  };

  // Only show all employees to admin; employees see only themselves
  const visibleEmployees = isAdmin
    ? employees.filter((e) => e.status === 'ACTIVE' || (e as any).status === undefined)
    : employees.filter((e) => e.id === currentUser.id);

  // Live sales data per employee from Firebase
  const [salesByEmployee, setSalesByEmployee] = useState<Record<string, number>>({});
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  useEffect(() => {
    const unsub = firebaseSalesService.subscribeToMonthlySales(yearMonthStr, (entries: SalesEntry[]) => {
      const map: Record<string, number> = {};
      entries.forEach((e) => {
        map[e.employeeId] = (map[e.employeeId] || 0) + (Number(e.amount) || 0);
      });
      setSalesByEmployee(map);
    });
    return () => unsub();
  }, [yearMonthStr]);

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">
            {isAdmin ? '💰 Employee Payroll' : '💰 My Payroll'}
          </h2>
          <p className="text-gray-400 font-medium mt-1">
            {isAdmin
              ? `Salary details & deductions for all employees — ${monthName}`
              : `Your salary breakdown & incentives — ${monthName}`}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-right">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Deduction Rule</p>
          <p className="text-amber-800 font-bold text-sm">2 Late Days = 1 Day Cut</p>
        </div>
      </div>

      {/* Monthly Summary Banner (Admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const totalSalary = visibleEmployees.reduce((s, e) => s + (e.salary || 0), 0);
            const totalDeduction = visibleEmployees.reduce((s, e) => {
              const p = computePayroll(e, attendance, yearMonthStr);
              return s + p.totalDeduction;
            }, 0);
            const totalNet = totalSalary - totalDeduction;
            const totalLate = visibleEmployees.reduce((s, e) => {
              const p = computePayroll(e, attendance, yearMonthStr);
              return s + p.lateDays;
            }, 0);
            return [
              { label: 'Total Payroll', value: `₹${totalSalary.toLocaleString('en-IN')}`, color: 'indigo', icon: '💼' },
              { label: 'Total Deductions', value: `₹${Math.round(totalDeduction).toLocaleString('en-IN')}`, color: 'rose', icon: '✂️' },
              { label: 'Net Payout', value: `₹${Math.round(totalNet).toLocaleString('en-IN')}`, color: 'emerald', icon: '✅' },
              { label: 'Total Late Days', value: `${totalLate} days`, color: 'orange', icon: '⏰' },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white rounded-2xl border border-${stat.color}-100 shadow-sm p-5`}>
                <p className="text-lg mb-1">{stat.icon}</p>
                <p className={`text-[10px] font-black text-${stat.color}-400 uppercase tracking-widest mb-1`}>{stat.label}</p>
                <p className={`font-black text-${stat.color}-700 text-xl`}>{stat.value}</p>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleEmployees.map((emp) => {
          const payroll = computePayroll(emp, attendance, yearMonthStr);
          const mySales = salesByEmployee[emp.id] || 0;
          const initials = emp.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase();
          const specialTarget = monthlyGoals?.specialTarget || null;
          const tiers = specialTarget?.tiers || [];
          const { currentTier, bonusEarned } = computeIncentiveTier(mySales, tiers);
          const personalTarget = emp.personalTarget || 0;
          const personalPercent =
            personalTarget > 0 ? Math.min(100, Math.round((mySales / personalTarget) * 100)) : 0;

          return (
            <div
              key={emp.id}
              onClick={() => setSelectedEmp(emp)}
              className="bg-white rounded-3xl border border-gray-100 shadow-md hover:shadow-xl hover:border-indigo-200 transition-all duration-200 cursor-pointer hover:scale-[1.01] group overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex items-center p-6 border-b border-gray-50">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 flex items-center justify-center text-base font-black mr-4 border border-indigo-100">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-gray-900 text-base leading-tight truncate">{emp.name}</h4>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{emp.designation}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base</p>
                  <p className="font-black text-gray-700 text-sm">₹{(emp.salary || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="ml-3 w-8 h-8 rounded-full bg-gray-50 group-hover:bg-indigo-50 border border-gray-100 group-hover:border-indigo-200 flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 pt-4 space-y-4">
                {/* Salary stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Late Days</p>
                    <p className={`font-black text-base ${payroll.lateDays > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {payroll.lateDays}
                    </p>
                  </div>
                  <div className="bg-rose-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-0.5">Deduction</p>
                    <p className={`font-black text-base ${payroll.totalDeduction > 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                      {payroll.totalDeduction > 0 ? `-₹${Math.round(payroll.totalDeduction).toLocaleString('en-IN')}` : '₹0'}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Net Pay</p>
                    <p className={`font-black text-base ${payroll.totalDeduction > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      ₹{Math.round(payroll.netSalary).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Deduction bar */}
                {payroll.baseSalary > 0 && (
                  <div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full"
                        style={{ width: `${Math.min(100, Math.round((payroll.netSalary / payroll.baseSalary) * 100))}%` }}
                      />
                      {payroll.totalDeduction > 0 && (
                        <div
                          className="h-2 bg-gradient-to-r from-rose-400 to-rose-500"
                          style={{ width: `${Math.min(100, Math.round((payroll.totalDeduction / payroll.baseSalary) * 100))}%` }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Incentive row */}
                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">My Sales</p>
                    <p className="font-black text-indigo-600 text-sm">₹{mySales.toLocaleString('en-IN')}</p>
                  </div>
                  {personalTarget > 0 && (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${personalPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${personalPercent}%` }}
                        />
                      </div>
                      <p className="text-[9px] font-black text-gray-400">{personalPercent}%</p>
                    </div>
                  )}
                  {bonusEarned > 0 && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full border border-emerald-200">
                      +₹{bonusEarned.toLocaleString('en-IN')} bonus
                    </span>
                  )}
                  {currentTier && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full border border-amber-200">
                      🏆 Slab hit!
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleEmployees.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">👤</p>
          <p className="text-gray-500 font-bold">No employees found</p>
        </div>
      )}

      {/* Profile Modal */}
      {selectedEmp && (
        <ProfileModal
          emp={employees.find(e => e.id === selectedEmp.id) || selectedEmp}
          attendance={attendance}
          monthlyGoals={monthlyGoals}
          yearMonthStr={yearMonthStr}
          mySales={salesByEmployee[selectedEmp.id] || 0}
          isAdmin={isAdmin}
          onSalaryUpdate={handleSalaryUpdate}
          onClose={() => setSelectedEmp(null)}
        />
      )}

      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(40px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default EmployeePayroll;
