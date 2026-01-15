
import React, { useState } from 'react';
import { LeaveType, LeaveStatus, UserRole, Employee, LeaveRequest } from '../types';

interface LeavesProps {
  role: UserRole;
  currentUser: Employee;
  requests: LeaveRequest[];
  onApply: (req: LeaveRequest) => void;
  onAction: (id: string, status: LeaveStatus) => void;
}

const Leaves: React.FC<LeavesProps> = ({ role, currentUser, requests, onApply, onAction }) => {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const isAdmin = role === UserRole.ADMIN || role === UserRole.MANAGER;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newReq: LeaveRequest = {
      id: `LR${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      type: fd.get('type') as LeaveType,
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string,
      reason: fd.get('reason') as string,
      status: LeaveStatus.PENDING,
      appliedDate: new Date().toLocaleDateString()
    };
    onApply(newReq);
    setShowApplyModal(false);
  };

  const filteredRequests = isAdmin ? requests : requests.filter(r => r.employeeId === currentUser.id);

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Leave Management</h2>
          <p className="text-gray-400 font-medium">Manage time-off requests</p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-sm uppercase tracking-widest"
        >
          Apply Now
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {isAdmin ? 'Organization Leave Requests' : 'My Requests'}
          </h3>
          <div className="flex space-x-2">
            <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                {isAdmin && <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRequests.length > 0 ? filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{req.employeeName}</p>
                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{req.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-700">{req.startDate} to {req.endDate}</p>
                    <p className="text-[10px] text-gray-400 font-medium italic">"{req.reason}"</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      req.status === LeaveStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' :
                      req.status === LeaveStatus.REJECTED ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-right">
                      {req.status === LeaveStatus.PENDING && (
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => onAction(req.id, LeaveStatus.APPROVED)} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:underline">Approve</button>
                          <button onClick={() => onAction(req.id, LeaveStatus.REJECTED)} className="text-[10px] font-black uppercase tracking-widest text-red-600 hover:underline">Reject</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )) : (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400 text-sm italic">No requests to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-10 animate-slide-up shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Apply for Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Leave Type</label>
                    <select name="type" className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none">
                      <option value={LeaveType.CASUAL}>Casual Leave</option>
                      <option value={LeaveType.SICK}>Sick Leave</option>
                      <option value={LeaveType.EARNED}>Earned Leave</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duration Type</label>
                    <select className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none">
                      <option>Full Day</option>
                      <option>First Half</option>
                      <option>Second Half</option>
                    </select>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <input type="date" name="startDate" required className="bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
                <input type="date" name="endDate" required className="bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold outline-none" />
              </div>
              
              <textarea name="reason" rows={3} placeholder="Tell us why you need this time..." required className="w-full bg-slate-50 border-0 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none resize-none" />
              
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowApplyModal(false)} className="flex-1 bg-slate-100 text-gray-500 font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
