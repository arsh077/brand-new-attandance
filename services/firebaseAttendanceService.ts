// Firebase Attendance Service - Real-time attendance tracking
import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    setDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    where,
    Timestamp
} from 'firebase/firestore';

class FirebaseAttendanceService {
    private attendanceCollection = collection(db, 'attendance');

    /**
     * Clock In - Create new attendance record
     */
    async clockIn(employeeId: string, employeeName: string, clockInTime: string, status: string, isLate: boolean) {
        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // Use composite key: employeeId-date to prevent duplicates
            const docId = `${employeeId}-${today}`;

            const attendanceData = {
                employeeId,
                employeeName,
                date: today,
                clockIn: clockInTime,
                clockOut: '',
                isLate,
                status: status, // Use passed status directly
                timestamp: Timestamp.now(),
                createdAt: new Date().toISOString()
            };

            // Use setDoc to update if exists, create if doesn't
            await setDoc(doc(db, 'attendance', docId), attendanceData, { merge: true });
            console.log('🔥 Firebase: Clock in saved with ID:', docId);

            return { success: true, id: docId };
        } catch (error) {
            console.error('❌ Firebase clockIn error:', error);
            return { success: false, error };
        }
    }

    /**
     * Clock Out - Update existing attendance record
     */
    async clockOut(attendanceId: string, clockOutTime: string) {
        try {
            const attendanceRef = doc(db, 'attendance', attendanceId);

            await updateDoc(attendanceRef, {
                clockOut: clockOutTime,
                updatedAt: new Date().toISOString(),
                timestamp: Timestamp.now()
            });

            console.log('🔥 Firebase: Clock out updated for ID:', attendanceId);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase clockOut error:', error);
            return { success: false, error };
        }
    }

    /**
     * Start Break - Record break start time
     */
    async startBreak(attendanceId: string) {
        try {
            const attendanceRef = doc(db, 'attendance', attendanceId);
            await updateDoc(attendanceRef, {
                breakStart: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            console.log('🔥 Firebase: Break started for ID:', attendanceId);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase startBreak error:', error);
            return { success: false, error };
        }
    }

    /**
     * End Break - Record break end time and accumulate duration
     */
    async endBreak(attendanceId: string, currentBreakStart: string, previousHistory: any[] = []) {
        try {
            const attendanceRef = doc(db, 'attendance', attendanceId);
            const now = new Date();
            const start = new Date(currentBreakStart);
            const durationSeconds = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));

            const newBreak = {
                start: currentBreakStart,
                end: now.toISOString(),
                durationSeconds
            };

            const updatedHistory = [...previousHistory, newBreak];
            const totalSeconds = updatedHistory.reduce((sum, b) => sum + (b.durationSeconds || 0), 0);
            const totalMinutes = Math.round(totalSeconds / 60);

            await updateDoc(attendanceRef, {
                breakStart: null,
                breakHistory: updatedHistory,
                totalBreakMinutes: totalMinutes,
                updatedAt: now.toISOString()
            });

            console.log('🔥 Firebase: Break ended for ID:', attendanceId, 'Duration:', durationSeconds, 'sec');
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase endBreak error:', error);
            return { success: false, error };
        }
    }


    /**
     * Subscribe to real-time attendance updates
     * Fetches last 90 days only for performance — sufficient for all views
     */
    subscribeToAttendance(callback: (attendance: any[]) => void) {
        // Only fetch attendance from last 90 days to limit Firestore reads
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 90);
        const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;

        const q = query(
            this.attendanceCollection,
            where('date', '>=', cutoffStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const attendanceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase real-time update:', attendanceList.length, 'records (last 90 days)');
            callback(attendanceList);
        }, (error) => {
            console.error('❌ Firebase attendance subscription error:', error);
        });

        return unsubscribe; // Call this function to stop listening
    }


    /**
     * Get today's attendance records
     */
    subscribeToTodayAttendance(callback: (attendance: any[]) => void) {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const q = query(
            this.attendanceCollection,
            where('date', '==', today),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const attendanceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase today attendance:', attendanceList.length, 'records');
            callback(attendanceList);
        });

        return unsubscribe;
    }
}

export const firebaseAttendanceService = new FirebaseAttendanceService();
