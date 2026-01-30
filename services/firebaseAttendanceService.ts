// Firebase Attendance Service - Real-time attendance tracking
import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
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
    async clockIn(employeeId: string, employeeName: string, clockInTime: string, isLate: boolean) {
        try {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const attendanceData = {
                employeeId,
                employeeName,
                date: today,
                clockIn: clockInTime,
                isLate,
                status: isLate ? 'LATE' : 'PRESENT',
                timestamp: Timestamp.now(),
                createdAt: new Date().toISOString()
            };

            const docRef = await addDoc(this.attendanceCollection, attendanceData);
            console.log('🔥 Firebase: Clock in saved with ID:', docRef.id);

            return { success: true, id: docRef.id };
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
     * Subscribe to real-time attendance updates
     * This will automatically update whenever attendance data changes in Firestore
     */
    subscribeToAttendance(callback: (attendance: any[]) => void) {
        const q = query(this.attendanceCollection, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const attendanceList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase real-time update:', attendanceList.length, 'records');
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
