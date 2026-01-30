
import React, { useState, useEffect } from 'react';
import { UserRole, Employee, AttendanceRecord, LeaveRequest, LeaveStatus, AttendanceStatus } from './types';
import { firebaseAuthService } from './services/firebaseAuthService';
import { firebaseAttendanceService } from './services/firebaseAttendanceService';
import { firebaseLeaveService } from './services/firebaseLeaveService';
import { firebaseEmployeeService } from './services/firebaseEmployeeService';
import { notificationService, Notification } from './services/notificationService';
import { INITIAL_EMPLOYEES, AUTHORIZED_USERS } from './constants';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Employees from './pages/Employees';
import Reports from './pages/Reports';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
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
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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

    // Clear any old debug cache - Version 4.0
    const debugCacheCleared = localStorage.getItem('debug_cache_cleared_v4');
    if (!debugCacheCleared) {
      console.log('🧹 Clearing old debug cache...');
      // Remove any old debug-related items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('debug') || key.includes('Debug')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('debug_cache_cleared_v4', 'true');
      console.log('✅ Debug cache cleared!');
    }
  }, []);

  useEffect(() => {
    // Save to localStorage for offline backup
    localStorage.setItem('ls_employees', JSON.stringify(employees));
    localStorage.setItem('ls_attendance', JSON.stringify(attendance));
    localStorage.setItem('ls_leave_requests', JSON.stringify(leaveRequests));
    localStorage.setItem('ls_notifications', JSON.stringify(notifications));
    localStorage.setItem('last_update', Date.now().toString());

    // Firebase handles real-time sync automatically via listeners
    // No need to manually broadcast - Firebase Firestore does this automatically!
  }, [employees, attendance, leaveRequests, notifications]);

  // Firebase Real-time Listeners
  useEffect(() => {
    if (!currentUser) return;

    const isMountedRef = { current: true }; // Use object ref instead of let variable
    const userId = currentUser.id; // Store userId separately to avoid closure issues
    console.log('🔥 Setting up Firebase real-time listeners for user:', userId);

    // Listen to realtime service notifications
    const unsubNotifications = notificationService.subscribe((notification) => {
      if (!isMountedRef.current) return;
      console.log('🔔 New notification:', notification);
      setNotifications(prev => [notification, ...prev]);
    });

    // FIREBASE REAL-TIME LISTENERS (Automatic cross-device sync!)
    console.log('🔥 Subscribing to Firebase attendance updates...');
    const unsubFirebaseAttendance = firebaseAttendanceService.subscribeToAttendance((attendanceData) => {
      if (!isMountedRef.current) return;
      console.log('🔥 Firebase real-time: Attendance updated!', attendanceData.length, 'records');
      setAttendance(attendanceData);
      localStorage.setItem('ls_attendance', JSON.stringify(attendanceData));
    });

    console.log('🔥 Subscribing to Firebase leave requests...');
    const unsubFirebaseLeaves = firebaseLeaveService.subscribeToAllLeaves((leavesData) => {
      if (!isMountedRef.current) return;
      console.log('🔥 Firebase real-time: Leave requests updated!', leavesData.length, 'requests');
      setLeaveRequests(leavesData);
      localStorage.setItem('ls_leave_requests', JSON.stringify(leavesData));
    });

    console.log('🔥 Subscribing to Firebase employee updates...');
    const unsubFirebaseEmployees = firebaseEmployeeService.subscribeToEmployees(async (employeesData) => {
      if (!isMountedRef.current) return;
      console.log('🔥 Firebase real-time: Employees updated!', employeesData.length);

      // AUTO-INITIALIZE: If database is empty, populate it
      if (employeesData.length === 0 && !localStorage.getItem('firebase_initialized')) {
        console.log('⚠️ Firebase database is empty! Initializing with default employees...');
        if (!isMountedRef.current) return;
        await firebaseEmployeeService.initializeEmployees(INITIAL_EMPLOYEES);
        if (!isMountedRef.current) return;
        localStorage.setItem('firebase_initialized', 'true');
        return;
      }

      if (!isMountedRef.current) return;
      setEmployees(employeesData);
      localStorage.setItem('ls_employees', JSON.stringify(employeesData));

      // Update current user if data changed - use userId instead of currentUser
      const updatedUser = employeesData.find(e => e.id === userId);
      if (updatedUser && isMountedRef.current) {
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    });

    // Cleanup
    return () => {
      isMountedRef.current = false; // Set to false FIRST
      console.log('🧹 Cleaning up Firebase listeners...');

      // Unsubscribe in try-catch to handle any errors
      try {
        unsubNotifications();
        unsubFirebaseAttendance();
        unsubFirebaseLeaves();
        unsubFirebaseEmployees();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [currentUser]);
}, []); // Empty dependency array - only run once on login
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

  // Set user in localStorage for persistence
  localStorage.setItem('user', JSON.stringify(user));

  // Initialize notification service for this user
  notificationService.initialize(user.id, user.role);
  console.log('🔔 Notification service initialized for:', user.name);

  // Force update state
  setCurrentUser(user);
  setActiveTab('dashboard');
};

const handleLogout = async () => {
  try {
    // First logout from Firebase (this will trigger cleanup in useEffect)
    await firebaseAuthService.logout();

    // Small delay to let listeners cleanup
    await new Promise(resolve => setTimeout(resolve, 100));

    // Then clear state and localStorage
    setCurrentUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('ls_employees');
    localStorage.removeItem('ls_attendance');
    localStorage.removeItem('ls_leave_requests');
    localStorage.removeItem('ls_notifications');
    localStorage.removeItem('firebase_initialized'); // Clear this flag too
    localStorage.removeItem('data_reset_feb_2026'); // Clear this flag too
    localStorage.removeItem('debug_cache_cleared_v4'); // Clear this flag too

    // Reset local state to initial values
    setEmployees(INITIAL_EMPLOYEES);
    setAttendance([]);
    setLeaveRequests([]);
    setNotifications([]);
    setActiveTab('dashboard'); // Reset active tab
  } catch (error) {
    console.error('Error during logout:', error);
    alert('Logout failed. Please try again.');
  }
};

// Notification handlers
const markNotificationAsRead = (id: string) => {
  setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
};

const clearAllNotifications = () => {
  setNotifications([]);
};

const handleNotificationClick = (notification: Notification) => {
  // Navigate to appropriate page based on notification type
  if (notification.type === 'LEAVE_REQUEST' || notification.type === 'LEAVE_APPROVED' || notification.type === 'LEAVE_REJECTED') {
    setActiveTab('leaves');
  } else if (notification.type === 'CLOCK_IN' || notification.type === 'CLOCK_OUT') {
    setActiveTab('dashboard');
  }
};

// State Mutators
const onClockToggle = async (empId: string) => {
  console.log('🎯 Clock toggle for employee:', empId);

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const existing = attendance.find(a => a.employeeId === empId && a.date === today && !a.clockOut);

  try {
    if (existing) {
      // Clock Out
      console.log('🔴 Clocking out... (via Firebase)');
      const clockOutTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      // Firebase update
      const result = await firebaseAttendanceService.clockOut(existing.id, clockOutTime);
      if (!result.success) throw new Error('Firebase clock-out failed');
      return { success: true, type: 'OUT' };
    } else {
      // Clock In
      console.log('🟢 Clocking in... (via Firebase)');
      const now = new Date();
      const isLate = now.getHours() > 10 || (now.getHours() === 10 && now.getMinutes() > 40);
      const clockInTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      const employee = employees.find(e => e.id === empId);
      if (employee) {
        // Firebase create
        const result = await firebaseAttendanceService.clockIn(empId, employee.name, clockInTime, isLate);
        if (!result.success) throw new Error('Firebase clock-in failed');
        return { success: true, type: 'IN' };
      }
    }
  } catch (error: any) {
    console.error('❌ Clock toggle error:', error);
    alert('Error: ' + (error.message || 'Check your internet connection and Firebase permissions.'));
    return { success: false, error: error.message };
  }
  return { success: false };
};

// Employee update handler with real-time sync
const handleEmployeeUpdate = (updatedEmployee: Employee) => {
  console.log('👤 Updating employee:', updatedEmployee.name);

  // Update employees state
  const updatedEmployees = employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e);
  setEmployees(updatedEmployees);

  // Update current user if it's the same person
  if (currentUser && currentUser.id === updatedEmployee.id) {
    setCurrentUser(updatedEmployee);
    localStorage.setItem('user', JSON.stringify(updatedEmployee));
  }

  // Update AUTHORIZED_USERS in localStorage for login consistency
  const authUsers = JSON.parse(localStorage.getItem('authorized_users') || '[]');
  const updatedAuthUsers = authUsers.map((user: any) =>
    user.email === updatedEmployee.email ? { ...user, name: updatedEmployee.name } : user
  );
  localStorage.setItem('authorized_users', JSON.stringify(updatedAuthUsers));

  // Broadcast employee update via all channels
  firebaseEmployeeService.updateEmployee(updatedEmployee);

  console.log('✅ Employee update synced to Firebase');
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
          console.log('📝 New leave request:', r);
          // Trigger events via Firebase
          firebaseLeaveService.submitLeave(r);
          console.log('✅ Leave request submitted to Firebase');
        }}
        onAction={(id, s) => {
          console.log('✅ Leave action:', id, s);
          const request = leaveRequests.find(r => r.id === id);
          // Trigger events via Firebase
          if (request) {
            firebaseLeaveService.updateLeaveStatus(id, s);
          }

          console.log('✅ Leave action saved to Firebase');
        }}
      />;
    case 'analytics':
      return <AnalyticsDashboard
        employees={employees}
        attendance={attendance}
        leaves={leaveRequests}
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
        onUpdate={handleEmployeeUpdate}
        onDelete={(id) => confirm("Delete staff?") && setEmployees(employees.filter(e => e.id !== id))}
      />;
    default:
      return <div className="p-8 text-gray-400 font-bold italic">Module coming soon...</div>;
  }
};
// Initialize Advanced Notification Listeners
useEffect(() => {
  if (currentUser) {
    notificationService.initialize(currentUser.id, currentUser.role);
  }
  return () => notificationService.cleanup();
}, [currentUser]);

// Initialize Advanced Notification Listeners
useEffect(() => {
  if (currentUser) {
    notificationService.initialize(currentUser.id, currentUser.role);
  }
  return () => notificationService.cleanup();
}, [currentUser]);

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
            onNotificationClick={handleNotificationClick}
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
