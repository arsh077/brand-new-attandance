
import React from 'react';
import { UserRole, Employee, LeaveType } from './types';

// Secure user credentials - Only these emails can login with correct passwords
export const AUTHORIZED_USERS = [
  { email: 'Info@legalsuccessindia.com', password: 'Legal@000', role: UserRole.ADMIN, name: 'Admin - Info' },
  { email: 'vizralegalsuccess@gmail.com', password: 'Legal@004', role: UserRole.MANAGER, name: 'Vizra' },
  { email: 'lsikabir27@gmail.com', password: 'Legal@001', role: UserRole.EMPLOYEE, name: 'Kabir' },
  { email: 'legalsuccessindia94@gmail.com', password: 'Legal@002', role: UserRole.EMPLOYEE, name: 'Legal Success 94' },
  { email: 'sahinlegalsuccess@gmail.com', password: 'Legal@003', role: UserRole.EMPLOYEE, name: 'Sahin' },
  { email: 'lsinikhat@gmail.com', password: 'Legal@005', role: UserRole.EMPLOYEE, name: 'Nikhat' }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP001',
    name: 'Admin - Info',
    email: 'Info@legalsuccessindia.com',
    phone: '+91 9876543210',
    designation: 'Managing Director',
    department: 'Executive',
    salary: 150000,
    role: UserRole.ADMIN,
    status: 'ACTIVE',
    dateJoined: '2022-01-01',
    leaveBalance: { [LeaveType.CASUAL]: 10, [LeaveType.SICK]: 12, [LeaveType.EARNED]: 15, [LeaveType.LOP]: 0 }
  },
  {
    id: 'EMP002',
    name: 'Vizra',
    email: 'vizralegalsuccess@gmail.com',
    phone: '+91 9876543211',
    designation: 'Operations Manager',
    department: 'Operations',
    salary: 85000,
    role: UserRole.MANAGER,
    status: 'ACTIVE',
    dateJoined: '2023-05-10',
    leaveBalance: { [LeaveType.CASUAL]: 8, [LeaveType.SICK]: 10, [LeaveType.EARNED]: 15, [LeaveType.LOP]: 0 }
  },
  {
    id: 'EMP003',
    name: 'Kabir',
    email: 'lsikabir27@gmail.com',
    phone: '+91 9876543212',
    designation: 'Legal Consultant',
    department: 'Legal',
    salary: 65000,
    role: UserRole.EMPLOYEE,
    status: 'ACTIVE',
    dateJoined: '2024-01-10',
    leaveBalance: { [LeaveType.CASUAL]: 5, [LeaveType.SICK]: 8, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
  },
  {
    id: 'EMP004',
    name: 'Legal Success 94',
    email: 'legalsuccessindia94@gmail.com',
    phone: '+91 9876543213',
    designation: 'Legal Associate',
    department: 'Legal',
    salary: 60000,
    role: UserRole.EMPLOYEE,
    status: 'ACTIVE',
    dateJoined: '2024-02-15',
    leaveBalance: { [LeaveType.CASUAL]: 5, [LeaveType.SICK]: 8, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
  },
  {
    id: 'EMP005',
    name: 'Sahin',
    email: 'sahinlegalsuccess@gmail.com',
    phone: '+91 9876543214',
    designation: 'Legal Executive',
    department: 'Legal',
    salary: 55000,
    role: UserRole.EMPLOYEE,
    status: 'ACTIVE',
    dateJoined: '2024-03-20',
    leaveBalance: { [LeaveType.CASUAL]: 5, [LeaveType.SICK]: 8, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
  },
  {
    id: 'EMP006',
    name: 'Nikhat',
    email: 'lsinikhat@gmail.com',
    phone: '+91 9876543215',
    designation: 'Legal Assistant',
    department: 'Legal',
    salary: 50000,
    role: UserRole.EMPLOYEE,
    status: 'ACTIVE',
    dateJoined: '2024-06-15',
    leaveBalance: { [LeaveType.CASUAL]: 5, [LeaveType.SICK]: 8, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
  }
];

export const ICONS = {
  Dashboard: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  Users: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>,
  Attendance: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Leaves: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>,
  Reports: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  Settings: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  LogOut: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  EditIcon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  DeleteIcon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  ClockIn: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  Lock: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
};
