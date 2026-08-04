import React, { useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';
import { db } from '../services/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface RulebookProps {
  currentUser: Employee;
}

const Rulebook: React.FC<RulebookProps> = ({ currentUser }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedDate, setAcknowledgedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Check if user has already acknowledged
  useEffect(() => {
    const checkAcknowledgment = async () => {
      try {
        const docRef = doc(db, 'rulebook_acknowledgments', currentUser.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAcknowledged(data.acknowledged || false);
          setAcknowledgedDate(data.acknowledgedDate || null);
        }
      } catch (error) {
        console.error('Error fetching acknowledgment:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAcknowledgment();
  }, [currentUser.id]);

  const handleAcknowledge = async () => {
    if (acknowledged) return;

    setSaving(true);
    try {
      const now = new Date();
      const dateString = now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      await setDoc(doc(db, 'rulebook_acknowledgments', currentUser.id), {
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        email: currentUser.email,
        acknowledged: true,
        acknowledgedDate: dateString,
        acknowledgedTimestamp: now.toISOString()
      });

      setAcknowledged(true);
      setAcknowledgedDate(dateString);
      
      alert('✅ Thank you for acknowledging the company rules and policies!');
    } catch (error) {
      console.error('Error saving acknowledgment:', error);
      alert('❌ Failed to save acknowledgment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-400">Loading rulebook...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Company Rulebook</h1>
            <p className="text-gray-400 font-medium mt-1">Attendance & Working Hours Policy</p>
          </div>
          {acknowledged && (
            <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold text-green-700">Acknowledged ✓</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Rulebook Content */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        {/* Company Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border-2 border-white/30 shadow-lg">
              <span className="text-3xl font-black">LS</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider mb-2">Legal Success India</h2>
            <p className="text-indigo-200 font-bold text-sm">Employee Rules & Regulations</p>
            <div className="mt-4 inline-block bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20">
              <p className="text-xs font-bold text-indigo-100">Effective from: January 2026</p>
            </div>
          </div>
        </div>

        {/* Rules Content */}
        <div className="p-8 space-y-8">
          
          {/* Rule 1: Late Login Policy */}
          <div className="bg-orange-50 rounded-2xl p-6 border-2 border-orange-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-orange-900 mb-3 flex items-center">
                  ⏰ Late Login Policy
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold">• The official reporting/login time is <span className="text-orange-700 font-black">10:35 AM</span>.</p>
                  <p className="font-bold">• An additional <span className="text-orange-700 font-black">5-minute grace period</span> will be provided for login.</p>
                  <p className="font-bold">• If an employee is late <span className="text-red-700 font-black">2 times</span>, <span className="text-red-700 font-black">1 day's salary will be deducted</span>.</p>
                </div>
                <div className="mt-3 bg-orange-100 rounded-lg p-3 border border-orange-300">
                  <p className="text-sm font-black text-orange-800">📌 Grace Period: 10:35 AM to 10:40 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 2: Early Logout Policy */}
          <div className="bg-red-50 rounded-2xl p-6 border-2 border-red-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-red-900 mb-3 flex items-center">
                  🚪 Early Logout Policy
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold">• The official logout time is <span className="text-red-700 font-black">6:30 PM</span>.</p>
                  <p className="font-bold">• Leaving before the official logout time without prior approval will be considered an <span className="text-red-700 font-black">early logout</span>.</p>
                  <p className="font-bold">• <span className="text-red-700 font-black">2 instances</span> of early logout will result in deduction of <span className="text-red-700 font-black">1 day's salary</span>.</p>
                </div>
                <div className="mt-3 bg-red-100 rounded-lg p-3 border border-red-300">
                  <p className="text-sm font-black text-red-800">⚠️ Prior approval required for early departure</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 3: Monday & Saturday Leave Policy */}
          <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-purple-900 mb-3 flex items-center">
                  📅 Monday & Saturday Leave Policy
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold">• Taking leave on <span className="text-purple-700 font-black">Monday or Saturday</span> requires <span className="text-purple-700 font-black">prior approval</span> from the reporting authority.</p>
                  <p className="font-bold">• Unapproved leave taken on Monday or Saturday will be treated as a <span className="text-red-700 font-black">serious attendance violation</span>.</p>
                  <p className="font-bold">• <span className="text-red-700 font-black">2 days</span> of leave taken on Monday/Saturday without approval will result in deduction of <span className="text-red-700 font-black">2 days' salary</span>.</p>
                </div>
                <div className="mt-3 bg-purple-100 rounded-lg p-3 border border-purple-300">
                  <p className="text-sm font-black text-purple-800">🚫 Mandatory approval for weekend bordering leaves</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 4: Official Working Hours */}
          <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">4</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-blue-900 mb-3 flex items-center">
                  🕐 Official Working Hours
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Login Time</p>
                    <p className="text-2xl font-black text-blue-900">10:35 AM</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Grace Period</p>
                    <p className="text-2xl font-black text-blue-900">5 Minutes</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Logout Time</p>
                    <p className="text-2xl font-black text-blue-900">6:30 PM</p>
                  </div>
                </div>
                <p className="font-bold text-gray-700">All employees are required to <span className="text-blue-700 font-black">strictly follow</span> the assigned working hours.</p>
              </div>
            </div>
          </div>

          {/* Rule 5: Extended Working Hours Policy */}
          <div className="bg-amber-50 rounded-2xl p-6 border-2 border-amber-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">5</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-amber-900 mb-3 flex items-center">
                  ⏱️ Extended Working Hours Policy
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold">• If the assigned <span className="text-amber-700 font-black">sales targets or required work</span> are not completed within the scheduled working hours, management may extend the working time based on business requirements.</p>
                  <p className="font-bold">• In such cases, employees may be required to continue working until:</p>
                  <div className="ml-6 bg-white rounded-lg p-3 border border-amber-300 my-2">
                    <p className="text-lg font-black text-amber-800">Maximum Extended Time: 7:00 PM</p>
                  </div>
                  <p className="font-bold">• Employees are expected to <span className="text-amber-700 font-black">cooperate and complete</span> their assigned responsibilities.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 6: Half-Day Policy */}
          <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-white text-xl font-black">6</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-yellow-900 mb-3 flex items-center">
                  🌓 Half-Day Policy
                </h3>
                <div className="space-y-2 text-gray-700">
                  <p className="font-bold">• If an employee logs in after <span className="text-yellow-700 font-black">12:30 PM</span>, the day will automatically be considered as a:</p>
                  <div className="bg-yellow-100 rounded-lg p-4 border-2 border-yellow-400 my-2 text-center">
                    <p className="text-2xl font-black text-yellow-800">HALF DAY</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <span className="text-3xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black mb-3">Important Notice</h3>
                <p className="font-bold leading-relaxed">
                  Attendance discipline is an essential part of maintaining a professional and productive workplace. All employees are required to strictly follow <span className="underline">login time</span>, <span className="underline">logout time</span>, <span className="underline">attendance rules</span>, and <span className="underline">work commitments</span>.
                </p>
                <p className="font-bold mt-3 text-red-100">
                  Repeated violations of attendance policies may lead to <span className="text-white font-black">salary deductions</span>, <span className="text-white font-black">performance review</span>, and further <span className="text-white font-black">disciplinary action</span> as per company policy.
                </p>
              </div>
            </div>
          </div>

          {/* Employee Acknowledgement Section */}
          <div className={`rounded-2xl p-6 border-2 ${acknowledged ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center">
              {acknowledged ? '✅' : '📝'} Employee Acknowledgement
            </h3>
            
            <div className="bg-white rounded-xl p-5 border-2 border-gray-200 mb-4">
              <p className="text-sm font-bold text-gray-800 italic leading-relaxed">
                "I have read and understood the <span className="text-indigo-600 font-black">Attendance & Working Hours Policy</span> of Legal Success India and agree to comply with all mentioned rules and guidelines."
              </p>
            </div>

            {!acknowledged ? (
              <button
                onClick={handleAcknowledge}
                disabled={saving}
                className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-lg ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 active:scale-95'
                }`}
              >
                {saving ? (
                  <span className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>I Acknowledge & Accept These Rules</span>
                  </span>
                )}
              </button>
            ) : (
              <div className="bg-green-100 rounded-xl p-4 border border-green-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-green-800 uppercase tracking-wider">✓ Acknowledged</p>
                    <p className="text-xs font-bold text-green-700 mt-1">
                      By: {currentUser.name} ({currentUser.email})
                    </p>
                    {acknowledgedDate && (
                      <p className="text-xs font-bold text-green-600 mt-1">
                        On: {acknowledgedDate}
                      </p>
                    )}
                  </div>
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Admin View - All Acknowledgements */}
          {isAdmin && (
            <div className="mt-8 bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-200">
              <h3 className="text-lg font-black text-indigo-900 mb-4 flex items-center">
                👥 Admin View: Employee Acknowledgements
              </h3>
              <p className="text-sm text-indigo-700 font-bold mb-3">
                Track which employees have acknowledged the company rulebook.
              </p>
              <button
                onClick={() => alert('Feature coming soon: View all acknowledgements in a table')}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                View All Acknowledgements →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500 font-bold">
            © 2026 Legal Success India Private Limited. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Last Updated: January 2026 • Version 1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Rulebook;