// Firebase Monthly Goals & Employee of Month Service — Live Sync
import { db } from './firebaseConfig';
import { doc, setDoc, onSnapshot, Timestamp } from 'firebase/firestore';

export interface EmployeeOfMonth {
    id: string;
    name: string;
    designation: string;
    department: string;
}

// A special/bonus target separate from the regular monthly target
export interface SpecialTarget {
    name: string;           // e.g. "Diwali Drive", "Q2 Bonus"
    targetAmount: number;   // special target amount in ₹
    description?: string;   // optional description
}

export interface MonthlyGoals {
    targetAmount: number;           // Regular monthly sales target in ₹
    targetMonth: string;            // "YYYY-MM" e.g. "2026-05"
    employeeOfMonth: EmployeeOfMonth | null;
    specialTarget: SpecialTarget | null;  // Special/bonus target
    updatedAt?: any;
}

export const DEFAULT_MONTHLY_GOALS: MonthlyGoals = {
    targetAmount: 0,
    targetMonth: '',
    employeeOfMonth: null,
    specialTarget: null
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

