
import React, { useState, useEffect } from 'react';
import { AttendanceRecord, Employee, AttendanceStatus } from '../types';
import { ICONS } from '../constants';

interface AttendanceProps {
  currentUser: Employee;
  attendance: AttendanceRecord[];
  onClockToggle: (id: string) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ currentUser, attendance, onClockToggle }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const activeRecord = attendance.find(a => a.employeeId === currentUser.id && a.date === todayStr && !a.clockOut);
  const myHistory = attendance.filter(a => a.employeeId === currentUser.id);

  // Mock calendar data for Jan 2026
  const daysInMonth = 31;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;
    const record = attendance.find(a => a.employeeId === currentUser.id && a.date === dateStr);
    return { day, record };
  });

  const getStatusColor = (status: AttendanceStatus) => {
    switch(status) {
      case AttendanceStatus.PRESENT: return 'bg-emerald-500';
      case AttendanceStatus.LATE: return 'bg-orange-500';
      case AttendanceStatus.HALFDAY: return 'bg-yellow-500';
      case AttendanceStatus.ABSENT: return 'bg-red-500';
      default: return 'bg-slate-200';
    }
  };

  return (
    <div className="animate-fade-in space-y-10">
      <div className="flex flex-col items-center">
        <div className="bg-emerald-50 text-emerald-700 px-6 py-3 rounded-2xl flex items-center space-x-3 mb-10 shadow-sm border border-emerald-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="font-bold text-sm tracking-tight uppercase">Office Premises (Verified)</span>
        </div>

        <button
          onClick={() => onClockToggle(currentUser.id)}
          className={`relative w-64 h-64 rounded-full border-[12px] flex flex-col items-center justify-center transition-all duration-500 shadow-2xl ${
            activeRecord ? 'bg-red-50 border-red-100 text-red-600' : 'bg-indigo-50 border-indigo-100 text-indigo-700'
          }`}
        >
          <div className="mb-2">{activeRecord ? ICONS.LogOut : ICONS.ClockIn}</div>
          <span className="text-xl font-black uppercase tracking-widest">
            {activeRecord ? 'Clock Out' : 'Clock In'}
          </span>
        </button>

        <div className="mt-8 text-center">
          <h2 className="text-4xl font-black text-gray-900 leading-none mb-1">
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </h2>
          <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">
            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendar View */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">January 2026</h3>
            <div className="flex space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['S','M','T','W','T','F','S'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-gray-300 mb-2 uppercase">{d}</div>
            ))}
            {Array.from({length: 4}).map((_,i) => <div key={i}></div>)} {/* Offset for Jan 2026 starting Thu */}
            {calendarDays.map(({day, record}) => (
              <div key={day} className="relative group aspect-square flex items-center justify-center rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="text-sm font-bold text-gray-700">{day}</span>
                {record && (
                  <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${getStatusColor(record.status)}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detailed History */}
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Attendance Timeline</h3>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px] p-8 space-y-6">
            {myHistory.length > 0 ? myHistory.map((log) => (
              <div key={log.id} className="flex items-start space-x-6 relative group">
                <div className="absolute left-[7px] top-4 w-px h-full bg-slate-100 group-last:hidden"></div>
                <div className={`mt-1.5 w-4 h-4 rounded-full border-4 border-white shadow-md z-10 ${getStatusColor(log.status)}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-black text-gray-900">{new Date(log.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                      log.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                    }`}>{log.status}</span>
                  </div>
                  <p className="text-xs font-bold text-indigo-700 italic">{log.clockIn} - {log.clockOut || 'Shift Active'}</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p className="text-xs font-black uppercase tracking-widest">No logs recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
