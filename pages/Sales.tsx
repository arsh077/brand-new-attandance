import React, { useState, useEffect, useCallback } from 'react';
import { Employee, SalesEntry, UserRole } from '../types';
import { firebaseSalesService } from '../services/firebaseSalesService';

interface SalesProps {
    currentUser: Employee;
    employees: Employee[];
}

const Sales: React.FC<SalesProps> = ({ currentUser, employees }) => {
    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

    // Current month state
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

    // Sales data
    const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modal, setModal] = useState<{
        open: boolean;
        employeeId: string;
        employeeName: string;
        date: string;
        existing?: SalesEntry;
    } | null>(null);

    const [formData, setFormData] = useState({
        clientName: '',
        amount: '',
        notes: ''
    });

    const [saving, setSaving] = useState(false);

    // Month navigation
    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const yearMonthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const monthName = new Date(viewYear, viewMonth, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    // Days in month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Employees to show
    const visibleEmployees = isAdmin
        ? employees.filter(e => e.status === 'ACTIVE')
        : employees.filter(e => e.id === currentUser.id);

    // Firebase real-time subscription
    useEffect(() => {
        setLoading(true);
        const unsub = firebaseSalesService.subscribeToMonthlySales(yearMonthStr, (entries) => {
            setSalesEntries(entries);
            setLoading(false);
        });
        return () => unsub();
    }, [yearMonthStr]);

    // Get entry for a specific employee and day
    const getEntry = useCallback((employeeId: string, day: number): SalesEntry | undefined => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return salesEntries.find(e => e.employeeId === employeeId && e.date === dateStr);
    }, [salesEntries, viewYear, viewMonth]);

    // Open modal
    const openModal = (emp: Employee, day: number) => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const existing = getEntry(emp.id, day);
        // Employee can only edit their own; admin/manager can edit all
        if (!isAdmin && emp.id !== currentUser.id) return;

        setModal({ open: true, employeeId: emp.id, employeeName: emp.name, date: dateStr, existing });
        setFormData({
            clientName: existing?.clientName || '',
            amount: existing?.amount?.toString() || '',
            notes: existing?.notes || ''
        });
    };

    const closeModal = () => {
        setModal(null);
        setFormData({ clientName: '', amount: '', notes: '' });
    };

    const handleSave = async () => {
        if (!modal) return;
        if (!formData.clientName.trim()) { alert('Client name is required!'); return; }
        if (!formData.amount || isNaN(Number(formData.amount))) { alert('Enter a valid amount!'); return; }

        setSaving(true);
        await firebaseSalesService.upsertSalesEntry({
            employeeId: modal.employeeId,
            employeeName: modal.employeeName,
            date: modal.date,
            clientName: formData.clientName.trim(),
            amount: Number(formData.amount),
            notes: formData.notes.trim()
        });
        setSaving(false);
        closeModal();
    };

    const handleDelete = async () => {
        if (!modal?.existing) return;
        if (!confirm('Delete this sales entry?')) return;
        setSaving(true);
        await firebaseSalesService.deleteSalesEntry(modal.existing.id);
        setSaving(false);
        closeModal();
    };

    // Excel Download
    const handleDownloadExcel = () => {
        // Build CSV data
        const headers = ['Employee', ...days.map(d => `${d} ${new Date(viewYear, viewMonth, d).toLocaleString('en-IN', { weekday: 'short' })}`), 'Total (₹)'];

        const rows = visibleEmployees.map(emp => {
            const dayCells = days.map(day => {
                const entry = getEntry(emp.id, day);
                return entry ? `₹${entry.amount} - ${entry.clientName}` : '';
            });
            const total = days.reduce((sum, day) => {
                const entry = getEntry(emp.id, day);
                return sum + (entry?.amount || 0);
            }, 0);
            return [emp.name, ...dayCells, `₹${total.toLocaleString('en-IN')}`];
        });

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales_${monthName.replace(' ', '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Monthly totals
    const getEmployeeTotal = (empId: string) =>
        salesEntries.filter(e => e.employeeId === empId).reduce((s, e) => s + e.amount, 0);
    const grandTotal = visibleEmployees.reduce((s, e) => s + getEmployeeTotal(e.id), 0);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Employee Sales</h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">Track daily sales entries for each employee</p>
                </div>
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Excel
                </button>
            </div>

            {/* Month Navigator */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6 p-4 flex items-center justify-between">
                <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-600 font-bold text-lg">‹</button>
                <div className="text-center">
                    <h2 className="text-lg font-black text-gray-900">{monthName}</h2>
                    {isAdmin && (
                        <p className="text-xs text-gray-400 mt-0.5">Grand Total: <span className="text-emerald-600 font-bold">₹{grandTotal.toLocaleString('en-IN')}</span></p>
                    )}
                </div>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-600 font-bold text-lg">›</button>
            </div>

            {/* Stats for Employee (non-admin) */}
            {!isAdmin && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">This Month Total</p>
                        <p className="text-3xl font-black text-indigo-700 mt-1">₹{getEmployeeTotal(currentUser.id).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Entries Logged</p>
                        <p className="text-3xl font-black text-emerald-700 mt-1">
                            {salesEntries.filter(e => e.employeeId === currentUser.id).length}
                        </p>
                    </div>
                </div>
            )}

            {/* Sales Table */}
            {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium">Loading sales data...</span>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse" style={{ minWidth: `${visibleEmployees.length > 0 ? 800 : 400}px` }}>
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="sticky left-0 bg-gray-50 text-left px-5 py-4 font-black text-gray-700 text-xs uppercase tracking-wider border-r border-gray-100 min-w-[160px] z-10">
                                        Employee
                                    </th>
                                    {days.map(day => {
                                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isToday = dateStr === todayStr;
                                        const dayName = new Date(viewYear, viewMonth, day).toLocaleString('en-IN', { weekday: 'short' });
                                        const isSun = new Date(viewYear, viewMonth, day).getDay() === 0;
                                        return (
                                            <th key={day} className={`px-2 py-4 font-bold text-center min-w-[80px] border-r border-gray-50 ${isToday ? 'bg-indigo-600 text-white' : isSun ? 'text-red-400' : 'text-gray-500'}`}>
                                                <div className="text-xs">{dayName}</div>
                                                <div className={`text-base font-black ${isToday ? 'text-white' : ''}`}>{day}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="px-4 py-4 font-black text-gray-700 text-xs uppercase tracking-wider text-center min-w-[100px] bg-emerald-50">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleEmployees.map((emp, empIdx) => {
                                    const empTotal = getEmployeeTotal(emp.id);
                                    return (
                                        <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            {/* Employee name - sticky */}
                                            <td className={`sticky left-0 px-5 py-4 border-r border-gray-100 z-10 ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                                                        {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-xs leading-tight">{emp.name}</p>
                                                        <p className="text-gray-400 text-[10px]">{emp.designation}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Day cells */}
                                            {days.map(day => {
                                                const entry = getEntry(emp.id, day);
                                                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isToday = dateStr === todayStr;
                                                const canEdit = isAdmin || emp.id === currentUser.id;
                                                const isSun = new Date(viewYear, viewMonth, day).getDay() === 0;

                                                return (
                                                    <td
                                                        key={day}
                                                        onClick={() => canEdit && openModal(emp, day)}
                                                        className={`px-1.5 py-2 text-center border-r border-gray-50 transition-all
                              ${canEdit ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}
                              ${isToday ? 'bg-indigo-50/40' : ''}
                              ${isSun && !entry ? 'bg-red-50/20' : ''}
                            `}
                                                        title={entry ? `${entry.clientName}: ₹${entry.amount}${entry.notes ? '\n' + entry.notes : ''}` : canEdit ? 'Click to add' : ''}
                                                    >
                                                        {entry ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-emerald-700 font-black text-xs leading-tight">
                                                                    ₹{entry.amount >= 1000 ? (entry.amount / 1000).toFixed(1) + 'k' : entry.amount}
                                                                </span>
                                                                <span className="text-gray-400 text-[9px] leading-tight truncate max-w-[70px]">{entry.clientName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[11px] ${canEdit ? 'text-gray-200 hover:text-indigo-300' : 'text-gray-100'}`}>
                                                                {canEdit ? '+' : '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Total */}
                                            <td className="px-4 py-3 text-center font-black text-emerald-700 bg-emerald-50">
                                                {empTotal > 0 ? (
                                                    <span>₹{empTotal.toLocaleString('en-IN')}</span>
                                                ) : (
                                                    <span className="text-gray-300 font-medium">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Grand total row (admin only) */}
                                {isAdmin && visibleEmployees.length > 1 && (
                                    <tr className="bg-indigo-600">
                                        <td className="sticky left-0 bg-indigo-600 px-5 py-4 font-black text-white text-xs uppercase tracking-wider border-r border-indigo-500 z-10">
                                            Grand Total
                                        </td>
                                        {days.map(day => {
                                            const dayTotal = visibleEmployees.reduce((sum, emp) => {
                                                const entry = getEntry(emp.id, day);
                                                return sum + (entry?.amount || 0);
                                            }, 0);
                                            return (
                                                <td key={day} className="px-1.5 py-3 text-center border-r border-indigo-500">
                                                    {dayTotal > 0 ? (
                                                        <span className="text-white font-black text-xs">
                                                            ₹{dayTotal >= 1000 ? (dayTotal / 1000).toFixed(1) + 'k' : dayTotal}
                                                        </span>
                                                    ) : (
                                                        <span className="text-indigo-400 text-xs">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center font-black text-white bg-indigo-700">
                                            ₹{grandTotal.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Hint */}
            <p className="text-center text-xs text-gray-300 mt-4">
                {isAdmin ? 'Click any cell to add or edit a sales entry for any employee' : 'Click any cell in your row to add or edit your sales entry'}
            </p>

            {/* Modal */}
            {modal?.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-2xl p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-white font-black text-lg">Sales Entry</h3>
                                    <p className="text-indigo-200 text-sm mt-1">
                                        {modal.employeeName} — {new Date(modal.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="text-indigo-200 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* Client Name */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Client Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Rahul Sharma / ABC Corp"
                                    value={formData.clientName}
                                    onChange={e => setFormData(f => ({ ...f, clientName: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Sale Amount (₹) <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        min="0"
                                        value={formData.amount}
                                        onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Notes / Message
                                </label>
                                <textarea
                                    placeholder="e.g. Trademark filing for client, consultation done..."
                                    value={formData.notes}
                                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-6 flex items-center gap-3">
                            {modal.existing && isAdmin && (
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            )}
                            <button
                                onClick={closeModal}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 px-4 py-3 rounded-xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                            >
                                {saving ? 'Saving...' : modal.existing ? 'Update Entry' : 'Save Entry'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
