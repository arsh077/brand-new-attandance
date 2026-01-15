
import React, { useState, useRef } from 'react';
import { Employee, UserRole, LeaveType } from '../types';
import { ICONS } from '../constants';

interface EmployeesProps {
  employees: Employee[];
  onAdd: (emp: Employee) => void;
  onUpdate: (emp: Employee) => void;
  onDelete: (id: string) => void;
}

const Employees: React.FC<EmployeesProps> = ({ employees, onAdd, onUpdate, onDelete }) => {
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isAdding, setIsAdding] = useState(false);
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
      leaveBalance: { [LeaveType.CASUAL]: 10, [LeaveType.SICK]: 10, [LeaveType.EARNED]: 10, [LeaveType.LOP]: 0 }
    };
    onAdd(newEmp);
    setIsAdding(false);
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
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
             Import CSV
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest"
          >
             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
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
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                      emp.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
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
          <div className="bg-white rounded-[40px] w-full max-w-md p-10 animate-slide-up shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight uppercase">Update Profile</h3>
            <form onSubmit={(e) => { e.preventDefault(); onUpdate(editingEmp); setEditingEmp(null); }} className="space-y-5">
              <input value={editingEmp.name} onChange={e => setEditingEmp({...editingEmp, name: e.target.value})} className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              <input value={editingEmp.designation} onChange={e => setEditingEmp({...editingEmp, designation: e.target.value})} className="w-full bg-slate-50 border-0 rounded-2xl px-6 py-4 text-sm font-bold outline-none" />
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setEditingEmp(null)} className="flex-1 bg-slate-100 text-gray-500 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
