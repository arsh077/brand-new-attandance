import React, { useState } from 'react';
import { UserRole } from '../types';
import { ICONS, AUTHORIZED_USERS } from '../constants';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { firebaseEmployeeService } from '../services/firebaseEmployeeService';

interface LoginProps {
  onLogin: (role: UserRole, email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Local Validation (Check against constants.tsx)
      const localUser = AUTHORIZED_USERS.find(u =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password.trim()
      );

      if (localUser) {
        // If local match found, verify if role matches selection
        if (selectedRole && localUser.role !== selectedRole) {
          throw new Error(`Your account is registered as ${localUser.role}, not ${selectedRole}.`);
        }

        // AUTO-REGISTRATION: Try to login to Firebase, if fails (user not found), then Register
        console.log('🔥 Syncing Firebase Auth...');
        const authResult = await firebaseAuthService.login(email.trim(), password.trim());

        if (!authResult.success && authResult.error?.includes('auth/user-not-found')) {
          console.log('🔥 Firebase: User not found, performing auto-registration...');
          await firebaseAuthService.register(email.trim(), password.trim());
        }

        // Success! Proceed
        onLogin(localUser.role, localUser.email);
        return;
      }

      // 2. Firebase Authentication (If local fails or for real database login)
      const authResult = await firebaseAuthService.login(email.trim(), password.trim());

      if (!authResult.success || !authResult.user) {
        throw new Error(authResult.error || 'Invalid credentials');
      }

      // 3. Final Fetch from DB to ensure role sync
      const employee = await firebaseEmployeeService.getEmployeeByEmail(email.trim());
      if (!employee) {
        throw new Error('Employee record not found in system.');
      }

      if (selectedRole && employee.role !== selectedRole) {
        throw new Error(`Your account is registered as ${employee.role}, not ${selectedRole}.`);
      }

      onLogin(employee.role, employee.email);

    } catch (err: any) {
      console.error('Login failed:', err);
      // Friendly error message
      if (err.message.includes('auth/invalid-credential') || err.message.includes('invalid-email')) {
        setError('Invalid email or password.');
      } else if (err.message.includes('network-request-failed')) {
        setError('Network error. Check your internet connection.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getAuthorizedEmailsForRole = (role: UserRole) => {
    const users = AUTHORIZED_USERS.filter(u => u.role === role);
    return users.length > 0 ? users[0].email : 'No authorized users';
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 w-full max-w-md animate-slide-up text-center">
          <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img
              src="/assets/logo.png"
              alt="Legal Success India"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-3xl">LS</div>';
                }
              }}
            />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Legal Success India</h1>
          <p className="text-gray-400 mt-1 font-bold text-sm">Employee Attendance Portal</p>

          <div className="mt-10 space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Continue As</p>

            <button
              onClick={() => setSelectedRole(UserRole.ADMIN)}
              className="w-full flex items-center justify-between p-6 bg-indigo-50/50 border-2 border-transparent hover:border-indigo-600 rounded-3xl transition-all group"
            >
              <div className="text-left">
                <span className="block font-black text-indigo-900">Administrator</span>
                <span className="text-xs text-indigo-500 font-bold italic">Full System Access</span>
              </div>
              <div className="bg-white p-3 rounded-2xl text-indigo-600 shadow-sm">{ICONS.Lock}</div>
            </button>

            <button
              onClick={() => setSelectedRole(UserRole.MANAGER)}
              className="w-full flex items-center justify-between p-6 bg-blue-50/50 border-2 border-transparent hover:border-blue-600 rounded-3xl transition-all group"
            >
              <div className="text-left">
                <span className="block font-black text-blue-900">Team Manager</span>
                <span className="text-xs text-blue-500 font-bold italic">Manage Team Presence</span>
              </div>
              <div className="bg-white p-3 rounded-2xl text-blue-600 shadow-sm">{ICONS.Users}</div>
            </button>

            <button
              onClick={() => setSelectedRole(UserRole.EMPLOYEE)}
              className="w-full flex items-center justify-between p-6 bg-emerald-50/50 border-2 border-transparent hover:border-emerald-600 rounded-3xl transition-all group"
            >
              <div className="text-left">
                <span className="block font-black text-emerald-900">Employee Staff</span>
                <span className="text-xs text-emerald-500 font-bold italic">Track Personal Attendance</span>
              </div>
              <div className="bg-white p-3 rounded-2xl text-emerald-600 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </button>
          </div>

          <p className="mt-10 text-[10px] text-gray-300 font-bold italic">© 2026 Legal Success India Private Limited.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl border border-gray-100 w-full max-w-md animate-slide-up">
        <button onClick={() => setSelectedRole(null)} className="text-gray-400 hover:text-indigo-600 mb-6 flex items-center text-xs font-black uppercase tracking-widest">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>

        <h2 className="text-2xl font-black text-gray-900 mb-2">{selectedRole} Login</h2>
        <p className="text-gray-400 text-sm font-bold mb-8 italic">Enter your credentials to continue</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@legalsuccess.in"
              className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border-0 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Authorized Access Only</p>
            <p className="text-xs text-indigo-900 font-bold">Example: <span className="select-all font-black">{getAuthorizedEmailsForRole(selectedRole)}</span></p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-200 animate-pulse">
              <p className="text-xs text-red-700 font-bold">❌ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-indigo-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing In...' : 'Secure Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
