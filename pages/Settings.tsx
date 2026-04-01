import React, { useState } from 'react';
import { Employee } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { ICONS } from '../constants';

interface SettingsProps {
  currentUser: Employee;
}

const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    setMessage({ text: '', type: '' });

    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      const result = await firebaseAuthService.changePassword(newPassword);
      if (result.success) {
        setMessage({ text: 'Password successfully updated!', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (result.error?.includes('requires-recent-login')) {
          setMessage({ text: 'For security reasons, please log out and log back in to change your password.', type: 'error' });
        } else {
          setMessage({ text: result.error || 'Failed to update password.', type: 'error' });
        }
      }
    } catch (error: any) {
      setMessage({ text: error.message || 'An error occurred.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 max-w-2xl mx-auto mt-8">
      <div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Settings</h2>
        <p className="text-gray-400 font-bold text-sm italic">Manage your account preferences and security</p>
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 shadow-2xl p-10">
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-black shadow-sm">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 leading-tight">{currentUser.name}</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-tighter">{currentUser.email}</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Security Section (Change Password) */}
          <div className="bg-indigo-50/50 rounded-3xl p-8">
            <div className="flex items-center mb-6">
              <span className="text-indigo-600 mr-2">{ICONS.EditIcon || '🔐'}</span>
              <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Change Password</h4>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-6">
              {message.text && (
                <div className={`p-4 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                </div>
              )}

              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  required
                  className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all pr-12"
                />
              </div>
              
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  required
                  className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 transition-all pr-12"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="showPassword" className="text-xs font-bold text-gray-500 cursor-pointer">Show Passwords</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 text-xs uppercase tracking-widest flex items-center justify-center ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
