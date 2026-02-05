import { AttendanceRecord, Employee, LeaveRequest, AttendanceStatus } from '../types';

export interface DailyStats {
    date: string;
    present: number;
    absent: number;
    late: number;
    leaves: number;
}

export interface DepartmentStats {
    name: string;
    attendancePercentage: number;
    headcount: number;
}

class AnalyticsService {
    /**
     * Calculate daily attendance stats for the last 7 days
     */
    getWeeklyAttendanceStats(attendance: AttendanceRecord[], totalEmployees: number): DailyStats[] {
        const stats: DailyStats[] = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

            const dayRecords = attendance.filter(a => a.date === dateStr);
            const present = dayRecords.filter(a => a.status === AttendanceStatus.PRESENT).length;
            const late = dayRecords.filter(a => a.status === AttendanceStatus.LATE).length;
            const halfDay = dayRecords.filter(a => a.status === AttendanceStatus.HALFDAY).length;

            // Rough calculation: Absent = Total - (Present + Late + HalfDay)
            // Note: This simple logic assumes working days.
            const absent = Math.max(0, totalEmployees - (present + late + halfDay));

            stats.push({
                date: d.toLocaleDateString('en-US', { weekday: 'short' }), // Mon, Tue
                present: present + late + halfDay,
                absent,
                late,
                leaves: 0 // Need leave data integration for accuracy
            });
        }
        return stats;
    }

    /**
     * Calculate Department-wise attendance percentage
     */
    getDepartmentStats(attendance: AttendanceRecord[], employees: Employee[]): DepartmentStats[] {
        const departments = Array.from(new Set(employees.map(e => e.department)));
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayAttendance = attendance.filter(a => a.date === today);

        return departments.map(dept => {
            const deptEmployees = employees.filter(e => e.department === dept);
            const total = deptEmployees.length;
            if (total === 0) return { name: dept, attendancePercentage: 0, headcount: 0 };

            const presentCount = deptEmployees.filter(e =>
                todayAttendance.some(a => a.employeeId === e.id)
            ).length;

            return {
                name: dept,
                attendancePercentage: Math.round((presentCount / total) * 100),
                headcount: total
            };
        });
    }

    /**
     * Get Summary Metrics
     */
    getSummaryMetrics(attendance: AttendanceRecord[], employees: Employee[], leaves: LeaveRequest[]) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const todayRecords = attendance.filter(a => a.date === today);

        const totalEmployees = employees.length;
        const present = todayRecords.length;
        const late = todayRecords.filter(a => a.status === AttendanceStatus.LATE).length;
        const onLeave = leaves.filter(l => l.startDate <= today && l.endDate >= today && l.status === 'APPROVED').length;
        const absent = Math.max(0, totalEmployees - present - onLeave);

        return {
            totalEmployees,
            present,
            absent,
            late,
            onLeave,
            attendanceRate: totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0
        };
    }
}

export const analyticsService = new AnalyticsService();
