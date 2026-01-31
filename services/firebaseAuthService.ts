// Firebase Authentication Service
import { auth } from './firebaseConfig';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';

class FirebaseAuthService {
    /**
     * Register a new user
     */
    async register(email: string, password: string) {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('🔥 Firebase: User registered:', userCredential.user.email);
            return { success: true, user: userCredential.user };
        } catch (error: any) {
            console.error('❌ Firebase registration error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('🔥 Firebase: User logged in:', userCredential.user.email);
            return { success: true, user: userCredential.user };
        } catch (error: any) {
            console.error('❌ Firebase login error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            await signOut(auth);
            console.log('🔥 Firebase: User logged out');
            return { success: true };
        } catch (error: any) {
            console.error('❌ Firebase logout error:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser(): User | null {
        return auth.currentUser;
    }

    /**
     * Listen to authentication state changes
     */
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }

    /**
     * Register a new user WITHOUT logging out the current user (for Admin panel)
     * Uses a secondary temporary Firebase App instance
     */
    async registerSecondary(email: string, password: string) {
        let secondaryApp = null;
        try {
            // Dynamically import to avoid top-level side effects if possible, 
            // but for now we use standard imports available in module
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth: getSecondaryAuth, createUserWithEmailAndPassword: createSecondaryUser } = await import('firebase/auth');

            // Get config from the main exported app or env
            // We need to re-use the same config
            const config = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID,
                measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
            };

            // Initialize a secondary app with a unique name
            secondaryApp = initializeApp(config, `SecondaryApp-${Date.now()}`);
            const secondaryAuth = getSecondaryAuth(secondaryApp);

            console.log('🔥 Firebase: Creating user in secondary app...', email);
            const userCredential = await createSecondaryUser(secondaryAuth, email, password);
            console.log('✅ Firebase: User created successfully:', userCredential.user.email);

            // Cleanup
            await deleteApp(secondaryApp);
            return { success: true, user: userCredential.user };
        } catch (error: any) {
            console.error('❌ Firebase secondary registration error:', error.message);
            if (secondaryApp) {
                try {
                    const { deleteApp } = await import('firebase/app');
                    await deleteApp(secondaryApp);
                } catch (e) { /* ignore cleanup error */ }
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return auth.currentUser !== null;
    }
}

export const firebaseAuthService = new FirebaseAuthService();
