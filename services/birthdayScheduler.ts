import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Employee } from '../types';

class BirthdaySchedulerService {

    /**
     * Get today's date in MM-DD format for birthday matching
     */
    private getTodayMMDD(): string {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${month}-${day}`;
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    private getTodayYYYYMMDD(): string {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    /**
     * Find all employees with birthdays today
     */
    private findBirthdayEmployees(employees: Employee[]): Employee[] {
        const todayMMDD = this.getTodayMMDD();

        return employees.filter(emp => {
            if (!emp.dateOfBirth || emp.status !== 'ACTIVE') return false;

            // Extract MM-DD from employee's dateOfBirth (YYYY-MM-DD)
            const empMMDD = emp.dateOfBirth.substring(5); // Gets "MM-DD"

            return empMMDD === todayMMDD;
        });
    }

    /**
     * Checks if today has any birthdays and sends notification if not already sent.
     * Run this on App mount.
     */
    async checkAndSendBirthdayNotifications(employees: Employee[]) {
        try {
            const today = this.getTodayYYYYMMDD();
            const birthdayEmployees = this.findBirthdayEmployees(employees);

            if (birthdayEmployees.length === 0) {
                // No birthdays today
                return;
            }

            console.log(`🎂 ${birthdayEmployees.length} birthday(s) today! Checking if notification sent...`);

            // Check if we already sent birthday notification today
            const q = query(
                collection(db, 'announcements'),
                where('type', '==', 'BIRTHDAY'),
                where('date', '==', today)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                console.log('✅ Birthday notification already sent today.');
                return;
            }

            // Create birthday announcement
            const birthdayNames = birthdayEmployees.map(emp => emp.name).join(', ');
            const message = birthdayEmployees.length === 1
                ? `🎉 Wishing ${birthdayNames} a very Happy Birthday! 🎂`
                : `🎉 Wishing ${birthdayNames} a very Happy Birthday! 🎂`;

            await addDoc(collection(db, 'announcements'), {
                type: 'BIRTHDAY',
                title: `🎂 Birthday Celebration!`,
                message: message,
                employees: birthdayEmployees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    designation: emp.designation,
                    department: emp.department
                })),
                date: today,
                createdAt: Timestamp.now(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            console.log(`🚀 Birthday notification sent for ${birthdayNames}`);

        } catch (error) {
            console.error('❌ Error in Birthday Scheduler:', error);
        }
    }

    /**
     * Get employees with birthdays today (for client-side display)
     */
    getTodaysBirthdays(employees: Employee[]): Employee[] {
        return this.findBirthdayEmployees(employees);
    }
}

export const birthdayScheduler = new BirthdaySchedulerService();
