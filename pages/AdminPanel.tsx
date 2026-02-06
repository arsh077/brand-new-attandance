import React, { useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';
import { AUTHORIZED_USERS } from '../constants';
import { firebaseEmployeeService } from '../services/firebaseEmployeeService';
import { firebaseAuthService } from '../services/firebaseAuthService';

interface SystemSettings {
  companyName: string;
  workingHours: { start: string; end: string };
  lateThreshold: string;
  halfDayThreshold: string;
  weeklyOffs: string[];
  holidays: { date: string; name: string }[];
}

interface AdminPanelProps {
  employees: Employee[];
  systemSettings?: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
}

interface NewUserCredentials {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ employees, systemSettings: propSettings, onUpdateSettings }) => {
  const [activeSection, setActiveSection] = useState('users');
  const [newUser, setNewUser] = useState<NewUserCredentials>({
    email: '',
    password: '',
    role: UserRole.EMPLOYEE,
    name: ''
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(propSettings || {
    companyName: 'Legal Success India',
    workingHours: { start: '10:00', end: '18:30' },
    lateThreshold: '10:40',
    halfDayThreshold: '14:00',
    weeklyOffs: ['Sunday'],
    holidays: []
  });

  // Sync state with props when they update (from Firebase)
  useEffect(() => {
    if (propSettings) {
      // Only update if settings actually changed to prevent infinite loop
      const currentSettingsStr = JSON.stringify(systemSettings);
      const propSettingsStr = JSON.stringify(propSettings);
      if (currentSettingsStr !== propSettingsStr) {
        console.log('🔥 [DEBUG] AdminPanel: Syncing system settings from Firebase');
        setSystemSettings(propSettings);
      }
    }
  }, [propSettings]); // Don't include systemSettings in dependencies to avoid loop

  const [authorizedUsers, setAuthorizedUsers] = useState(AUTHORIZED_USERS);

  // Add New Login User
  const handleAddUser = async () => {
    try {
      // 1. Create Firebase Auth Account
      const authResult = await firebaseAuthService.registerSecondary(newUser.email, newUser.password);

      if (!authResult.success) {
        alert('❌ Firebase Auth Error: ' + authResult.error);
        return;
      }

      // 2. Add to Employee Database
      const newEmployee: Employee = {
        id: `EMP${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        phone: '+91 0000000000',
        designation: 'New Employee',
        department: 'General',
        salary: 50000,
        role: newUser.role,
        status: 'ACTIVE',
        dateJoined: new Date().toISOString().split('T')[0],
        leaveBalance: { CASUAL: 10, SICK: 10, EARNED: 10, LOP: 0 }
      };

      await firebaseEmployeeService.updateEmployee(newEmployee);

      // 3. Add to Authorized Users (Local Storage)
      const updatedUsers = [...authorizedUsers, {
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        name: newUser.name
      }];

      setAuthorizedUsers(updatedUsers);
      localStorage.setItem('authorized_users_override', JSON.stringify(updatedUsers));

      alert(`✅ User Created Successfully!\n\nEmail: ${newUser.email}\nPassword: ${newUser.password}\nRole: ${newUser.role}\n\n⚠️ Save these credentials securely!`);

      // Reset form
      setNewUser({ email: '', password: '', role: UserRole.EMPLOYEE, name: '' });

    } catch (error) {
      console.error('Error creating user:', error);
      alert('❌ Error creating user: ' + error);
    }
  };

  // Change User Role
  const handleRoleChange = async (userEmail: string, newRole: UserRole) => {
    try {
      // Update in authorized users
      const updatedUsers = authorizedUsers.map(user =>
        user.email === userEmail ? { ...user, role: newRole } : user
      );
      setAuthorizedUsers(updatedUsers);
      localStorage.setItem('authorized_users_override', JSON.stringify(updatedUsers));

      // Update in employee database
      const employee = employees.find(emp => emp.email === userEmail);
      if (employee) {
        await firebaseEmployeeService.updateEmployee({ ...employee, role: newRole });
      }

      alert(`✅ Role updated to ${newRole} for ${userEmail}`);
    } catch (error) {
      alert('❌ Error updating role: ' + error);
    }
  };

  // Remove User Access
  const handleRemoveUser = async (userEmail: string) => {
    if (!confirm(`Remove access for ${userEmail}? This cannot be undone.`)) return;

    try {
      // Remove from authorized users
      const updatedUsers = authorizedUsers.filter(user => user.email !== userEmail);
      setAuthorizedUsers(updatedUsers);
      localStorage.setItem('authorized_users_override', JSON.stringify(updatedUsers));

      // Deactivate employee (don't delete, just deactivate)
      const employee = employees.find(emp => emp.email === userEmail);
      if (employee) {
        await firebaseEmployeeService.updateEmployee({ ...employee, status: 'INACTIVE' });
      }

      alert(`✅ Access removed for ${userEmail}`);
    } catch (error) {
      alert('❌ Error removing user: ' + error);
    }
  };

  // Update System Settings
  const handleUpdateSettings = async () => {
    // localStorage.setItem('system_settings', JSON.stringify(systemSettings)); // Deprecated favoring Firebase
    await onUpdateSettings(systemSettings);
    alert('✅ System settings updated successfully!');
  };

  // Generate Secure Password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser({ ...newUser, password });
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">System Administration</h2>
        <p className="text-gray-400 font-medium">Complete portal management and configuration</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl">
        {[
          { id: 'users', label: 'User Management', icon: '👥' },
          { id: 'settings', label: 'System Settings', icon: '⚙️' },
          { id: 'security', label: 'Security', icon: '🔒' },
          { id: 'backup', label: 'Data Backup', icon: '💾' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${activeSection === tab.id
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* User Management Section */}
      {activeSection === 'users' && (
        <div className="space-y-6">
          {/* Add New User */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
            <h3 className="text-xl font-black text-gray-900 mb-6">Add New Login User</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <input
                type="text"
                placeholder="Full Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
              />
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="flex-1 bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
                />
                <button
                  onClick={generatePassword}
                  className="bg-indigo-600 text-white px-4 py-3 rounded-2xl font-bold hover:bg-indigo-700"
                >
                  Generate
                </button>
              </div>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
              >
                <option value={UserRole.EMPLOYEE}>Employee</option>
                <option value={UserRole.MANAGER}>Manager</option>
                <option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            <button
              onClick={handleAddUser}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700"
            >
              🚀 Create User Account
            </button>
          </div>

          {/* Existing Users Management */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-black text-gray-900">Manage Existing Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-left font-black text-gray-500 uppercase text-xs">User</th>
                    <th className="px-6 py-4 text-left font-black text-gray-500 uppercase text-xs">Current Role</th>
                    <th className="px-6 py-4 text-left font-black text-gray-500 uppercase text-xs">Change Role</th>
                    <th className="px-6 py-4 text-center font-black text-gray-500 uppercase text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {authorizedUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                          user.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          onChange={(e) => handleRoleChange(user.email, e.target.value as UserRole)}
                          className="bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm font-bold"
                          defaultValue={user.role}
                        >
                          <option value={UserRole.EMPLOYEE}>Employee</option>
                          <option value={UserRole.MANAGER}>Manager</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemoveUser(user.email)}
                          className="text-red-600 hover:text-red-800 font-bold text-sm"
                        >
                          Remove Access
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Section */}
      {activeSection === 'settings' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-6">System Configuration</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                value={systemSettings.companyName}
                onChange={(e) => setSystemSettings({ ...systemSettings, companyName: e.target.value })}
                className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Work Start Time</label>
                <input
                  type="time"
                  value={systemSettings.workingHours.start}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    workingHours: { ...systemSettings.workingHours, start: e.target.value }
                  })}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Work End Time</label>
                <input
                  type="time"
                  value={systemSettings.workingHours.end}
                  onChange={(e) => setSystemSettings({
                    ...systemSettings,
                    workingHours: { ...systemSettings.workingHours, end: e.target.value }
                  })}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Late Threshold Time</label>
                <input
                  type="time"
                  value={systemSettings.lateThreshold}
                  onChange={(e) => setSystemSettings({ ...systemSettings, lateThreshold: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Half Day Time</label>
                <input
                  type="time"
                  value={systemSettings.halfDayThreshold || '14:00'}
                  onChange={(e) => setSystemSettings({ ...systemSettings, halfDayThreshold: e.target.value })}
                  className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleUpdateSettings}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700"
            >
              💾 Save System Settings
            </button>
          </div>
        </div>
      )}

      {/* Security Section */}
      {activeSection === 'security' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-6">Security Management</h3>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
              <h4 className="font-bold text-green-800">🔒 Firebase Authentication: Active</h4>
              <p className="text-sm text-green-600">All users authenticated via Firebase</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200">
              <h4 className="font-bold text-blue-800">🔄 Real-time Sync: Enabled</h4>
              <p className="text-sm text-blue-600">Cross-device synchronization active</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200">
              <h4 className="font-bold text-purple-800">💾 Data Backup: Automatic</h4>
              <p className="text-sm text-purple-600">Firebase + Local Storage backup</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Backup Section */}
      {activeSection === 'backup' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-6">Data Management</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-green-600 text-white py-4 rounded-2xl font-black hover:bg-green-700">
              📥 Export All Data
            </button>
            <button className="bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700">
              🔄 Sync Firebase
            </button>
            <button className="bg-orange-600 text-white py-4 rounded-2xl font-black hover:bg-orange-700">
              🧹 Clear Cache
            </button>
            <button className="bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700">
              ⚠️ Reset System
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;