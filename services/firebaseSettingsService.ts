import { db } from './firebaseConfig';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface SystemSettings {
    companyName: string;
    workingHours: { start: string; end: string };
    lateThreshold: string;
    halfDayThreshold: string;
    weeklyOffs: string[];
    holidays: { date: string; name: string }[];
}

export const DEFAULT_SETTINGS: SystemSettings = {
    companyName: 'Legal Success India',
    workingHours: { start: '10:00', end: '18:30' },
    lateThreshold: '10:40',
    halfDayThreshold: '14:00', // Default half-day threshold
    weeklyOffs: ['Sunday'],
    holidays: []
};

class FirebaseSettingsService {
    private settingsRef = doc(db, 'settings', 'global');

    /**
     * Subscribe to real-time settings updates
     */
    subscribeToSettings(callback: (settings: SystemSettings) => void) {
        return onSnapshot(this.settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                console.log('🔥 Firebase: Settings synced');
                callback(docSnap.data() as SystemSettings);
            } else {
                console.log('⚠️ Firebase: No settings found, using defaults');
                // If doc doesn't exist, create it with defaults
                this.updateSettings(DEFAULT_SETTINGS);
                callback(DEFAULT_SETTINGS);
            }
        }, (error) => {
            console.error('❌ Firebase settings subscription error:', error);
            // Fallback to defaults on error
            callback(DEFAULT_SETTINGS);
        });
    }

    /**
     * Get current settings (one-time fetch)
     */
    async getSettings(): Promise<SystemSettings> {
        try {
            const docSnap = await getDoc(this.settingsRef);
            if (docSnap.exists()) {
                return docSnap.data() as SystemSettings;
            } else {
                return DEFAULT_SETTINGS;
            }
        } catch (error) {
            console.error('❌ Firebase getSettings error:', error);
            return DEFAULT_SETTINGS;
        }
    }

    /**
     * Update settings
     */
    async updateSettings(settings: SystemSettings) {
        try {
            await setDoc(this.settingsRef, settings, { merge: true });
            console.log('✅ Firebase: Settings updated');
            return { success: true };
        } catch (error) {
            console.error('❌ Firebase updateSettings error:', error);
            return { success: false, error };
        }
    }
}

export const firebaseSettingsService = new FirebaseSettingsService();
