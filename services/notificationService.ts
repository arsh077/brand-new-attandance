// Notification Service
// Handles notification creation and management

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

  // Subscribe to new notifications
  subscribe(callback: (notification: Notification) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Create and broadcast a notification
  create(notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const notification: Notification = {
      ...notif,
      id: `NOTIF${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      read: false
    };

    // Notify all subscribers
    this.listeners.forEach(callback => callback(notification));

    return notification;
  }

  // Helper methods for specific notification types
  clockIn(employeeName: string, clockIn: string, isLate: boolean) {
    return this.create({
      type: 'CLOCK_IN',
      title: 'Employee Clocked In',
      message: `${employeeName} clocked in at ${clockIn}${isLate ? ' (Late)' : ''}`,
      employeeName
    });
  }

  clockOut(employeeName: string, clockOut: string, duration: string) {
    return this.create({
      type: 'CLOCK_OUT',
      title: 'Employee Clocked Out',
      message: `${employeeName} clocked out at ${clockOut} (Duration: ${duration})`,
      employeeName
    });
  }

  leaveRequest(employeeName: string, leaveType: string, startDate: string, endDate: string) {
    return this.create({
      type: 'LEAVE_REQUEST',
      title: 'New Leave Request',
      message: `${employeeName} requested ${leaveType} leave from ${startDate} to ${endDate}`,
      employeeName
    });
  }

  leaveApproved(leaveType: string) {
    return this.create({
      type: 'LEAVE_APPROVED',
      title: 'Leave Approved',
      message: `Your ${leaveType} leave request has been approved`
    });
  }

  leaveRejected(leaveType: string) {
    return this.create({
      type: 'LEAVE_REJECTED',
      title: 'Leave Rejected',
      message: `Your ${leaveType} leave request has been rejected`
    });
  }
}

// Export singleton
export const notificationService = new NotificationService();
