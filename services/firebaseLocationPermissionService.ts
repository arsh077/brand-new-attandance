// Firebase Location Permission Service
// Manages per-employee remote login permissions

import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, collection, query, getDocs } from 'firebase/firestore';

export interface EmployeeLocationPermission {
  employeeId: string;
  employeeName: string;
  allowRemoteLogin: boolean;
  reason?: string; // Why remote login is allowed (e.g., "Work from home approved")
  lastUpdatedBy: string; // Admin who granted/revoked permission
  lastUpdatedAt: string; // ISO timestamp
}

class FirebaseLocationPermissionService {
  private permissionsCollection = collection(db, 'locationPermissions');

  /**
   * Get location permission for an employee
   */
  async getPermission(employeeId: string): Promise<EmployeeLocationPermission | null> {
    try {
      const docRef = doc(db, 'locationPermissions', employeeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as EmployeeLocationPermission;
      }
      
      // Default: Remote login NOT allowed
      return {
        employeeId,
        employeeName: '',
        allowRemoteLogin: false,
        lastUpdatedBy: 'System',
        lastUpdatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error fetching location permission:', error);
      return null;
    }
  }

  /**
   * Update location permission for an employee (Admin only)
   */
  async updatePermission(
    permission: EmployeeLocationPermission
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const docRef = doc(db, 'locationPermissions', permission.employeeId);
      await setDoc(docRef, {
        ...permission,
        lastUpdatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`✅ Location permission updated for ${permission.employeeId}: ${permission.allowRemoteLogin ? 'ALLOWED' : 'BLOCKED'}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error updating location permission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all location permissions (Admin only)
   */
  async getAllPermissions(): Promise<EmployeeLocationPermission[]> {
    try {
      const q = query(this.permissionsCollection);
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => doc.data() as EmployeeLocationPermission);
    } catch (error) {
      console.error('❌ Error fetching all permissions:', error);
      return [];
    }
  }

  /**
   * Bulk update permissions
   */
  async bulkUpdatePermissions(
    permissions: EmployeeLocationPermission[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const promises = permissions.map(perm => this.updatePermission(perm));
      await Promise.all(promises);
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error bulk updating permissions:', error);
      return { success: false, error: error.message };
    }
  }
}

export const firebaseLocationPermissionService = new FirebaseLocationPermissionService();
