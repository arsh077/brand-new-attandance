
import React, { useState, useEffect } from 'react';
import { UserRole, Employee, AttendanceRecord, LeaveRequest, LeaveStatus, AttendanceStatus } from './types';
import { authService } from './services/authService';
import { realtimeService } from './services/realtimeService';
import { pusherService } from './services/pusherService';
import { INITIAL_EMPLOYEES, AUTHORIZED_USERS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Employees from './pages/Employees';
import Login from './pages/Login';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('ls_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('ls_attendance');
    // Generate some history for Jan 2026 for demo
    if (!saved) {
      const history: AttendanceRecord[] = [];
      INITIAL_EMPLOYEES.forEach(emp => {
        for(let d=1; d < 15; d++) {
          const date = `2026-01-${d.toString().padStart(2, '0')}`;
          history.push({
            id: `ATT_${emp.id}_${d}`,
            employeeId: emp.id,
            date,
            clockIn: '09:05 AM',
            clockOut: '06:10 PM',
            status: d % 7 === 0 ? AttendanceStatus.ABSENT : (d % 10 === 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT)
          });
        }
      });
      return history;
    }
    return JSON.parse(saved);
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    const user = authService.getCurrentUser();
    // Verify session is valid
    if (user && !authService.verifySession()) {
      authService.logout();
      return null;
    }
    return user;
  });
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    localStorage.setItem('ls_employees', JSON.stringify(employees));
    localStorage.setItem('ls_attendance', JSON.stringify(attendance));
    localStorage.setItem('last_update', Date.now().toString());
    
    // Broadcast attendance updates via ALL channels
    pusherService.triggerAttendanceUpdate(attendance);
    realtimeService.broadcastAttendanceUpdate(attendance);
    
    // Also trigger a custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('attendance-changed', { 
      detail: { attendance, timestamp: Date.now() } 
    }));
  }, [employees, attendance]);

  // Setup real-time listeners (Pusher + BroadcastChannel + Polling)
  useEffect(() => {
    console.log('🔧 Setting up real-time listeners...');
    
    // PUSHER LISTENERS (Primary - Most Reliable)
    const unsubPusherClockIn = pusherService.on('CLOCK_IN', (data: any) => {
      console.log('🟢 Pusher: Employee clocked in', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    const unsubPusherClockOut = pusherService.on('CLOCK_OUT', (data: any) => {
      console.log('🔴 Pusher: Employee clocked out', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    const unsubPusherAttendance = pusherService.on('ATTENDANCE_UPDATE', (data: any) => {
      console.log('📊 Pusher: Attendance updated', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    // BROADCAST CHANNEL LISTENERS (Backup)
    const unsubClockIn = realtimeService.on('CLOCK_IN', (data: any) => {
      console.log('🟢 BroadcastChannel: Employee clocked in', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    const unsubClockOut = realtimeService.on('CLOCK_OUT', (data: any) => {
      console.log('🔴 BroadcastChannel: Employee clocked out', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    const unsubAttendance = realtimeService.on('ATTENDANCE_UPDATE', (data: any) => {
      console.log('📊 BroadcastChannel: Attendance updated', data);
      const storedAttendance = localStorage.getItem('ls_attendance');
      if (storedAttendance) {
        setAttendance(JSON.parse(storedAttendance));
      }
    });

    // STORAGE EVENT LISTENER (Cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ls_attendance' && e.newValue) {
        console.log('💾 Storage changed: Syncing attendance');
        setAttendance(JSON.parse(e.newValue));
      }
    };
    
    window.addEventListener('storage', handleStorageChange);

    // POLLING MECHANISM (Fallback - checks every 2 seconds)
    let lastUpdate = Date.now();
    const pollInterval = setInterval(() => {
      const storedAttendance = localStorage.getItem('ls_attendance');
      const lastUpdateTime = localStorage.getItem('last_update');
      
      if (storedAttendance && lastUpdateTime && parseInt(lastUpdateTime) > lastUpdate) {
        console.log('🔄 Polling: Detected attendance change, syncing...');
        setAttendance(JSON.parse(storedAttendance));
        lastUpdate = parseInt(lastUpdateTime);
      }
    }, 2000);

    // Cleanup
    return () => {
      unsubPusherClockIn();
      unsubPusherClockOut();
      unsubPusherAttendance();
      unsubClockIn();
      unsubClockOut();
      unsubAttendance();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, []);

  const handleLogin = (role: UserRole, email: string) => {
    // First, ensure employees are loaded from INITIAL_EMPLOYEES if not in state
    const currentEmployees = employees.length > 0 ? employees : INITIAL_EMPLOYEES;
    
    const user = currentEmployees.find(e => e.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      // If user not found, reload from INITIAL_EMPLOYEES and try again
      setEmployees(INITIAL_EMPLOYEES);
      localStorage.setItem('ls_employees', JSON.stringify(INITIAL_EMPLOYEES));
      
      const userRetry = INITIAL_EMPLOYEES.find(e => e.email.toLowerCase() === email.toLowerCase());
      if (!userRetry) {
        alert('User not found. Please contact administrator.');
        return;
      }
      
      // Use the found user from retry
      completeLogin(userRetry, role, email);
      return;
    }
    
    completeLogin(user, role, email);
  };

  const completeLogin = (user: Employee, role: UserRole, email: string) => {
    // Create auth token for session
    const authUser = AUTHORIZED_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (authUser) {
      const token = btoa(`${authUser.email}:${authUser.password}`);
      localStorage.setItem('auth_token', token);
    }
    
    // Set user in auth service
    authService.login(role);
    localStorage.setItem('user', JSON.stringify(user));
    
    // Force update state
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  // State Mutators
  const onClockToggle = (empId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendance.find(a => a.employeeId === empId && a.date === today && !a.clockOut);

    if (existing) {
      // Clock Out
      const clockOutTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const updatedAttendance = attendance.map(a => 
        a.id === existing.id ? { ...a, clockOut: clockOutTime } : a
      );
      setAttendance(updatedAttendance);
      
      // Broadcast clock out event via ALL channels
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        const clockInTime = new Date(`${today} ${existing.clockIn}`);
        const clockOutTimeObj = new Date();
        const duration = Math.round((clockOutTimeObj.getTime() - clockInTime.getTime()) / (1000 * 60));
        const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;
        
        // Pusher (Primary)
        pusherService.triggerClockOut(empId, employee.name, clockOutTime, durationStr);
        
        // BroadcastChannel (Backup)
        realtimeService.broadcastClockOut(empId, employee.name, clockOutTime, durationStr);
      }
    } else {
      // Clock In
      const now = new Date();
      const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
      const clockInTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      const newRecord: AttendanceRecord = {
        id: `ATT${Math.random().toString(36).substr(2, 9)}`,
        employeeId: empId,
        date: today,
        clockIn: clockInTime,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
      };
      setAttendance(prev => [newRecord, ...prev]);
      
      // Broadcast clock in event via ALL channels
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        // Pusher (Primary)
        pusherService.triggerClockIn(empId, employee.name, clockInTime, isLate);
        
        // BroadcastChannel (Backup)
        realtimeService.broadcastClockIn(empId, employee.name, clockInTime, isLate);
      }
    }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard 
          role={currentUser.role} 
          employees={employees} 
          attendance={attendance} 
          leaves={leaveRequests}
          currentUser={currentUser}
        />;
      case 'attendance':
        return <Attendance 
          currentUser={currentUser} 
          attendance={attendance} 
          onClockToggle={onClockToggle} 
        />;
      case 'leaves':
        return <Leaves 
          role={currentUser.role} 
          currentUser={currentUser} 
          requests={leaveRequests} 
          onApply={(r) => setLeaveRequests([r, ...leaveRequests])} 
          onAction={(id, s) => setLeaveRequests(leaveRequests.map(r => r.id === id ? {...r, status: s} : r))} 
        />;
      case 'employees':
        return <Employees 
          employees={employees} 
          onAdd={(e) => setEmployees([...employees, e])}
          onUpdate={(e) => setEmployees(employees.map(p => p.id === e.id ? e : p))} 
          onDelete={(id) => confirm("Delete staff?") && setEmployees(employees.filter(e => e.id !== id))} 
        />;
      default:
        return <div className="p-8 text-gray-400 font-bold italic">Module coming soon...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar role={currentUser.role} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-100 h-20 flex items-center justify-between px-10 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{activeTab}</span>
          </div>
          
          <div className="flex items-center space-x-8">
            <button className="text-gray-300 hover:text-indigo-600 transition-colors">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <div className="h-8 w-px bg-gray-100"></div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-black text-gray-900 leading-tight tracking-tight">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{currentUser.designation}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-indigo-100">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
