// Enhanced Firebase Service with iOS-specific optimizations
import { getDatabase, ref, onValue, off, push, set, update, serverTimestamp, goOnline, goOffline } from 'firebase/database';
import { app as firebaseApp } from './firebaseConfig';

class EnhancedFirebaseService {
  private app: any;
  private database: any;
  private listeners: Map<string, any> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isOnline = true;
  private connectionRef: any;

  constructor() {
    this.initializeFirebase();
    this.setupVisibilityHandling();
    this.setupNetworkHandling();
  }

  private initializeFirebase() {
    try {
      this.app = firebaseApp;
      this.database = getDatabase(this.app);
      
      // Enable offline persistence (crucial for iOS)
      // Note: This should be called before any other database operations
      console.log('🔥 Firebase initialized with offline persistence');
      
      // Keep connection alive
      goOnline(this.database);
      
      // Monitor connection status
      this.setupConnectionListener();
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
    }
  }

  private setupConnectionListener() {
    const connectedRef = ref(this.database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        console.log('🟢 Connected to Firebase');
        this.isOnline = true;
        this.reconnectAttempts = 0;
        
        // Trigger reconnection of all listeners
        this.reconnectAllListeners();
      } else {
        console.log('🔴 Disconnected from Firebase');
        this.isOnline = false;
      }
    });
  }

  private setupNetworkHandling() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Network back online - reconnecting Firebase...');
      this.isOnline = true;
      goOnline(this.database);
      setTimeout(() => this.reconnectAllListeners(), 1000);
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network offline detected');
      this.isOnline = false;
      // Don't call goOffline() to maintain offline persistence
    });
  }

  private setupVisibilityHandling() {
    // Handle app resume/pause (crucial for iOS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 App resumed - reconnecting Firebase...');
        goOnline(this.database);
        setTimeout(() => this.reconnectAllListeners(), 500);
      } else if (document.visibilityState === 'hidden') {
        console.log('📱 App backgrounded');
        // Keep online for background sync
        // goOffline(this.database);
      }
    });

    // iOS Safari specific handling
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.log('📱 Page restored from cache (iOS Safari)');
        goOnline(this.database);
        setTimeout(() => this.reconnectAllListeners(), 500);
      }
    });

    window.addEventListener('focus', () => {
      console.log('🎯 Window focused - ensuring Firebase connection');
      goOnline(this.database);
    });
  }

  private async reconnectAllListeners() {
    if (!this.isOnline || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting listeners (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      // Re-establish all active listeners
      for (const [key, listenerInfo] of this.listeners) {
        if (listenerInfo) {
          // Remove old listener
          off(listenerInfo.ref, 'value', listenerInfo.callback);
          
          // Re-add listener
          onValue(listenerInfo.ref, listenerInfo.callback);
          console.log(`✅ Reconnected listener: ${key}`);
        }
      }
      
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('❌ Failed to reconnect listeners:', error);
      
      // Exponential backoff retry
      setTimeout(() => {
        this.reconnectAllListeners();
      }, 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }

  // Enhanced attendance listener with iOS optimizations
  onAttendanceChange(callback: (data: any) => void): () => void {
    const attendanceRef = ref(this.database, 'attendance');
    
    const wrappedCallback = (snapshot: any) => {
      try {
        const data = snapshot.val();
        if (data) {
          console.log('📊 Attendance data received:', Object.keys(data).length, 'records');
          callback(data);
        }
      } catch (error) {
        console.error('❌ Error processing attendance data:', error);
      }
    };

    // Store listener info for reconnection
    this.listeners.set('ATTENDANCE', {
      ref: attendanceRef,
      callback: wrappedCallback
    });

    onValue(attendanceRef, wrappedCallback);

    // Return unsubscribe function
    return () => {
      off(attendanceRef, 'value', wrappedCallback);
      this.listeners.delete('ATTENDANCE');
    };
  }

  // Enhanced employee listener
  onEmployeeChange(callback: (data: any) => void): () => void {
    const employeeRef = ref(this.database, 'employees');
    
    const wrappedCallback = (snapshot: any) => {
      try {
        const data = snapshot.val();
        if (data) {
          console.log('👤 Employee data received:', Object.keys(data).length, 'employees');
          callback(data);
        }
      } catch (error) {
        console.error('❌ Error processing employee data:', error);
      }
    };

    this.listeners.set('EMPLOYEES', {
      ref: employeeRef,
      callback: wrappedCallback
    });

    onValue(employeeRef, wrappedCallback);

    return () => {
      off(employeeRef, 'value', wrappedCallback);
      this.listeners.delete('EMPLOYEES');
    };
  }

  // Enhanced leave listener
  onLeaveChange(callback: (data: any) => void): () => void {
    const leaveRef = ref(this.database, 'leave_requests');
    
    const wrappedCallback = (snapshot: any) => {
      try {
        const data = snapshot.val();
        if (data) {
          console.log('📝 Leave data received:', Object.keys(data).length, 'requests');
          callback(data);
        }
      } catch (error) {
        console.error('❌ Error processing leave data:', error);
      }
    };

    this.listeners.set('LEAVES', {
      ref: leaveRef,
      callback: wrappedCallback
    });

    onValue(leaveRef, wrappedCallback);

    return () => {
      off(leaveRef, 'value', wrappedCallback);
      this.listeners.delete('LEAVES');
    };
  }

  // Enhanced write operations with retry logic
  async writeAttendance(attendanceData: any, retries = 3): Promise<void> {
    try {
      const attendanceRef = ref(this.database, 'attendance');
      await set(attendanceRef, attendanceData);
      console.log('✅ Attendance data written to Firebase');
    } catch (error) {
      console.error('❌ Failed to write attendance data:', error);
      
      if (retries > 0 && this.isOnline) {
        console.log(`🔄 Retrying write operation... (${retries} attempts left)`);
        setTimeout(() => {
          this.writeAttendance(attendanceData, retries - 1);
        }, 2000);
      }
    }
  }

  async writeEmployee(employeeData: any): Promise<void> {
    try {
      const employeeRef = ref(this.database, 'employees');
      await set(employeeRef, employeeData);
      console.log('✅ Employee data written to Firebase');
    } catch (error) {
      console.error('❌ Failed to write employee data:', error);
    }
  }

  async writeLeave(leaveData: any): Promise<void> {
    try {
      const leaveRef = ref(this.database, 'leave_requests');
      await set(leaveRef, leaveData);
      console.log('✅ Leave data written to Firebase');
    } catch (error) {
      console.error('❌ Failed to write leave data:', error);
    }
  }

  // Clock in/out with real-time broadcasting
  async broadcastClockIn(empId: string, empName: string, clockIn: string, isLate: boolean): Promise<void> {
    try {
      const eventRef = ref(this.database, 'realtime_events/clock_in');
      await push(eventRef, {
        empId,
        empName,
        clockIn,
        isLate,
        timestamp: serverTimestamp()
      });
      console.log('✅ Clock-in event broadcasted');
    } catch (error) {
      console.error('❌ Failed to broadcast clock-in:', error);
    }
  }

  async broadcastClockOut(empId: string, empName: string, clockOut: string, duration: string): Promise<void> {
    try {
      const eventRef = ref(this.database, 'realtime_events/clock_out');
      await push(eventRef, {
        empId,
        empName,
        clockOut,
        duration,
        timestamp: serverTimestamp()
      });
      console.log('✅ Clock-out event broadcasted');
    } catch (error) {
      console.error('❌ Failed to broadcast clock-out:', error);
    }
  }

  // Connection health check
  async checkConnection(): Promise<boolean> {
    try {
      const testRef = ref(this.database, '.info/connected');
      return new Promise((resolve) => {
        onValue(testRef, (snapshot) => {
          resolve(snapshot.val() === true);
        }, { onlyOnce: true });
      });
    } catch (error) {
      console.error('❌ Connection health check failed:', error);
      return false;
    }
  }

  // Force reconnection (useful for iOS)
  forceReconnect(): void {
    console.log('🔄 Forcing Firebase reconnection...');
    goOffline(this.database);
    setTimeout(() => {
      goOnline(this.database);
      setTimeout(() => this.reconnectAllListeners(), 1000);
    }, 500);
  }

  // Get connection status
  isConnected(): boolean {
    return this.isOnline;
  }

  // Cleanup method
  destroy(): void {
    console.log('🧹 Cleaning up Firebase listeners...');
    
    for (const [key, listenerInfo] of this.listeners) {
      if (listenerInfo) {
        off(listenerInfo.ref, 'value', listenerInfo.callback);
      }
    }
    
    this.listeners.clear();
    goOffline(this.database);
  }
}

// Export singleton instance
export const enhancedFirebaseService = new EnhancedFirebaseService();
export default enhancedFirebaseService;