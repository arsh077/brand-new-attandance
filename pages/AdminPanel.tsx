import React, { useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';
import { AUTHORIZED_USERS } from '../constants';
import { firebaseEmployeeService } from '../services/firebaseEmployeeService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { MonthlyGoals, DEFAULT_MONTHLY_GOALS } from '../services/firebaseTargetService';

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
  monthlyGoals?: MonthlyGoals;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateGoals?: (goals: MonthlyGoals) => Promise<void>;
}

interface NewUserCredentials {
  email: string;
  password: string;
  role: UserRole;
  name: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ employees, systemSettings: propSettings, monthlyGoals: propGoals, onUpdateSettings, onUpdateGoals }) => {
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

  // Monthly Goals editing state (synced from Firebase via props)
  const [editGoals, setEditGoals] = useState<MonthlyGoals>(propGoals || DEFAULT_MONTHLY_GOALS);
  const [savingGoals, setSavingGoals] = useState(false);

  // Sync editGoals when Firebase pushes new goals
  useEffect(() => {
    if (propGoals) {
      setEditGoals(propGoals);
    }
  }, [propGoals]);

  const handleSaveGoals = async () => {
    if (!onUpdateGoals) return;
    setSavingGoals(true);
    try {
      let finalGoals = { ...editGoals };
      if (finalGoals.specialTarget) {
        const tiers = finalGoals.specialTarget.tiers || [];
        const maxSlab = tiers.length > 0 ? Math.max(...tiers.map(t => t.salesAmount || 0)) : 0;
        finalGoals.specialTarget.targetAmount = maxSlab;
      }
      await onUpdateGoals(finalGoals);
      alert('✅ Monthly goals saved! All employees will see the updated target live.');
    } catch (error) {
      alert('❌ Error saving goals: ' + error);
    } finally {
      setSavingGoals(false);
    }
  };

  // Personal Targets editing states
  const [personalTargets, setPersonalTargets] = useState<Record<string, number>>({});
  const [savingTargets, setSavingTargets] = useState<Record<string, boolean>>({});

  // Sync personal targets when employees list changes
  useEffect(() => {
    const targets: Record<string, number> = {};
    employees.forEach(emp => {
      targets[emp.id] = emp.personalTarget || 0;
    });
    setPersonalTargets(targets);
  }, [employees]);

  const handleSavePersonalTarget = async (empId: string) => {
    const targetVal = personalTargets[empId] || 0;
    const employee = employees.find(emp => emp.id === empId);
    if (!employee) return;

    setSavingTargets(prev => ({ ...prev, [empId]: true }));
    try {
      await firebaseEmployeeService.updateEmployee({
        ...employee,
        personalTarget: targetVal
      });
      alert(`✅ Personal target updated for ${employee.name} to ₹${targetVal.toLocaleString('en-IN')}`);
    } catch (error) {
      alert('❌ Error updating personal target: ' + error);
    } finally {
      setSavingTargets(prev => ({ ...prev, [empId]: false }));
    }
  };

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
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {[
          { id: 'users', label: 'User Management', icon: '👥' },
          { id: 'monthly-goals', label: 'Monthly Goals', icon: '🎯' },
          { id: 'personal-targets', label: 'Personal Targets', icon: '👤' },
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

      {/* Monthly Goals Section */}
      {activeSection === 'monthly-goals' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
          <div className="mb-8">
            <h3 className="text-xl font-black text-gray-900 mb-1">🎯 Monthly Goals</h3>
            <p className="text-gray-400 font-medium">Set monthly sales target and recognize your star performer. Changes sync live to all employees.</p>
          </div>

          <div className="space-y-6">
            {/* Month Selector */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Target Month</label>
              <input
                type="month"
                value={editGoals.targetMonth}
                onChange={(e) => setEditGoals({ ...editGoals, targetMonth: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Monthly Target Amount */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">💰 Monthly Sales Target (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-2xl">₹</span>
                <input
                  type="number"
                  value={editGoals.targetAmount || ''}
                  onChange={(e) => setEditGoals({ ...editGoals, targetAmount: Number(e.target.value) })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 font-black text-gray-900 text-3xl focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  placeholder="0"
                  min="0"
                />
              </div>
              {(editGoals.targetAmount || 0) > 0 && (
                <p className="text-indigo-600 font-black mt-2 text-lg">
                  = ₹{(editGoals.targetAmount || 0).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            {/* Employee of the Month */}
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">🏆 Employee of the Month</label>
              <select
                value={editGoals.employeeOfMonth?.id || ''}
                onChange={(e) => {
                  const emp = employees.find(em => em.id === e.target.value);
                  if (emp) {
                    setEditGoals({
                      ...editGoals,
                      employeeOfMonth: {
                        id: emp.id,
                        name: emp.name,
                        designation: emp.designation,
                        department: emp.department
                      }
                    });
                  } else {
                    setEditGoals({ ...editGoals, employeeOfMonth: null });
                  }
                }}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">-- No Employee of the Month (clear) --</option>
                {employees.filter(e => e.status === 'ACTIVE' || (e as any).status === undefined).map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} — {emp.designation}
                  </option>
                ))}
              </select>

              {editGoals.employeeOfMonth && (
                <div className="mt-4 p-5 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">🏆</span>
                    <div>
                      <p className="font-black text-amber-900 text-lg">{editGoals.employeeOfMonth.name}</p>
                      <p className="text-amber-700 font-bold text-sm">{editGoals.employeeOfMonth.designation}</p>
                      <p className="text-amber-500 font-bold text-xs uppercase tracking-widest">{editGoals.employeeOfMonth.department}</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-3 font-bold">✨ A celebration popup will be shown to all employees on their next login!</p>
                </div>
              )}
            </div>

            {/* ━━━ SPECIAL TARGET SECTION ━━━ */}
            <div className="border-t border-gray-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">⚡ Special Target</label>
                  <p className="text-gray-400 text-xs font-bold mt-1">A bonus/campaign target shown separately to admin & employees</p>
                </div>
                {editGoals.specialTarget && (
                  <button
                    onClick={() => setEditGoals({ ...editGoals, specialTarget: null })}
                    className="text-xs text-red-500 font-black hover:text-red-700 uppercase tracking-widest"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Special Target Name */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Special Target Name (e.g. Diwali Drive, Q2 Bonus)"
                  value={editGoals.specialTarget?.name || ''}
                  onChange={(e) => setEditGoals({
                    ...editGoals,
                    specialTarget: {
                      name: e.target.value,
                      targetAmount: editGoals.specialTarget?.targetAmount || 0,
                      description: editGoals.specialTarget?.description || '',
                      tiers: editGoals.specialTarget?.tiers || [],
                      timePeriodDays: editGoals.specialTarget?.timePeriodDays || 1,
                      startDate: editGoals.specialTarget?.startDate || new Date().toISOString().split('T')[0],
                    }
                  })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />

                {/* Special Target Description */}
                <input
                  type="text"
                  placeholder="Short description (optional)"
                  value={editGoals.specialTarget?.description || ''}
                  onChange={(e) => setEditGoals({
                    ...editGoals,
                    specialTarget: {
                      name: editGoals.specialTarget?.name || '',
                      targetAmount: editGoals.specialTarget?.targetAmount || 0,
                      description: e.target.value,
                      tiers: editGoals.specialTarget?.tiers || [],
                      timePeriodDays: editGoals.specialTarget?.timePeriodDays || 1,
                      startDate: editGoals.specialTarget?.startDate || new Date().toISOString().split('T')[0],
                    }
                  })}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                />

                {/* Time Period + Start Date Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">⏱ Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      placeholder="e.g. 3"
                      value={editGoals.specialTarget?.timePeriodDays || ''}
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        const start = editGoals.specialTarget?.startDate || new Date().toISOString().split('T')[0];
                        const endDateObj = new Date(start);
                        endDateObj.setDate(endDateObj.getDate() + days - 1);
                        const end = endDateObj.toISOString().split('T')[0];
                        setEditGoals({
                          ...editGoals,
                          specialTarget: {
                            name: editGoals.specialTarget?.name || '',
                            targetAmount: editGoals.specialTarget?.targetAmount || 0,
                            description: editGoals.specialTarget?.description || '',
                            tiers: editGoals.specialTarget?.tiers || [],
                            timePeriodDays: days,
                            startDate: start,
                            endDate: end,
                          }
                        });
                      }}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-black text-gray-900 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">📅 Start Date</label>
                    <input
                      type="date"
                      value={editGoals.specialTarget?.startDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        const start = e.target.value;
                        const days = editGoals.specialTarget?.timePeriodDays || 1;
                        const endDateObj = new Date(start);
                        endDateObj.setDate(endDateObj.getDate() + days - 1);
                        const end = endDateObj.toISOString().split('T')[0];
                        setEditGoals({
                          ...editGoals,
                          specialTarget: {
                            name: editGoals.specialTarget?.name || '',
                            targetAmount: editGoals.specialTarget?.targetAmount || 0,
                            description: editGoals.specialTarget?.description || '',
                            tiers: editGoals.specialTarget?.tiers || [],
                            timePeriodDays: days,
                            startDate: start,
                            endDate: end,
                          }
                        });
                      }}
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                    />
                  </div>
                </div>
                {editGoals.specialTarget?.startDate && editGoals.specialTarget?.timePeriodDays && (
                  <p className="text-rose-600 font-bold text-sm">
                    📅 Campaign runs: {new Date(editGoals.specialTarget.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(editGoals.specialTarget.endDate || editGoals.specialTarget.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' '}({editGoals.specialTarget.timePeriodDays} {editGoals.specialTarget.timePeriodDays === 1 ? 'day' : 'days'})
                  </p>
                )}

                {/* ━━━ TIERED INCENTIVE SLABS ━━━ */}
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-black text-amber-800 uppercase tracking-widest">💰 Incentive Slabs (Tiers)</p>
                      <p className="text-amber-600 text-xs font-bold mt-0.5">Individual sales → bonus amount. e.g. ₹9000 sale = ₹600 bonus</p>
                    </div>
                    <button
                      onClick={() => {
                        const current = editGoals.specialTarget?.tiers || [];
                        setEditGoals({
                          ...editGoals,
                          specialTarget: {
                            name: editGoals.specialTarget?.name || '',
                            targetAmount: editGoals.specialTarget?.targetAmount || 0,
                            description: editGoals.specialTarget?.description || '',
                            timePeriodDays: editGoals.specialTarget?.timePeriodDays || 1,
                            startDate: editGoals.specialTarget?.startDate || new Date().toISOString().split('T')[0],
                            endDate: editGoals.specialTarget?.endDate,
                            tiers: [...current, { salesAmount: 0, bonus: 0 }]
                          }
                        });
                      }}
                      className="bg-amber-500 text-white text-xs font-black px-3 py-1.5 rounded-xl hover:bg-amber-600"
                    >
                      + Add Slab
                    </button>
                  </div>

                  {(editGoals.specialTarget?.tiers || []).length === 0 && (
                    <p className="text-amber-500 text-xs font-bold text-center py-2">No slabs added yet. Click "+ Add Slab" to create incentive tiers.</p>
                  )}

                  <div className="space-y-2">
                    {(editGoals.specialTarget?.tiers || []).map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-xl p-3 border border-amber-100">
                        <span className="text-xs font-black text-amber-700 w-16 shrink-0">Slab {idx + 1}</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 text-sm font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="Sales amt"
                            value={tier.salesAmount || ''}
                            min="0"
                            onChange={(e) => {
                              const newTiers = [...(editGoals.specialTarget?.tiers || [])];
                              newTiers[idx] = { ...newTiers[idx], salesAmount: Number(e.target.value) };
                              setEditGoals({ ...editGoals, specialTarget: { ...editGoals.specialTarget!, tiers: newTiers } });
                            }}
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-black text-gray-900 focus:outline-none focus:border-rose-300 min-w-0"
                          />
                        </div>
                        <span className="text-gray-400 font-bold text-sm shrink-0">→</span>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-emerald-600 text-sm font-bold">₹</span>
                          <input
                            type="number"
                            placeholder="Bonus"
                            value={tier.bonus || ''}
                            min="0"
                            onChange={(e) => {
                              const newTiers = [...(editGoals.specialTarget?.tiers || [])];
                              newTiers[idx] = { ...newTiers[idx], bonus: Number(e.target.value) };
                              setEditGoals({ ...editGoals, specialTarget: { ...editGoals.specialTarget!, tiers: newTiers } });
                            }}
                            className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-sm font-black text-emerald-700 focus:outline-none focus:border-emerald-300 min-w-0"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newTiers = (editGoals.specialTarget?.tiers || []).filter((_, i) => i !== idx);
                            setEditGoals({ ...editGoals, specialTarget: { ...editGoals.specialTarget!, tiers: newTiers } });
                          }}
                          className="text-red-400 hover:text-red-600 font-black text-base shrink-0 w-6 h-6 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Slabs Preview */}
                  {(editGoals.specialTarget?.tiers || []).filter(t => t.salesAmount > 0 && t.bonus > 0).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-200">
                      <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">📊 Incentive Plan Preview:</p>
                      <div className="space-y-1">
                        {[...( editGoals.specialTarget?.tiers || [])]
                          .filter(t => t.salesAmount > 0 && t.bonus > 0)
                          .sort((a, b) => a.salesAmount - b.salesAmount)
                          .map((t, i) => (
                            <div key={i} className="flex justify-between text-xs font-bold">
                              <span className="text-amber-700">₹{t.salesAmount.toLocaleString('en-IN')} sale</span>
                              <span className="text-emerald-700">→ ₹{t.bonus.toLocaleString('en-IN')} bonus</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Special Target Amount (top-level / max) */}
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">🏆 Top Target Amount (highest slab)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-2xl">₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      disabled
                      value={(() => {
                        const tiers = editGoals.specialTarget?.tiers || [];
                        return tiers.length > 0 ? Math.max(...tiers.map(t => t.salesAmount || 0)) : 0;
                      })()}
                      className="w-full bg-gray-100 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 font-black text-gray-400 text-3xl cursor-not-allowed"
                    />
                  </div>
                  {(() => {
                    const maxSlab = (() => {
                      const tiers = editGoals.specialTarget?.tiers || [];
                      return tiers.length > 0 ? Math.max(...tiers.map(t => t.salesAmount || 0)) : 0;
                    })();
                    return maxSlab > 0 ? (
                      <p className="text-rose-600 font-black text-lg mt-1">= ₹{maxSlab.toLocaleString('en-IN')}</p>
                    ) : null;
                  })()}
                </div>

                {/* Special Preview */}
                {(() => {
                  const maxSlab = editGoals.specialTarget?.tiers && editGoals.specialTarget.tiers.length > 0
                    ? Math.max(...editGoals.specialTarget.tiers.map(t => t.salesAmount || 0))
                    : 0;
                  
                  if (editGoals.specialTarget && editGoals.specialTarget.name && maxSlab > 0) {
                    return (
                      <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-3">Preview — Special Target Card</p>
                        <div className="bg-gradient-to-br from-rose-500 to-orange-500 rounded-2xl p-6 text-white">
                          <p className="text-rose-200 text-xs font-black uppercase tracking-widest mb-1">⚡ Special Target</p>
                          <p className="text-white font-black text-xl mb-2">{editGoals.specialTarget.name}</p>
                          <p className="font-black text-4xl mb-1">₹{maxSlab.toLocaleString('en-IN')}</p>
                          {editGoals.specialTarget.description && (
                            <p className="text-rose-200 text-sm font-bold">{editGoals.specialTarget.description}</p>
                          )}
                          {editGoals.specialTarget.timePeriodDays && (
                            <p className="text-rose-200 text-xs font-bold mt-2">⏱ {editGoals.specialTarget.timePeriodDays} day campaign</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveGoals}
              disabled={savingGoals}
              className={`w-full py-5 rounded-2xl font-black text-white text-lg shadow-xl transition-all duration-200 uppercase tracking-widest ${
                savingGoals
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.01] active:scale-[0.99] shadow-indigo-200'
              }`}
            >
              {savingGoals ? '⏳ Saving to Firebase...' : '🎯 Save All Goals (Live Sync)'}
            </button>

            {/* Monthly Target Preview */}
            {(editGoals.targetAmount || 0) > 0 && (
              <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">Preview — Monthly Target Card</p>
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white">
                  <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">📊 Target for {editGoals.targetMonth ? new Date(editGoals.targetMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'This Month'}</p>
                  <p className="font-black text-5xl mb-1">₹{(editGoals.targetAmount || 0).toLocaleString('en-IN')}</p>
                  <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest">Monthly Sales Target</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Targets Section */}
      {activeSection === 'personal-targets' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="relative bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.3em]">🎯 Target Assignment</span>
              <h3 className="text-2xl font-black text-white mt-1 mb-2">👤 Employee Personal Targets</h3>
              <p className="text-slate-300 text-sm font-medium max-w-2xl leading-relaxed">
                Set and manage individual sales targets for your team. Each employee will see their personal target, achievement, and progress bar privately on their dashboard.
              </p>
            </div>
          </div>

          {/* Employee Target List */}
          <div className="space-y-4 animate-slide-up">
            {employees
              .filter(emp => emp.status === 'ACTIVE' || (emp as any).status === undefined)
              .map(emp => {
                const currentVal = personalTargets[emp.id] || 0;
                const isSaving = !!savingTargets[emp.id];
                const initials = emp.name.split(' ').map(n => n[0]).join('').toUpperCase();

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-md p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 transition-all duration-200 hover:shadow-lg hover:border-indigo-100"
                  >
                    {/* Employee Profile */}
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-600 border border-indigo-100 flex items-center justify-center text-lg font-black shadow-inner">
                        {initials}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-black text-gray-900 text-lg leading-snug">{emp.name}</h4>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {emp.id}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                          {emp.designation} — <span className="text-indigo-500">{emp.department}</span>
                        </p>
                        <div className="mt-2 flex items-center space-x-2">
                          {emp.personalTarget && emp.personalTarget > 0 ? (
                            <span className="inline-flex items-center bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100">
                              🎯 Active Target: ₹{emp.personalTarget.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100">
                              ⚠️ No personal target set
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Target Setting Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:w-2/5">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₹</span>
                        <input
                          type="number"
                          placeholder="Set target amount"
                          value={currentVal || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setPersonalTargets(prev => ({ ...prev, [emp.id]: val }));
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-8 pr-4 py-3.5 font-black text-gray-900 text-lg focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all"
                          min="0"
                        />
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={() => handleSavePersonalTarget(emp.id)}
                        disabled={isSaving}
                        className={`px-6 py-3.5 rounded-2xl font-black text-white shadow-md transition-all sm:w-36 ${
                          isSaving
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:scale-[1.02] active:scale-[0.98] hover:shadow-emerald-100'
                        }`}
                      >
                        {isSaving ? '⏳ Saving...' : 'Save Target'}
                      </button>
                    </div>

                    {/* Micro Presets Panel */}
                    <div className="flex flex-wrap gap-2 lg:flex-col lg:justify-center border-t border-dashed border-gray-100 pt-4 lg:border-t-0 lg:pt-0">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 hidden lg:block text-left">Quick Presets</div>
                      <div className="flex gap-2">
                        {[25000, 50000, 100000].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setPersonalTargets(prev => ({ ...prev, [emp.id]: amt }))}
                            className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                          >
                            ₹{(amt / 1000)}k
                          </button>
                        ))}
                        {currentVal > 0 && (
                          <button
                            onClick={() => setPersonalTargets(prev => ({ ...prev, [emp.id]: 0 }))}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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