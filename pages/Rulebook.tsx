import React, { useState, useEffect } from 'react';
import { UserRole, Employee } from '../types';
import { db } from '../services/firebaseConfig';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface RulebookProps {
  currentUser: Employee;
}

interface RulebookData {
  rule1: { title: string; content: string[] };
  rule2: { title: string; content: string[] };
  rule3: { title: string; content: string[] };
  rule4: { title: string; loginTime: string; gracePeriod: string; logoutTime: string };
  rule5: { title: string; content: string[]; maxTime: string };
  rule6: { title: string; halfDayTime: string };
  importantNotice: string;
  lastUpdated: string;
}

const DEFAULT_RULEBOOK: RulebookData = {
  rule1: {
    title: '⏰ Late Login Policy',
    content: [
      'The official reporting/login time is 10:35 AM.',
      'An additional 5-minute grace period will be provided for login.',
      "If an employee is late 2 times, 1 day's salary will be deducted."
    ]
  },
  rule2: {
    title: '🚪 Early Logout Policy',
    content: [
      'The official logout time is 6:30 PM.',
      'Leaving before the official logout time without prior approval will be considered an early logout.',
      "2 instances of early logout will result in deduction of 1 day's salary."
    ]
  },
  rule3: {
    title: '📅 Monday & Saturday Leave Policy',
    content: [
      'Taking leave on Monday or Saturday requires prior approval from the reporting authority.',
      'Unapproved leave taken on Monday or Saturday will be treated as a serious attendance violation.',
      "2 days of leave taken on Monday/Saturday without approval will result in deduction of 2 days' salary."
    ]
  },
  rule4: {
    title: '🕐 Official Working Hours',
    loginTime: '10:35 AM',
    gracePeriod: '5 Minutes',
    logoutTime: '6:30 PM'
  },
  rule5: {
    title: '⏱️ Extended Working Hours Policy',
    content: [
      'If the assigned sales targets or required work are not completed within the scheduled working hours, management may extend the working time based on business requirements.',
      'Employees are expected to cooperate and complete their assigned responsibilities.'
    ],
    maxTime: '7:00 PM'
  },
  rule6: {
    title: '🌓 Half-Day Policy',
    halfDayTime: '12:30 PM'
  },
  importantNotice: 'Attendance discipline is an essential part of maintaining a professional and productive workplace. All employees are required to strictly follow login time, logout time, attendance rules, and work commitments. Repeated violations of attendance policies may lead to salary deductions, performance review, and further disciplinary action as per company policy.',
  lastUpdated: 'January 2026'
};

