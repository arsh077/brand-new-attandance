// Firebase Monthly Goals & Employee of Month Service — Live Sync
import { db } from './firebaseConfig';
import { doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';

export interface EmployeeOfMonth {
    id: string;
    name: string;
    designation: string;
    department: string;
}

export interface MonthlyGoals {
    targetAmount: number;       // Monthly sales target in ₹
    targetMonth: string;        // "YYYY-MM" e.g. "2026-05"
    employeeOfMonth: EmployeeOfMonth | null;
    updatedAt?: any;
}

export const DEFAULT_MONTHLY_GOALS: MonthlyGoals = {
    targetAmount: 0,
    targetMonth: '',
    employeeOfMonth: null
};

class FirebaseTargetService {
    private goalsRef = doc(db, 'settings', 'monthly_goals');

    /**
     * Subscribe to real-time monthly goals (live Firestore sync)
     */
    subscribeToMonthlyGoals(callback: (goals: MonthlyGoals) => void) {
        return onSnapshot(this.goalsRef, (docSnap) => {
            if (docSnap.exists()) {
                console.log('🎯 Firebase: Monthly goals synced');
                callback(docSnap.data() as MonthlyGoals);
            } else {
                console.log('⚠️ Firebase: No monthly goals doc found, using defaults');
                callback(DEFAULT_MONTHLY_GOALS);
            }
        }, (error) => {
            console.error('❌ Firebase monthly goals subscription error:', error);
            callback(DEFAULT_MONTHLY_GOALS);
        });
    }

    /**
     * Update monthly goals — Admin use only
     */
    async updateMonthlyGoals(goals: Omit<MonthlyGoals, 'updatedAt'>) {
        try {
            await setDoc(this.goalsRef, {
                ...goals,
                updatedAt: Timestamp.now()
            }, { merge: true });
            console.log('✅ Firebase: Monthly goals updated');
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase updateMonthlyGoals error:', error);
            return { success: false, error };
        }
    }
}

export const firebaseTargetService = new FirebaseTargetService();
