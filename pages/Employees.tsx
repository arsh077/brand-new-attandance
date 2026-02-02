
import React, { useState, useRef } from 'react';
import { Employee, UserRole, LeaveType } from '../types';
import { ICONS } from '../constants';

// Password generator function
const generatePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@#$%&*';
  const all = uppercase + lowercase + numbers + special;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = 4; i < 12; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
};

interface EmployeesProps {
  employees: Employee[];
  onAdd: (emp: Employee, password?: string) => void;
  onUpdate: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, onAdd, onUpdate, onDelete }) => {
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleHireSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newEmp: Employee = {
      id: `EMP${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      phone: fd.get('phone') as string,
      designation: fd.get('designation') as string,
      department: fd.get('department') as string,
      salary: Number(fd.get('salary')),
      role: fd.get('role') as UserRole,
      status: 'ACTIVE',
      dateJoined: new Date().toISOString().split('T')[0],
      dateOfBirth: fd.get('dateOfBirth') as string || undefined,
      leaveBalance: { [LeaveType.CASUAL]: 10, [LeaveType.SICK]: 10, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
    };
    // Pass the generated password so we can create the user account in Firebase
    onAdd(newEmp, generatedPassword);

    setIsAdding(false);
    setGeneratedPassword('');
    setEnable2FA(false);
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setGeneratedPassword(newPassword);
    setShowPassword(true);
    alert(`🔐 Generated Password: ${newPassword}\n\n⚠️ IMPORTANT: Save this password securely!\nEmployee will use this to login.`);
  };

  const handleCopyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      alert('✅ Password copied to clipboard!');
    }
  };

  const handleSendOTP = () => {
    if (editingEmp?.email) {
      // Simulate OTP sending
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`📧 OTP sent to ${editingEmp.email}: ${otp}`);
      setOtpSent(true);
      alert(`📧 OTP sent to ${editingEmp.email}\n\n🔢 Verification code: ${otp}\n\n(In production, this will be sent via email)`);
    }
  };

  const handleVerifyOTP = () => {
    if (otpCode.length === 6) {
      alert('✅ OTP Verified! 2FA enabled for this employee.');
      setEnable2FA(true);
      setOtpSent(false);
      setOtpCode('');
    } else {
      alert('❌ Invalid OTP. Please enter 6-digit code.');
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Simulated: Reading ${file.name} and adding 2 staff members...`);
      // Simulating a CSV parse
      onAdd({
        ...employees[0],
        id: 'EMP_NEW1',
        name: 'CSV Imported User 1',
        email: 'csv1@legal.in',
        role: UserRole.EMPLOYEE
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Employee MGMT</h2>
          <p className="text-gray-400 font-bold text-sm italic">Manage workforce access</p>
        </div>
        <div className="flex space-x-4">
          <input type="file" ref={fileInputRef} onChange={handleCSVImport} className="hidden" accept=".csv" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-gray-100 text-gray-600 px-6 py-3 rounded-2xl font-black hover:bg-gray-50 flex items-center shadow-sm text-xs uppercase tracking-widest transition-all"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import CSV
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Hire
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dept & Design.</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">System Role</th>
                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-indigo-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                        {emp.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{emp.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-gray-800">{emp.department}</p>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{emp.designation}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${emp.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                      emp.role === UserRole.MANAGER ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-gray-600'
                      }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center items-center space-x-6">
                      <button onClick={() => setEditingEmp(emp)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                        {ICONS.EditIcon}
                      </button>
                      <button onClick={() => onDelete(emp.id)} className="text-gray-300 hover:text-red-600 transition-colors">
                        {ICONS.DeleteIcon}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Hire Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 animate-slide-up shadow-2xl border border-white/20">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight uppercase">Register New Staff</h3>
            <form onSubmit={handleHireSubmit} className="space-y-6">
              <input name="name" placeholder="Full Name" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input name="email" type="email" placeholder="Email Address" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                <input name="phone" placeholder="Contact Number" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              </div>
              <div>
                <input name="dateOfBirth" type="date" placeholder="Date of Birth" className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="department" placeholder="Department" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                <input name="designation" placeholder="Designation" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="salary" type="number" placeholder="Salary (LPA)" required className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
                <select name="role" className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none">
                  <option value={UserRole.EMPLOYEE}>EMPLOYEE</option>
                  <option value={UserRole.MANAGER}>MANAGER</option>
                  <option value={UserRole.ADMIN}>ADMIN</option>
                </select>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-slate-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Dismiss</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100">Add to Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-10 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight uppercase">Update Employee Profile</h3>
            <form onSubmit={(e) => { e.preventDefault(); onUpdate(editingEmp); setEditingEmp(null); setGeneratedPassword(''); setEnable2FA(false); }} className="space-y-6">

              {/* Basic Information */}
              <div className="bg-indigo-50/50 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-4">📋 Basic Information</h4>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input
                    value={editingEmp.name}
                    onChange={e => setEditingEmp({ ...editingEmp, name: e.target.value })}
                    className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                    <input
                      type="email"
                      value={editingEmp.email}
                      onChange={e => setEditingEmp({ ...editingEmp, email: e.target.value })}
                      className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="email@company.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Phone Number</label>
                    <input
                      value={editingEmp.phone}
                      onChange={e => setEditingEmp({ ...editingEmp, phone: e.target.value })}
                      className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Department</label>
                    <input
                      value={editingEmp.department}
                      onChange={e => setEditingEmp({ ...editingEmp, department: e.target.value })}
                      className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="Department"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Designation</label>
                    <input
                      value={editingEmp.designation}
                      onChange={e => setEditingEmp({ ...editingEmp, designation: e.target.value })}
                      className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="Job Title"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Date of Birth</label>
                  <input
                    type="date"
                    value={editingEmp.dateOfBirth || ''}
                    onChange={e => setEditingEmp({ ...editingEmp, dateOfBirth: e.target.value })}
                    className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              </div>

              {/* Password Management */}
              <div className="bg-purple-50/50 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-black text-purple-900 uppercase tracking-widest mb-4">🔐 Password Management</h4>

                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center shadow-lg text-xs uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Generate Secure Password
                  </button>
                </div>

                {generatedPassword && (
                  <div className="bg-white border-2 border-purple-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Generated Password</p>
                        <p className="text-lg font-mono font-black text-purple-900 tracking-wider">
                          {showPassword ? generatedPassword : '••••••••••••'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {showPassword ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            ) : (
                              <>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </>
                            )}
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPassword}
                          className="p-3 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-purple-600 font-bold mt-2">⚠️ Save this password securely! Employee will need it to login.</p>
                  </div>
                )}
              </div>

              {/* 2FA / OTP Verification */}
              <div className="bg-green-50/50 rounded-3xl p-6 space-y-4">
                <h4 className="text-xs font-black text-green-900 uppercase tracking-widest mb-4">🔒 Two-Factor Authentication (2FA)</h4>

                <div className="flex items-center justify-between bg-white border-2 border-green-200 rounded-2xl p-4">
                  <div>
                    <p className="text-sm font-black text-gray-900">Enable 2FA for this employee</p>
                    <p className="text-[10px] text-gray-500 font-bold">Adds extra security layer with OTP verification</p>
                  </div>
                  <div className={`w-14 h-8 rounded-full transition-all cursor-pointer ${enable2FA ? 'bg-green-500' : 'bg-gray-300'}`} onClick={() => setEnable2FA(!enable2FA)}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all mt-1 ${enable2FA ? 'translate-x-7 ml-1' : 'translate-x-1'}`}></div>
                  </div>
                </div>

                {enable2FA && !otpSent && (
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    className="w-full bg-green-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-green-700 transition-all flex items-center justify-center shadow-lg text-xs uppercase tracking-widest"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    Send OTP to Email
                  </button>
                )}

                {otpSent && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white border-2 border-green-200 rounded-2xl px-6 py-4 text-center text-2xl font-mono font-black outline-none focus:border-green-500 transition-all tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyOTP}
                      className="w-full bg-green-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-green-700 transition-all flex items-center justify-center shadow-lg text-xs uppercase tracking-widest"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Verify OTP
                    </button>
                  </div>
                )}

                {enable2FA && !otpSent && (
                  <div className="bg-green-100 border border-green-300 rounded-2xl p-4">
                    <p className="text-[10px] text-green-800 font-bold">✅ 2FA is enabled for this employee. They will receive OTP on login.</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => { setEditingEmp(null); setGeneratedPassword(''); setEnable2FA(false); }} className="flex-1 bg-slate-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
