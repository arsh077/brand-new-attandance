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
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return auth.currentUser !== null;
    }
}

export const firebaseAuthService = new FirebaseAuthService();
