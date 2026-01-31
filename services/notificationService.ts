import { db } from './firebaseConfig';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit } from 'firebase/firestore';
import { UserRole } from '../types';

export interface Notification {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  employeeName?: string;
}

class NotificationService {
  private listeners: Set<(notification: Notification) => void> = new Set();
  private cleanupFns: (() => void)[] = [];
  private hasRequestedPermission = false;

  constructor() {
    this.requestPermission();
  }

  requestPermission() {
    if (!this.hasRequestedPermission && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
      this.hasRequestedPermission = true;
    }
  }

  // Initialize listeners based on role
  initialize(userId: string, role: UserRole) {
    this.cleanup(); // Remove existing listeners

    // Timestamp to filter only new events
    const startTime = Timestamp.now();

    // 1. Listen for New Leave Requests (Admin & Manager)
    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      const q = query(
        collection(db, 'leaveRequests'),
        where('createdAt', '>', startTime),
        orderBy('createdAt', 'desc')
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            this.broadcast({
              type: 'LEAVE_REQUEST',
              title: 'New Leave Request',
              message: `${data.employeeName} requested ${data.type} leave`,
              employeeName: data.employeeName
            });
          }
        });
      });
      this.cleanupFns.push(unsub);
    }

    // 2. Listen for My Leave Updates (Employee)
    if (role === UserRole.EMPLOYEE) {
      const q = query(
        collection(db, 'leaveRequests'),
        where('employeeId', '==', userId),
        where('updatedAt', '>', startTime)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const data = change.doc.data();
            if (data.status === 'APPROVED') {
              this.broadcast({
                type: 'LEAVE_APPROVED',
                title: 'Leave Approved',
                message: `Your ${data.type} leave request was approved`
              });
            } else if (data.status === 'REJECTED') {
              this.broadcast({
                type: 'LEAVE_REJECTED',
                title: 'Leave Rejected',
                message: `Your ${data.type} leave request was rejected`
              });
            }
          }
        });
      });
      this.cleanupFns.push(unsub);
    }

    // 3. Listen for Late Arrivals (Admin) from Attendance
    if (role === UserRole.ADMIN) {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', today),
        where('createdAt', '>', startTime)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (data.status === 'LATE') {
              this.broadcast({
                type: 'CLOCK_IN',
                title: 'Late Arrival Alert',
                message: `${data.employeeName} clocked in Late at ${data.clockIn}`,
                employeeName: data.employeeName
              });
            }
          }
        });
      });
      this.cleanupFns.push(unsub);
    }

    // 4. Listen for General Announcements (FESTIVALS) - FOR EVERYONE
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('createdAt', '>', startTime),
      limit(1)
    );

    const unsubAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          this.broadcast({
            type: 'LEAVE_APPROVED', // Re-using an existing type icon (Green/Happy) or we can add a new one
            title: data.title,
            message: data.message,
            employeeName: 'System'
          });
        }
      });
    });
    this.cleanupFns.push(unsubAnnouncements);
  }

  subscribe(callback: (notification: Notification) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private broadcast(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const notification: Notification = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      read: false
    };

    // In-App Notification
    this.listeners.forEach(cb => cb(notification));

    // Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/assets/logo.png'
      });
    }
  }

  cleanup() {
    this.cleanupFns.forEach(fn => fn());
    this.cleanupFns = [];
  }
}

export const notificationService = new NotificationService();
