// Firebase Sales Service - Real-time sales tracking
import { db } from './firebaseConfig';
import {
    collection,
    setDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import { SalesEntry } from '../types';

class FirebaseSalesService {
    private salesCollection = collection(db, 'sales');

    /**
     * Upsert a sales entry (create or update)
     * Doc ID = employeeId-date to prevent duplicates per employee per day
     */
    async upsertSalesEntry(entry: Omit<SalesEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
        try {
            const docId = `${entry.employeeId}-${entry.date}`;
            const now = new Date().toISOString();

            const data: SalesEntry = {
                id: docId,
                employeeId: entry.employeeId,
                employeeName: entry.employeeName,
                date: entry.date,
                clientName: entry.clientName,
                amount: entry.amount,
                notes: entry.notes,
                createdAt: now,
                updatedAt: now
            };

            await setDoc(doc(db, 'sales', docId), data, { merge: true });
            // Update updatedAt separately so createdAt is preserved on update
            await setDoc(doc(db, 'sales', docId), { updatedAt: now }, { merge: true });

            console.log('🔥 Firebase Sales: Entry saved:', docId);
            return { success: true, id: docId };
        } catch (error) {
            console.error('❌ Firebase Sales upsert error:', error);
            return { success: false, error };
        }
    }

    /**
     * Subscribe to all sales for a given month (real-time)
     * @param yearMonth - format: "2026-03"
     */
    subscribeToMonthlySales(yearMonth: string, callback: (entries: SalesEntry[]) => void) {
        // Filter by date starting with yearMonth prefix
        const startDate = `${yearMonth}-01`;
        const endDate = `${yearMonth}-31`;

        const q = query(
            this.salesCollection,
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map(doc => doc.data() as SalesEntry);
            console.log('🔥 Firebase Sales real-time update:', entries.length, 'entries for', yearMonth);
            callback(entries);
        }, (error) => {
            console.error('❌ Firebase Sales subscription error:', error);
        });

        return unsubscribe;
    }

    /**
     * Delete a sales entry (admin only)
     */
    async deleteSalesEntry(entryId: string) {
        try {
            await deleteDoc(doc(db, 'sales', entryId));
            console.log('🗑️ Firebase Sales: Entry deleted:', entryId);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase Sales delete error:', error);
            return { success: false, error };
        }
    }
}

export const firebaseSalesService = new FirebaseSalesService();
