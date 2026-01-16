
import React, { useState, useEffect } from 'react';
import { UserRole, Employee, AttendanceRecord, LeaveRequest, LeaveStatus, AttendanceStatus } from './types';
import { authService } from './services/authService';
import { realtimeService } from './services/realtimeService';
import { pusherService } from './services/pusherService';
import { notificationService, Notification } from './services/notificationService';
import { INITIAL_EMPLOYEES, AUTHORIZED_USERS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import Login from './pages/Login';
import NotificationBell from './components/NotificationBell';

const App: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('ls_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });
  
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('ls_attendance');
    // Start fresh - no demo data
    // Real attendance will be recorded from February onwards
    return saved ? JSON.parse(saved) : [];
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('ls_leave_requests');
    return saved ? JSON.parse(saved) : [];
  });
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
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('ls_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Clear old demo data on first load (one-time reset)
  useEffect(() => {
    const resetDone = localStorage.getItem('data_reset_feb_2026');
    if (!resetDone) {
      console.log('🔄 Resetting data for February 2026 fresh start...');
      localStorage.removeItem('ls_attendance');
      localStorage.setItem('data_reset_feb_2026', 'true');
      console.log('✅ Data reset complete. Fresh start from February!');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ls_employees', JSON.stringify(employees));
    localStorage.setItem('ls_attendance', JSON.stringify(attendance));
    localStorage.setItem('ls_leave_requests', JSON.stringify(leaveRequests));
    localStorage.setItem('ls_notifications', JSON.stringify(notifications));
    localStorage.setItem('last_update', Date.now().toString());
    
    // Broadcast attendance updates via ALL channels with actual data
    pusherService.triggerAttendanceUpdate(attendance);
    realtimeService.broadcastAttendanceUpdate(attendance);
    
    // Also trigger a custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('attendance-changed', { 
      detail: { attendance, timestamp: Date.now() } 
    }));
  }, [employees, attendance, leaveRequests, notifications]);

  // Setup real-time listeners (Pusher + BroadcastChannel + Polling)
  useEffect(() => {
    console.log('🔧 Setting up real-time listeners...');
    
    // Subscribe to notification service
    const unsubNotifications = notificationService.subscribe((notification) => {
      setNotifications(prev => [notification, ...prev]);
    });
    
    // PUSHER LISTENERS (Primary - Most Reliable for cross-device)
    const unsubPusherClockIn = pusherService.on('CLOCK_IN', (data: any) => {
      console.log('🟢 Pusher: Employee clocked in', data);
      // Force reload from localStorage (will be updated by other device)
      setTimeout(() => {
        const storedAttendance = localStorage.getItem('ls_attendance');
        if (storedAttendance) {
          setAttendance(JSON.parse(storedAttendance));
        }
      }, 100);
      
      // Create notification for admin only
      if (currentUser && currentUser.role === UserRole.ADMIN) {
        notificationService.clockIn(data.employeeName, data.clockIn, data.isLate);
      }
    });

    const unsubPusherClockOut = pusherService.on('CLOCK_OUT', (data: any) => {
      console.log('🔴 Pusher: Employee clocked out', data);
      setTimeout(() => {
        const storedAttendance = localStorage.getItem('ls_attendance');
        if (storedAttendance) {
          setAttendance(JSON.parse(storedAttendance));
        }
      }, 100);
      
      // Create notification for admin only
      if (currentUser && currentUser.role === UserRole.ADMIN) {
        notificationService.clockOut(data.employeeName, data.clockOut, data.duration);
      }
    });

    const unsubPusherAttendance = pusherService.on('ATTENDANCE_UPDATE', (data: any) => {
      console.log('📊 Pusher: Attendance updated', data);
      // Use the actual attendance data from the event
      if (data && data.attendance) {
        console.log('📥 Syncing attendance from Pusher event:', data.attendance.length, 'records');
        setAttendance(data.attendance);
        // Also update localStorage for persistence
        localStorage.setItem('ls_attendance', JSON.stringify(data.attendance));
      }
    });
    
    // LEAVE REQUEST LISTENERS
    const unsubPusherLeaveRequest = pusherService.on('LEAVE_REQUEST', (data: any) => {
      console.log('📝 Pusher: Leave request received', data);
      // Reload leave requests
      setTimeout(() => {
        const storedLeaves = localStorage.getItem('ls_leave_requests');
        if (storedLeaves) {
          setLeaveRequests(JSON.parse(storedLeaves));
        }
      }, 100);
      
      // Create notification for admin/manager only
      if (currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER)) {
        notificationService.leaveRequest(data.employeeName, data.leaveType, data.startDate, data.endDate);
      }
    });
    
    const unsubPusherLeaveAction = pusherService.on('LEAVE_ACTION', (data: any) => {
      console.log('✅ Pusher: Leave action taken', data);
      // Reload leave requests
      setTimeout(() => {
        const storedLeaves = localStorage.getItem('ls_leave_requests');
        if (storedLeaves) {
          setLeaveRequests(JSON.parse(storedLeaves));
        }
      }, 100);
      
      // Create notification for employee
      if (currentUser && data.employeeId === currentUser.id) {
        if (data.status === 'APPROVED') {
          notificationService.leaveApproved(data.leaveType);
        } else {
          notificationService.leaveRejected(data.leaveType);
        }
      }
    });

    // BROADCAST CHANNEL LISTENERS (Backup - same browser only)
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

    // POLLING MECHANISM (Fallback - checks every 1 second for faster sync)
    let lastUpdate = Date.now();
    const pollInterval = setInterval(() => {
      const storedAttendance = localStorage.getItem('ls_attendance');
      const lastUpdateTime = localStorage.getItem('last_update');
      
      if (storedAttendance && lastUpdateTime && parseInt(lastUpdateTime) > lastUpdate) {
        console.log('🔄 Polling: Detected attendance change, syncing...');
        setAttendance(JSON.parse(storedAttendance));
        lastUpdate = parseInt(lastUpdateTime);
      }
    }, 1000); // Check every 1 second instead of 2

    // Cleanup
    return () => {
      unsubNotifications();
      unsubPusherClockIn();
      unsubPusherClockOut();
      unsubPusherAttendance();
      unsubPusherLeaveRequest();
      unsubPusherLeaveAction();
      unsubClockIn();
      unsubClockOut();
      unsubAttendance();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [currentUser]);

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
  
  // Notification handlers
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const clearAllNotifications = () => {
    setNotifications([]);
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
        
        // Pusher (Primary) - with actual data
        pusherService.triggerClockOut(empId, employee.name, clockOutTime, durationStr);
        
        // BroadcastChannel (Backup)
        realtimeService.broadcastClockOut(empId, employee.name, clockOutTime, durationStr);
        
        // Force update localStorage with timestamp
        localStorage.setItem('ls_attendance', JSON.stringify(updatedAttendance));
        localStorage.setItem('last_update', Date.now().toString());
      }
    } else {
      // Clock In
      const now = new Date();
      // Late if after 10:40 AM (10 hours 40 minutes)
      const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 40);
      const clockInTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      
      const newRecord: AttendanceRecord = {
        id: `ATT${Math.random().toString(36).substr(2, 9)}`,
        employeeId: empId,
        date: today,
        clockIn: clockInTime,
        status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
      };
      const newAttendance = [newRecord, ...attendance];
      setAttendance(newAttendance);
      
      // Broadcast clock in event via ALL channels
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        // Pusher (Primary) - with actual data
        pusherService.triggerClockIn(empId, employee.name, clockInTime, isLate);
        
        // BroadcastChannel (Backup)
        realtimeService.broadcastClockIn(empId, employee.name, clockInTime, isLate);
        
        // Force update localStorage with timestamp
        localStorage.setItem('ls_attendance', JSON.stringify(newAttendance));
        localStorage.setItem('last_update', Date.now().toString());
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
          onClockToggle={onClockToggle}
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
          onApply={(r) => {
            setLeaveRequests([r, ...leaveRequests]);
            
            // Save to localStorage immediately
            const updatedLeaves = [r, ...leaveRequests];
            localStorage.setItem('ls_leave_requests', JSON.stringify(updatedLeaves));
            localStorage.setItem('last_update', Date.now().toString());
            
            // Trigger Pusher event for leave request
            pusherService.trigger('leave-request', {
              employeeId: r.employeeId,
              employeeName: r.employeeName,
              leaveType: r.type,
              startDate: r.startDate,
              endDate: r.endDate,
              timestamp: new Date().toISOString()
            });
          }} 
          onAction={(id, s) => {
            const request = leaveRequests.find(r => r.id === id);
            const updatedLeaves = leaveRequests.map(r => r.id === id ? {...r, status: s} : r);
            setLeaveRequests(updatedLeaves);
            
            // Save to localStorage immediately
            localStorage.setItem('ls_leave_requests', JSON.stringify(updatedLeaves));
            localStorage.setItem('last_update', Date.now().toString());
            
            // Trigger Pusher event for leave action
            if (request) {
              pusherService.trigger('leave-action', {
                employeeId: request.employeeId,
                employeeName: request.employeeName,
                leaveType: request.type,
                status: s,
                timestamp: new Date().toISOString()
              });
            }
          }} 
        />;
      case 'reports':
        return <Reports 
          employees={employees} 
          attendance={attendance} 
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
            <NotificationBell 
              notifications={notifications}
              onMarkAsRead={markNotificationAsRead}
              onClearAll={clearAllNotifications}
            />
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
