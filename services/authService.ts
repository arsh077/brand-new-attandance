
import { Employee, UserRole } from '../types';
import { INITIAL_EMPLOYEES } from '../constants';

class AuthService {
  private currentUser: Employee | null = null;

  login(role: UserRole): Employee {
    /* Use INITIAL_EMPLOYEES instead of non-existent MOCK_EMPLOYEES */
    const user = INITIAL_EMPLOYEES.find(emp => emp.role === role) || INITIAL_EMPLOYEES[0];
    this.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('user');
  }

  getCurrentUser(): Employee | null {
    if (!this.currentUser) {
      const stored = localStorage.getItem('user');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}

export const authService = new AuthService();