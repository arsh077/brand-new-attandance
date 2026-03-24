// Firebase Sales Service - Real-time sales tracking (multiple entries per day)
import { db } from './firebaseConfig';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    Timestamp
} from 'firebase/firestore';
import { SalesEntry } from '../types';

class FirebaseSalesService {
    private salesCollection = collection(db, 'sales');

    /**
     * Add a new sales entry (supports multiple per employee per day)
     */
    async addSalesEntry(entry: Omit<SalesEntry, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            const now = new Date().toISOString();
            const data = {
                ...entry,
                createdAt: now,
                updatedAt: now,
                timestamp: Timestamp.now()
            };
            const docRef = await addDoc(this.salesCollection, data);
            console.log('🔥 Firebase Sales: Entry added:', docRef.id);
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('❌ Firebase Sales add error:', error);
            return { success: false, error };
        }
    }

    /**
     * Update an existing sales entry
     */
    async updateSalesEntry(entryId: string, updates: Partial<Pick<SalesEntry, 'clientName' | 'amount' | 'notes'>>) {
        try {
            const now = new Date().toISOString();
            await updateDoc(doc(db, 'sales', entryId), {
                ...updates,
                updatedAt: now,
                timestamp: Timestamp.now()
            });
            console.log('🔥 Firebase Sales: Entry updated:', entryId);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase Sales update error:', error);
            return { success: false, error };
        }
    }

    /**
     * Delete a sales entry
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

    /**
     * Subscribe to all sales for a given month (real-time)
     * @param yearMonth - format: "2026-03"
     */
    subscribeToMonthlySales(yearMonth: string, callback: (entries: SalesEntry[]) => void) {
        const startDate = `${yearMonth}-01`;
        const endDate = `${yearMonth}-31`;

        const q = query(
            this.salesCollection,
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SalesEntry));
            console.log('🔥 Firebase Sales real-time update:', entries.length, 'entries for', yearMonth);
            callback(entries);
        }, (error) => {
            console.error('❌ Firebase Sales subscription error:', error);
        });

        return unsubscribe;
    }
}

export const firebaseSalesService = new FirebaseSalesService();