const Rulebook: React.FC<RulebookProps> = ({ currentUser }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [acknowledgedDate, setAcknowledgedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  // Admin editing states
  const [editMode, setEditMode] = useState(false);
  const [rulebookData, setRulebookData] = useState<RulebookData>(DEFAULT_RULEBOOK);
  const [savingRules, setSavingRules] = useState(false);

  // Check if user has already acknowledged & load rulebook data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load rulebook data
        const rulebookRef = doc(db, 'system_settings', 'rulebook');
        const rulebookSnap = await getDoc(rulebookRef);
        if (rulebookSnap.exists()) {
          setRulebookData(rulebookSnap.data() as RulebookData);
        }

        // Load acknowledgment status
        const ackRef = doc(db, 'rulebook_acknowledgments', currentUser.id);
        const ackSnap = await getDoc(ackRef);
        
        if (ackSnap.exists()) {
          const data = ackSnap.data();
          setAcknowledged(data.acknowledged || false);
          setAcknowledgedDate(data.acknowledgedDate || null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
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

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await setDoc(doc(db, 'system_settings', 'rulebook'), {
        ...rulebookData,
        lastUpdated: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name
      });
      
      setEditMode(false);
      alert('✅ Rulebook updated successfully! All employees will see the new rules.');
    } catch (error) {
      console.error('Error saving rulebook:', error);
      alert('❌ Failed to save rulebook. Please try again.');
    } finally {
      setSavingRules(false);
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
          <div className="flex items-center space-x-3">
            {acknowledged && !isAdmin && (
              <div className="flex items-center space-x-2 bg-green-50 px-4 py-2 rounded-xl border border-green-200">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-bold text-green-700">Acknowledged ✓</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center space-x-2">
                {editMode ? (
                  <>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRules}
                      disabled={savingRules}
                      className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50"
                    >
                      {savingRules ? 'Saving...' : '💾 Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    ✏️ Edit Rulebook
                  </button>
                )}
              </div>
            )}
          </div>
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule1.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule1: { ...rulebookData.rule1, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-orange-300 rounded-xl font-black text-orange-900 text-xl focus:outline-none focus:border-orange-500"
                    />
                    {rulebookData.rule1.content.map((line, idx) => (
                      <textarea
                        key={idx}
                        value={line}
                        onChange={(e) => {
                          const newContent = [...rulebookData.rule1.content];
                          newContent[idx] = e.target.value;
                          setRulebookData({ ...rulebookData, rule1: { ...rulebookData.rule1, content: newContent } });
                        }}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-orange-200 rounded-lg font-bold text-gray-700 focus:outline-none focus:border-orange-400"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-orange-900 mb-3 flex items-center">
                      {rulebookData.rule1.title}
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      {rulebookData.rule1.content.map((line, idx) => (
                        <p key={idx} className="font-bold" dangerouslySetInnerHTML={{ __html: line.replace(/(\d+:\d+ [AP]M|HALFDAY|\d+ times?|\d+ day'?s?|\d+-minute)/g, '<span class="text-orange-700 font-black">$1</span>') }} />
                      ))}
                    </div>
                    <div className="mt-3 bg-orange-100 rounded-lg p-3 border border-orange-300">
                      <p className="text-sm font-black text-orange-800">📌 Grace Period: 10:35 AM to 10:40 AM</p>
                    </div>
                  </>
                )}
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule2.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule2: { ...rulebookData.rule2, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-red-300 rounded-xl font-black text-red-900 text-xl focus:outline-none focus:border-red-500"
                    />
                    {rulebookData.rule2.content.map((line, idx) => (
                      <textarea
                        key={idx}
                        value={line}
                        onChange={(e) => {
                          const newContent = [...rulebookData.rule2.content];
                          newContent[idx] = e.target.value;
                          setRulebookData({ ...rulebookData, rule2: { ...rulebookData.rule2, content: newContent } });
                        }}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-red-200 rounded-lg font-bold text-gray-700 focus:outline-none focus:border-red-400"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-red-900 mb-3 flex items-center">
                      {rulebookData.rule2.title}
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      {rulebookData.rule2.content.map((line, idx) => (
                        <p key={idx} className="font-bold" dangerouslySetInnerHTML={{ __html: line.replace(/(\d+:\d+ [AP]M|HALFDAY|\d+ times?|\d+ day'?s?|\d+ instances?)/g, '<span class="text-red-700 font-black">$1</span>') }} />
                      ))}
                    </div>
                    <div className="mt-3 bg-red-100 rounded-lg p-3 border border-red-300">
                      <p className="text-sm font-black text-red-800">⚠️ Prior approval required for early departure</p>
                    </div>
                  </>
                )}
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule3.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule3: { ...rulebookData.rule3, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-purple-300 rounded-xl font-black text-purple-900 text-xl focus:outline-none focus:border-purple-500"
                    />
                    {rulebookData.rule3.content.map((line, idx) => (
                      <textarea
                        key={idx}
                        value={line}
                        onChange={(e) => {
                          const newContent = [...rulebookData.rule3.content];
                          newContent[idx] = e.target.value;
                          setRulebookData({ ...rulebookData, rule3: { ...rulebookData.rule3, content: newContent } });
                        }}
                        rows={2}
                        className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg font-bold text-gray-700 focus:outline-none focus:border-purple-400"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-purple-900 mb-3 flex items-center">
                      {rulebookData.rule3.title}
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      {rulebookData.rule3.content.map((line, idx) => (
                        <p key={idx} className="font-bold" dangerouslySetInnerHTML={{ __html: line.replace(/(Monday|Saturday|\d+ day'?s?|prior approval)/gi, '<span class="text-purple-700 font-black">$1</span>') }} />
                      ))}
                    </div>
                    <div className="mt-3 bg-purple-100 rounded-lg p-3 border border-purple-300">
                      <p className="text-sm font-black text-purple-800">🚫 Mandatory approval for weekend bordering leaves</p>
                    </div>
                  </>
                )}
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule4.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule4: { ...rulebookData.rule4, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-blue-300 rounded-xl font-black text-blue-900 text-xl focus:outline-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-bold text-blue-600 uppercase">Login Time</label>
                        <input
                          type="text"
                          value={rulebookData.rule4.loginTime}
                          onChange={(e) => setRulebookData({ ...rulebookData, rule4: { ...rulebookData.rule4, loginTime: e.target.value } })}
                          className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-black text-blue-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-blue-600 uppercase">Grace Period</label>
                        <input
                          type="text"
                          value={rulebookData.rule4.gracePeriod}
                          onChange={(e) => setRulebookData({ ...rulebookData, rule4: { ...rulebookData.rule4, gracePeriod: e.target.value } })}
                          className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-black text-blue-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-blue-600 uppercase">Logout Time</label>
                        <input
                          type="text"
                          value={rulebookData.rule4.logoutTime}
                          onChange={(e) => setRulebookData({ ...rulebookData, rule4: { ...rulebookData.rule4, logoutTime: e.target.value } })}
                          className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg font-black text-blue-900 focus:outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-blue-900 mb-3 flex items-center">
                      {rulebookData.rule4.title}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Login Time</p>
                        <p className="text-2xl font-black text-blue-900">{rulebookData.rule4.loginTime}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Grace Period</p>
                        <p className="text-2xl font-black text-blue-900">{rulebookData.rule4.gracePeriod}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">Logout Time</p>
                        <p className="text-2xl font-black text-blue-900">{rulebookData.rule4.logoutTime}</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-700">All employees are required to <span className="text-blue-700 font-black">strictly follow</span> the assigned working hours.</p>
                  </>
                )}
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule5.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule5: { ...rulebookData.rule5, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-amber-300 rounded-xl font-black text-amber-900 text-xl focus:outline-none focus:border-amber-500"
                    />
                    {rulebookData.rule5.content.map((line, idx) => (
                      <textarea
                        key={idx}
                        value={line}
                        onChange={(e) => {
                          const newContent = [...rulebookData.rule5.content];
                          newContent[idx] = e.target.value;
                          setRulebookData({ ...rulebookData, rule5: { ...rulebookData.rule5, content: newContent } });
                        }}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-amber-200 rounded-lg font-bold text-gray-700 focus:outline-none focus:border-amber-400"
                      />
                    ))}
                    <div>
                      <label className="text-xs font-bold text-amber-600 uppercase">Maximum Extended Time</label>
                      <input
                        type="text"
                        value={rulebookData.rule5.maxTime}
                        onChange={(e) => setRulebookData({ ...rulebookData, rule5: { ...rulebookData.rule5, maxTime: e.target.value } })}
                        className="w-full px-3 py-2 border-2 border-amber-200 rounded-lg font-black text-amber-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-amber-900 mb-3 flex items-center">
                      {rulebookData.rule5.title}
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      {rulebookData.rule5.content.map((line, idx) => (
                        <p key={idx} className="font-bold">{line}</p>
                      ))}
                      <div className="ml-6 bg-white rounded-lg p-3 border border-amber-300 my-2">
                        <p className="text-lg font-black text-amber-800">Maximum Extended Time: {rulebookData.rule5.maxTime}</p>
                      </div>
                    </div>
                  </>
                )}
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
                {editMode ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={rulebookData.rule6.title}
                      onChange={(e) => setRulebookData({ ...rulebookData, rule6: { ...rulebookData.rule6, title: e.target.value } })}
                      className="w-full px-4 py-2 border-2 border-yellow-300 rounded-xl font-black text-yellow-900 text-xl focus:outline-none focus:border-yellow-500"
                    />
                    <div>
                      <label className="text-xs font-bold text-yellow-600 uppercase">Half-Day Threshold Time</label>
                      <input
                        type="text"
                        value={rulebookData.rule6.halfDayTime}
                        onChange={(e) => setRulebookData({ ...rulebookData, rule6: { ...rulebookData.rule6, halfDayTime: e.target.value } })}
                        className="w-full px-3 py-2 border-2 border-yellow-200 rounded-lg font-black text-yellow-900 focus:outline-none focus:border-yellow-400"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-yellow-900 mb-3 flex items-center">
                      {rulebookData.rule6.title}
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p className="font-bold">• If an employee logs in after <span className="text-yellow-700 font-black">{rulebookData.rule6.halfDayTime}</span>, the day will automatically be considered as a:</p>
                      <div className="bg-yellow-100 rounded-lg p-4 border-2 border-yellow-400 my-2 text-center">
                        <p className="text-2xl font-black text-yellow-800">HALF DAY</p>
                      </div>
                    </div>
                  </>
                )}
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
                {editMode ? (
                  <textarea
                    value={rulebookData.importantNotice}
                    onChange={(e) => setRulebookData({ ...rulebookData, importantNotice: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-white/30 rounded-xl font-bold text-gray-800 focus:outline-none focus:border-white bg-white/90"
                  />
                ) : (
                  <p className="font-bold leading-relaxed">
                    {rulebookData.importantNotice}
                  </p>
                )}
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