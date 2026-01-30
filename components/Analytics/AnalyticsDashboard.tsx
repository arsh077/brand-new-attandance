import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Employee, AttendanceRecord, LeaveRequest } from '../../types';
import { analyticsService } from '../../services/analyticsService';

interface AnalyticsDashboardProps {
    employees: Employee[];
    attendance: AttendanceRecord[];
    leaves: LeaveRequest[];
}

const COLORS = ['#4F46E5', '#EF4444', '#F59E0B', '#10B981'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ employees, attendance, leaves }) => {

    const weeklyStats = useMemo(() =>
        analyticsService.getWeeklyAttendanceStats(attendance, employees.length),
        [attendance, employees.length]
    );

    const deptStats = useMemo(() =>
        analyticsService.getDepartmentStats(attendance, employees),
        [attendance, employees]
    );

    const summary = useMemo(() =>
        analyticsService.getSummaryMetrics(attendance, employees, leaves),
        [attendance, employees, leaves]
    );

    const pieData = [
        { name: 'Present', value: summary.present },
        { name: 'Absent', value: summary.absent },
        { name: 'On Leave', value: summary.onLeave },
    ];

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Analytics Overview</h2>
                    <p className="text-gray-400 font-bold text-sm">Real-time insights & report generation</p>
                </div>
                <button className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                    Download Report
                </button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard
                    title="Attendance Rate"
                    value={`${summary.attendanceRate}%`}
                    trend="+2.5%"
                    trendUp={true}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                    color="bg-indigo-50 text-indigo-600"
                />
                <MetricCard
                    title="Avg. Late Arrival"
                    value={summary.late.toString()}
                    subtitle="Employees Today"
                    trend="-12%"
                    trendUp={true} // Lower is better, visualize as green
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    color="bg-amber-50 text-amber-600"
                />
                <MetricCard
                    title="On Leave"
                    value={summary.onLeave.toString()}
                    subtitle="Approved Requests"
                    trend="Normal"
                    trendUp={true}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                    title="Total Headcount"
                    value={summary.totalEmployees.toString()}
                    subtitle="Active Employees"
                    trend="+4"
                    trendUp={true}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    color="bg-emerald-50 text-emerald-600"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weekly Trend */}
                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-6">Weekly Attendance Trend</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyStats}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="present" stroke="#4F46E5" fillOpacity={1} fill="url(#colorPresent)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Attendance Distribution */}
                <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                    <h3 className="text-lg font-black text-gray-800 mb-6">Today's Distribution</h3>
                    <div className="h-72 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={10} />
                                    ))}
                                </Pie>
                                <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" />
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Department Performance */}
            <div className="bg-white p-6 rounded-[30px] shadow-sm border border-gray-100">
                <h3 className="text-lg font-black text-gray-800 mb-6">Department Performance</h3>
                <div className="space-y-4">
                    {deptStats.map((dept, idx) => (
                        <div key={idx} className="flex items-center">
                            <div className="w-32 text-xs font-bold text-gray-500">{dept.name}</div>
                            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden mx-4">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${dept.attendancePercentage >= 90 ? 'bg-emerald-500' :
                                            dept.attendancePercentage >= 75 ? 'bg-indigo-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${dept.attendancePercentage}%` }}
                                ></div>
                            </div>
                            <div className="w-12 text-right text-xs font-black text-gray-800">{dept.attendancePercentage}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subtitle, trend, trendUp, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl ${color}`}>
                {icon}
            </div>
            {trend && (
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {trend}
                </span>
            )}
        </div>
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</h3>
        <div className="text-3xl font-black text-gray-900">{value}</div>
        {subtitle && <p className="text-xs text-gray-400 mt-2 font-medium">{subtitle}</p>}
    </div>
);

export default AnalyticsDashboard;
