// Pusher Real-Time Service
import Pusher from 'pusher-js';

class PusherService {
  private pusher: Pusher | null = null;
  private channel: any = null;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    // Initialize Pusher - You need to add your credentials in .env.local
    const appKey = import.meta.env.VITE_PUSHER_APP_KEY || 'YOUR_PUSHER_APP_KEY';
    const cluster = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2'; // Asia Pacific cluster
    
    console.log('🔧 Initializing Pusher with:', { appKey: appKey ? appKey.substring(0, 10) + '...' : 'NOT SET', cluster });
    
    if (appKey && appKey !== 'YOUR_PUSHER_APP_KEY') {
      try {
        // Enable logging in development
        if (import.meta.env.DEV) {
          Pusher.logToConsole = true;
        }
        
        this.pusher = new Pusher(appKey, {
          cluster: cluster,
          forceTLS: true
        });

        // Subscribe to attendance channel (public channel)
        this.channel = this.pusher.subscribe('attendance-channel');
        
        // Log connection state
        this.pusher.connection.bind('state_change', (states: any) => {
          console.log('🔄 Pusher state:', states.previous, '→', states.current);
        });
        
        this.pusher.connection.bind('connected', () => {
          console.log('✅ Pusher connected successfully');
        });
        
        this.pusher.connection.bind('error', (err: any) => {
          console.error('❌ Pusher connection error:', err);
          console.warn('⚠️ Falling back to localStorage + polling for cross-device sync');
          console.warn('⚠️ Real-time notifications will work within same browser only');
        });
        
        console.log('✅ Pusher initialized (attempting connection...)');
        this.setupListeners();
      } catch (error) {
        console.error('❌ Pusher initialization failed:', error);
        console.warn('⚠️ Using localStorage + polling fallback');
      }
    } else {
      console.warn('⚠️ Pusher credentials not found. Using fallback polling mechanism.');
      console.warn('⚠️ Set VITE_PUSHER_APP_KEY in .env.local or .env.production');
    }
  }

  private setupListeners() {
    if (!this.channel) return;

    // Enable client events for cross-device communication
    this.pusher!.config.authEndpoint = undefined; // Client events don't need auth
    
    // Listen for CLIENT events (cross-device)
    this.channel.bind('client-clock-in', (data: any) => {
      console.log('🟢 Pusher: Employee clocked in', data);
      this.notifyListeners('CLOCK_IN', data);
    });

    this.channel.bind('client-clock-out', (data: any) => {
      console.log('🔴 Pusher: Employee clocked out', data);
      this.notifyListeners('CLOCK_OUT', data);
    });

    this.channel.bind('client-attendance-update', (data: any) => {
      console.log('📊 Pusher: Attendance updated', data);
      this.notifyListeners('ATTENDANCE_UPDATE', data);
    });
    
    this.channel.bind('client-leave-request', (data: any) => {
      console.log('📝 Pusher: Leave request received', data);
      this.notifyListeners('LEAVE_REQUEST', data);
    });
    
    this.channel.bind('client-leave-action', (data: any) => {
      console.log('✅ Pusher: Leave action taken', data);
      this.notifyListeners('LEAVE_ACTION', data);
    });
  }

  private notifyListeners(eventType: string, data: any) {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.forEach(callback => callback(data));
    }

    const allListeners = this.listeners.get('all');
    if (allListeners) {
      allListeners.forEach(callback => callback({ type: eventType, data }));
    }
  }

  // Subscribe to events
  on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  // Trigger events (client-side events for testing)
  // Note: For production, you should trigger from backend
  trigger(eventName: string, data: any) {
    if (!this.channel) {
      console.warn('⚠️ Pusher not initialized, using localStorage fallback');
      // Fallback to localStorage
      localStorage.setItem('pusher_event', JSON.stringify({ eventName, data, timestamp: Date.now() }));
      return;
    }

    // Client events must start with "client-"
    try {
      this.channel.trigger(`client-${eventName}`, data);
    } catch (error) {
      console.error('Failed to trigger event:', error);
    }
  }

  // Specific event triggers
  triggerClockIn(employeeId: string, employeeName: string, clockIn: string, isLate: boolean) {
    const data = {
      employeeId,
      employeeName,
      clockIn,
      isLate,
      status: isLate ? 'LATE' : 'CLOCKED_IN',
      timestamp: new Date().toISOString()
    };
    
    this.trigger('clock-in', data);
    
    // Also update localStorage for polling fallback
    const attendance = JSON.parse(localStorage.getItem('ls_attendance') || '[]');
    localStorage.setItem('ls_attendance', JSON.stringify(attendance));
    localStorage.setItem('last_update', Date.now().toString());
  }

  triggerClockOut(employeeId: string, employeeName: string, clockOut: string, duration: string) {
    const data = {
      employeeId,
      employeeName,
      clockOut,
      duration,
      status: 'CLOCKED_OUT',
      timestamp: new Date().toISOString()
    };
    
    this.trigger('clock-out', data);
    
    // Also update localStorage for polling fallback
    const attendance = JSON.parse(localStorage.getItem('ls_attendance') || '[]');
    localStorage.setItem('ls_attendance', JSON.stringify(attendance));
    localStorage.setItem('last_update', Date.now().toString());
  }

  triggerAttendanceUpdate(attendance: any[]) {
    const data = {
      attendance,
      timestamp: new Date().toISOString()
    };
    
    this.trigger('attendance-update', data);
    localStorage.setItem('last_update', Date.now().toString());
  }

  // Check if Pusher is connected
  isConnected(): boolean {
    return this.pusher !== null && this.pusher.connection.state === 'connected';
  }

  // Disconnect
  disconnect() {
    if (this.pusher) {
      this.pusher.disconnect();
      this.pusher = null;
    }
    this.listeners.clear();
  }
}

// Export singleton
export const pusherService = new PusherService();
