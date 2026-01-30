// Firebase Leave Service - Real-time leave management
import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    setDoc,
    updateDoc,
    doc,
    onSnapshot,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';

class FirebaseLeaveService {
    private leaveCollection = collection(db, 'leaveRequests');

    /**
     * Submit a new leave request
     */
    async submitLeave(leaveData: any) {
        try {
            // Use the provided ID or generate a new one
            const leaveId = leaveData.id || `LR${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            const leaveRequest = {
                ...leaveData,
                id: leaveId, // Store the ID in the document itself
                status: 'PENDING',
                timestamp: Timestamp.now(),
                createdAt: new Date().toISOString()
            };

            // Use setDoc with the custom ID instead of addDoc
            await setDoc(doc(db, 'leaveRequests', leaveId), leaveRequest);
            console.log('🔥 Firebase: Leave request submitted with ID:', leaveId);

            return { success: true, id: leaveId };
        } catch (error) {
            console.error('❌ Firebase submitLeave error:', error);
            return { success: false, error };
        }
    }

    /**
     * Update leave status (Approve/Reject)
     */
    async updateLeaveStatus(leaveId: string, status: 'APPROVED' | 'REJECTED') {
        try {
            const leaveRef = doc(db, 'leaveRequests', leaveId);

            await updateDoc(leaveRef, {
                status,
                updatedAt: new Date().toISOString(),
                timestamp: Timestamp.now()
            });

            console.log('🔥 Firebase: Leave status updated to', status);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase updateLeaveStatus error:', error);
            return { success: false, error };
        }
    }

    /**
     * Subscribe to pending leave requests (for Admin/Manager)
     * Real-time updates when new leave requests are submitted
     */
    subscribeToPendingLeaves(callback: (leaves: any[]) => void) {
        const q = query(
            this.leaveCollection,
            where('status', '==', 'PENDING'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leaves = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase: Pending leave requests:', leaves.length);
            callback(leaves);
        }, (error) => {
            console.error('❌ Firebase pending leaves subscription error:', error);
        });

        return unsubscribe;
    }

    /**
     * Subscribe to all leave requests (real-time)
     */
    subscribeToAllLeaves(callback: (leaves: any[]) => void) {
        const q = query(this.leaveCollection, orderBy('timestamp', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leaves = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase: All leave requests:', leaves.length);
            callback(leaves);
        });

        return unsubscribe;
    }

    /**
     * Subscribe to user's own leave requests
     */
    subscribeToUserLeaves(employeeId: string, callback: (leaves: any[]) => void) {
        const q = query(
            this.leaveCollection,
            where('employeeId', '==', employeeId),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const leaves = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('🔥 Firebase: User leave requests:', leaves.length);
            callback(leaves);
        });

        return unsubscribe;
    }
}

export const firebaseLeaveService = new FirebaseLeaveService();
