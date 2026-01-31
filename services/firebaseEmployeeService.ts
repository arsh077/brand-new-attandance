import { db } from './firebaseConfig';
import { doc, setDoc, collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { Employee } from '../types';

class FirebaseEmployeeService {
    /**
     * Update or Create Employee
     */
    async updateEmployee(employee: Employee) {
        try {
            const employeeRef = doc(db, 'employees', employee.id);
            // Use setDoc with merge: true to update existing or create new
            await setDoc(employeeRef, employee, { merge: true });
            console.log('✅ Firebase: Employee updated', employee.name);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase updateEmployee error:', error);
            return { success: false, error };
        }
    }

    /**
     * Subscribe to real-time employee updates
     */
    subscribeToEmployees(callback: (employees: Employee[]) => void) {
        const q = query(collection(db, 'employees'), orderBy('name'));

        return onSnapshot(q, (snapshot) => {
            const employees = snapshot.docs.map(doc => doc.data() as Employee);
            console.log('🔥 Firebase: Employees synced:', employees.length);
            callback(employees);
        }, (error) => {
            console.error('❌ Firebase employees subscription error:', error);
        });
    }

    /**
     * Get employee by email
     */
    async getEmployeeByEmail(email: string): Promise<Employee | null> {
        try {
            const q = query(collection(db, 'employees'), where('email', '==', email));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return snapshot.docs[0].data() as Employee;
        } catch (error) {
            console.error('❌ Firebase getEmployeeByEmail error:', error);
            return null;
        }
    }

    /**
     * Initialize employees from array (for first-time setup)
     */
    async initializeEmployees(employees: Employee[]) {
        try {
            console.log('🚀 Initializing Firebase with', employees.length, 'employees...');
            const promises = employees.map(emp =>
                setDoc(doc(db, 'employees', emp.id), emp)
            );
            await Promise.all(promises);
            console.log('✅ Firebase: All employees initialized successfully!');
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase initializeEmployees error:', error);
            return { success: false, error };
        }
    }

    /**
     * Delete Employee
     */
    async deleteEmployee(id: string) {
        try {
            const { deleteDoc } = await import('firebase/firestore');
            const employeeRef = doc(db, 'employees', id);
            await deleteDoc(employeeRef);
            console.log('🗑️ Firebase: Employee deleted', id);
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase deleteEmployee error:', error);
            return { success: false, error };
        }
    }
}

export const firebaseEmployeeService = new FirebaseEmployeeService();
