
import React from 'react';
import { UserRole } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: ICONS.Dashboard, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'attendance', label: 'My Attendance', icon: ICONS.Attendance, roles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN] },
    { id: 'leaves', label: 'Leave Requests', icon: ICONS.Leaves, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE] },
    { id: 'analytics', label: 'Analytics', icon: ICONS.Reports, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'reports', label: 'Monthly Reports', icon: ICONS.Reports, roles: [UserRole.ADMIN] },
    { id: 'employees', label: 'Employee Mgmt', icon: ICONS.Users, roles: [UserRole.ADMIN] },
    { id: 'admin', label: 'Admin Panel', icon: ICONS.Settings, roles: [UserRole.ADMIN] },
    { id: 'team', label: 'My Team', icon: ICONS.Users, roles: [UserRole.MANAGER] },
    { id: 'settings', label: 'Settings', icon: ICONS.Settings, roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-64 shadow-sm transition-all duration-300">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center overflow-hidden shadow-sm">
          <img
            src="/assets/logo.png"
            alt="Legal Success India"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">LS</div>';
              }
            }}
          />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-800 leading-tight">Legal Success</h1>
          <p className="text-xs text-indigo-600 font-medium tracking-wider uppercase">India Portal</p>
        </div>
      </div>

      <nav className="flex-1 mt-4 px-4 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${activeTab === item.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <span className={`${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'} mr-3`}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
        >
          <span className="mr-3">{ICONS.LogOut}</span>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
