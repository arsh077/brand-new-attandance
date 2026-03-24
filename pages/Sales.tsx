import React, { useState, useEffect, useCallback } from 'react';
import { Employee, SalesEntry, UserRole } from '../types';
import { firebaseSalesService } from '../services/firebaseSalesService';

interface SalesProps {
    currentUser: Employee;
    employees: Employee[];
}

interface EntryForm {
    id?: string; // if editing existing
    clientName: string;
    amount: string;
    notes: string;
}

const BLANK_FORM: EntryForm = { clientName: '', amount: '', notes: '' };

const Sales: React.FC<SalesProps> = ({ currentUser, employees }) => {
    const isAdmin = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

    // Current month state
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    // Sales data
    const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modal, setModal] = useState<{
        open: boolean;
        employeeId: string;
        employeeName: string;
        date: string;
    } | null>(null);

    // Form for adding/editing inside modal
    const [activeForm, setActiveForm] = useState<EntryForm | null>(null);
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
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

    // Get ALL entries for a specific employee + day
    const getDayEntries = useCallback((employeeId: string, day: number): SalesEntry[] => {
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return salesEntries.filter(e => e.employeeId === employeeId && e.date === dateStr);
    }, [salesEntries, viewYear, viewMonth]);

    // Get day total
    const getDayTotal = (employeeId: string, day: number) =>
        getDayEntries(employeeId, day).reduce((s, e) => s + e.amount, 0);

    // Get modal's current day entries
    const modalEntries = modal
        ? salesEntries.filter(e => e.employeeId === modal.employeeId && e.date === modal.date)
        : [];

    // Open modal
    const openModal = (emp: Employee, day: number) => {
        if (!isAdmin && emp.id !== currentUser.id) return;
        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setModal({ open: true, employeeId: emp.id, employeeName: emp.name, date: dateStr });
        setActiveForm(null);
    };

    const closeModal = () => {
        setModal(null);
        setActiveForm(null);
    };

    // Start editing an existing entry
    const startEdit = (entry: SalesEntry) => {
        setActiveForm({ id: entry.id, clientName: entry.clientName, amount: entry.amount.toString(), notes: entry.notes });
    };

    // Start adding a new entry
    const startAdd = () => {
        setActiveForm({ ...BLANK_FORM });
    };

    const cancelForm = () => setActiveForm(null);

    const handleSave = async () => {
        if (!modal || !activeForm) return;
        if (!activeForm.clientName.trim()) { alert('Client name is required!'); return; }
        if (!activeForm.amount || isNaN(Number(activeForm.amount)) || Number(activeForm.amount) <= 0) {
            alert('Enter a valid amount!'); return;
        }

        setSaving(true);
        if (activeForm.id) {
            // Update existing
            await firebaseSalesService.updateSalesEntry(activeForm.id, {
                clientName: activeForm.clientName.trim(),
                amount: Number(activeForm.amount),
                notes: activeForm.notes.trim()
            });
        } else {
            // Add new
            await firebaseSalesService.addSalesEntry({
                employeeId: modal.employeeId,
                employeeName: modal.employeeName,
                date: modal.date,
                clientName: activeForm.clientName.trim(),
                amount: Number(activeForm.amount),
                notes: activeForm.notes.trim()
            });
        }
        setSaving(false);
        setActiveForm(null);
    };

    const handleDelete = async (entryId: string) => {
        if (!confirm('Delete this entry?')) return;
        setSaving(true);
        await firebaseSalesService.deleteSalesEntry(entryId);
        setSaving(false);
        if (activeForm?.id === entryId) setActiveForm(null);
    };

    // Employee monthly total
    const getEmpTotal = (empId: string) => salesEntries.filter(e => e.employeeId === empId).reduce((s, e) => s + e.amount, 0);
    const grandTotal = visibleEmployees.reduce((s, e) => s + getEmpTotal(e.id), 0);

    // Excel/CSV download
    const handleDownload = () => {
        const headers = ['Employee', ...days.map(d => `${d} ${new Date(viewYear, viewMonth, d).toLocaleString('en-IN', { weekday: 'short' })}`), 'Total (₹)'];
        const rows = visibleEmployees.map(emp => {
            const dayCells = days.map(day => {
                const entries = getDayEntries(emp.id, day);
                if (!entries.length) return '';
                return entries.map(e => `₹${e.amount} - ${e.clientName}`).join(' | ');
            });
            return [emp.name, ...dayCells, `₹${getEmpTotal(emp.id).toLocaleString('en-IN')}`];
        });
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sales_${monthName.replace(' ', '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Employee Sales</h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">Track daily sales — multiple clients per day supported</p>
                </div>
                <button onClick={handleDownload} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all">
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
                    {isAdmin && <p className="text-xs text-gray-400 mt-0.5">Grand Total: <span className="text-emerald-600 font-bold">₹{grandTotal.toLocaleString('en-IN')}</span></p>}
                </div>
                <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all text-gray-600 font-bold text-lg">›</button>
            </div>

            {/* Stats (employee view) */}
            {!isAdmin && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                        <p className="text-xs text-indigo-500 font-bold uppercase tracking-wider">This Month Total</p>
                        <p className="text-3xl font-black text-indigo-700 mt-1">₹{getEmpTotal(currentUser.id).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Entries Logged</p>
                        <p className="text-3xl font-black text-emerald-700 mt-1">{salesEntries.filter(e => e.employeeId === currentUser.id).length}</p>
                    </div>
                </div>
            )}

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
                        <table className="w-full text-sm border-collapse" style={{ minWidth: '800px' }}>
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="sticky left-0 bg-gray-50 text-left px-5 py-4 font-black text-gray-700 text-xs uppercase tracking-wider border-r border-gray-100 min-w-[160px] z-10">Employee</th>
                                    {days.map(day => {
                                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isToday = dateStr === todayStr;
                                        const isSun = new Date(viewYear, viewMonth, day).getDay() === 0;
                                        const dayName = new Date(viewYear, viewMonth, day).toLocaleString('en-IN', { weekday: 'short' });
                                        return (
                                            <th key={day} className={`px-2 py-4 font-bold text-center min-w-[80px] border-r border-gray-50 ${isToday ? 'bg-indigo-600 text-white' : isSun ? 'text-red-400' : 'text-gray-500'}`}>
                                                <div className="text-xs">{dayName}</div>
                                                <div className="text-base font-black">{day}</div>
                                            </th>
                                        );
                                    })}
                                    <th className="px-4 py-4 font-black text-gray-700 text-xs uppercase tracking-wider text-center min-w-[100px] bg-emerald-50">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleEmployees.map((emp, empIdx) => {
                                    const empTotal = getEmpTotal(emp.id);
                                    return (
                                        <tr key={emp.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${empIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            {/* Sticky name */}
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
                                                const dayEntries = getDayEntries(emp.id, day);
                                                const dayTotal = getDayTotal(emp.id, day);
                                                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                                const isToday = dateStr === todayStr;
                                                const isSun = new Date(viewYear, viewMonth, day).getDay() === 0;
                                                const canEdit = isAdmin || emp.id === currentUser.id;

                                                return (
                                                    <td
                                                        key={day}
                                                        onClick={() => canEdit && openModal(emp, day)}
                                                        className={`px-1 py-2 text-center border-r border-gray-50 transition-all
                              ${canEdit ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}
                              ${isToday ? 'bg-indigo-50/40' : ''}
                              ${isSun && !dayEntries.length ? 'bg-red-50/20' : ''}
                            `}
                                                        title={dayEntries.length ? dayEntries.map(e => `${e.clientName}: ₹${e.amount}`).join('\n') : canEdit ? 'Click to add' : ''}
                                                    >
                                                        {dayEntries.length > 0 ? (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <span className="text-emerald-700 font-black text-xs leading-tight">
                                                                    ₹{dayTotal >= 1000 ? (dayTotal / 1000).toFixed(1) + 'k' : dayTotal}
                                                                </span>
                                                                {dayEntries.length > 1 && (
                                                                    <span className="text-[9px] bg-indigo-100 text-indigo-600 font-bold px-1 rounded-full leading-tight">
                                                                        {dayEntries.length} clients
                                                                    </span>
                                                                )}
                                                                {dayEntries.length === 1 && (
                                                                    <span className="text-gray-400 text-[9px] leading-tight truncate max-w-[70px]">{dayEntries[0].clientName}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className={`text-[11px] ${canEdit ? 'text-gray-200' : 'text-gray-100'}`}>
                                                                {canEdit ? '+' : '—'}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Row total */}
                                            <td className="px-4 py-3 text-center font-black text-emerald-700 bg-emerald-50">
                                                {empTotal > 0 ? <span>₹{empTotal.toLocaleString('en-IN')}</span> : <span className="text-gray-300 font-medium">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Grand total row */}
                                {isAdmin && visibleEmployees.length > 1 && (
                                    <tr className="bg-indigo-600">
                                        <td className="sticky left-0 bg-indigo-600 px-5 py-4 font-black text-white text-xs uppercase tracking-wider border-r border-indigo-500 z-10">Grand Total</td>
                                        {days.map(day => {
                                            const dayTotal = visibleEmployees.reduce((sum, emp) => sum + getDayTotal(emp.id, day), 0);
                                            return (
                                                <td key={day} className="px-1.5 py-3 text-center border-r border-indigo-500">
                                                    {dayTotal > 0 ? (
                                                        <span className="text-white font-black text-xs">₹{dayTotal >= 1000 ? (dayTotal / 1000).toFixed(1) + 'k' : dayTotal}</span>
                                                    ) : (
                                                        <span className="text-indigo-400 text-xs">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-center font-black text-white bg-indigo-700">₹{grandTotal.toLocaleString('en-IN')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <p className="text-center text-xs text-gray-300 mt-4">
                {isAdmin ? 'Click any cell to add or manage sales entries' : 'Click any cell in your row to add or manage your sales'}
            </p>

            {/* ===== MODAL ===== */}
            {modal?.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up flex flex-col" style={{ maxHeight: '90vh' }}>

                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-t-2xl p-6 flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-white font-black text-lg">Sales Entries</h3>
                                    <p className="text-indigo-200 text-sm mt-1">
                                        {modal.employeeName} — {new Date(modal.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="text-indigo-200 hover:text-white transition-colors text-2xl leading-none">&times;</button>
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">

                            {/* Existing entries list */}
                            {modalEntries.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                                        {modalEntries.length} {modalEntries.length === 1 ? 'Entry' : 'Entries'} — Total: <span className="text-emerald-600">₹{modalEntries.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}</span>
                                    </p>
                                    <div className="space-y-2">
                                        {modalEntries.map(entry => (
                                            <div key={entry.id} className={`rounded-xl border-2 p-4 transition-all ${activeForm?.id === entry.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                                                {activeForm?.id === entry.id ? (
                                                    /* Edit form for this entry */
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Client Name *</label>
                                                                <input
                                                                    type="text"
                                                                    value={activeForm.clientName}
                                                                    onChange={e => setActiveForm(f => f ? { ...f, clientName: e.target.value } : f)}
                                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                    placeholder="Client name"
                                                                    autoFocus
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Amount (₹) *</label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                                                                    <input
                                                                        type="number"
                                                                        value={activeForm.amount}
                                                                        onChange={e => setActiveForm(f => f ? { ...f, amount: e.target.value } : f)}
                                                                        className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                        placeholder="0"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notes</label>
                                                            <input
                                                                type="text"
                                                                value={activeForm.notes}
                                                                onChange={e => setActiveForm(f => f ? { ...f, notes: e.target.value } : f)}
                                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                                placeholder="Optional notes..."
                                                            />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={cancelForm} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">Cancel</button>
                                                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                                                                {saving ? 'Saving...' : 'Update'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Display mode for this entry */
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-gray-900 text-sm truncate">{entry.clientName}</span>
                                                                <span className="text-emerald-600 font-black text-sm flex-shrink-0">₹{entry.amount.toLocaleString('en-IN')}</span>
                                                            </div>
                                                            {entry.notes && <p className="text-gray-400 text-xs mt-0.5 truncate">{entry.notes}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={() => startEdit(entry)}
                                                                className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-all"
                                                                title="Edit"
                                                                disabled={!!activeForm}
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            {(isAdmin || entry.employeeId === currentUser.id) && (
                                                                <button
                                                                    onClick={() => handleDelete(entry.id)}
                                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all"
                                                                    title="Delete"
                                                                    disabled={saving || !!activeForm}
                                                                >
                                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add new entry form */}
                            {activeForm && !activeForm.id ? (
                                <div className="rounded-xl border-2 border-indigo-400 bg-indigo-50 p-4 space-y-3">
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">New Entry</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Client Name *</label>
                                            <input
                                                type="text"
                                                value={activeForm.clientName}
                                                onChange={e => setActiveForm(f => f ? { ...f, clientName: e.target.value } : f)}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                placeholder="Client name"
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Amount (₹) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                                                <input
                                                    type="number"
                                                    value={activeForm.amount}
                                                    onChange={e => setActiveForm(f => f ? { ...f, amount: e.target.value } : f)}
                                                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Notes / Message</label>
                                        <input
                                            type="text"
                                            value={activeForm.notes}
                                            onChange={e => setActiveForm(f => f ? { ...f, notes: e.target.value } : f)}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                            placeholder="e.g. Trademark filing, consultation..."
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={cancelForm} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white rounded-lg hover:bg-gray-100 transition-all border border-gray-200">Cancel</button>
                                        <button onClick={handleSave} disabled={saving} className="flex-1 py-2 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                                            {saving ? 'Saving...' : 'Save Entry'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Add new button */
                                !activeForm && (
                                    <button
                                        onClick={startAdd}
                                        className="w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition-all font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add New Client Entry
                                    </button>
                                )
                            )}

                            {modalEntries.length === 0 && !activeForm && (
                                <p className="text-center text-sm text-gray-400 py-2">No entries yet. Click above to add your first client.</p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
                            <button onClick={closeModal} className="w-full py-3 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
