import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { birthdayScheduler } from '../services/birthdayScheduler';

interface BirthdayPopupProps {
    employees: Employee[];
}

const BirthdayPopup: React.FC<BirthdayPopupProps> = ({ employees }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [birthdayEmployees, setBirthdayEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        // Check for birthdays today
        const todaysBirthdays = birthdayScheduler.getTodaysBirthdays(employees);

        if (todaysBirthdays.length > 0) {
            // Check if user has already dismissed today's birthday popup
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const dismissedDate = localStorage.getItem('birthdayPopupDismissed');

            if (dismissedDate !== today) {
                setBirthdayEmployees(todaysBirthdays);
                setIsVisible(true);
            }
        }
    }, [employees]);

    const handleDismiss = () => {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        localStorage.setItem('birthdayPopupDismissed', today);
        setIsVisible(false);
    };

    if (!isVisible || birthdayEmployees.length === 0) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-[40px] w-full max-w-md p-8 animate-slide-up shadow-2xl border-4 border-white/50 relative overflow-hidden">

                {/* Decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-300/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="text-6xl mb-4 animate-bounce">🎂</div>
                        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 mb-2">
                            Birthday Celebration!
                        </h2>
                        <p className="text-sm font-bold text-gray-600">
                            {birthdayEmployees.length === 1 ? 'Someone special' : 'Some special people'} {birthdayEmployees.length === 1 ? 'is' : 'are'} celebrating today! 🎉
                        </p>
                    </div>

                    {/* Birthday employees list */}
                    <div className="space-y-3 mb-6">
                        {birthdayEmployees.map((emp) => (
                            <div
                                key={emp.id}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border-2 border-purple-200/50 shadow-lg hover:shadow-xl transition-all"
                            >
                                <div className="flex items-center">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-white flex items-center justify-center font-black text-xl mr-4 shadow-lg">
                                        {emp.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg font-black text-gray-900">{emp.name}</p>
                                        <p className="text-xs text-gray-600 font-bold">{emp.designation}</p>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{emp.department}</p>
                                    </div>
                                    <div className="text-3xl">🎈</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Birthday message */}
                    <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-indigo-100 rounded-2xl p-4 mb-6 border-2 border-purple-200/50">
                        <p className="text-center text-sm font-black text-gray-800">
                            🎊 Wishing {birthdayEmployees.length === 1 ? 'you' : 'all of you'} a wonderful day filled with joy, laughter, and amazing moments! 🎊
                        </p>
                    </div>

                    {/* Dismiss button */}
                    <button
                        onClick={handleDismiss}
                        className="w-full bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-black hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700 transition-all shadow-xl text-sm uppercase tracking-widest"
                    >
                        ✨ Thanks! Close
                    </button>
                </div>

                {/* Floating emojis */}
                <div className="absolute top-4 right-4 text-2xl animate-bounce" style={{ animationDelay: '0.5s' }}>🎉</div>
                <div className="absolute bottom-4 left-4 text-2xl animate-bounce" style={{ animationDelay: '1.5s' }}>🎁</div>
            </div>
        </div>
    );
};

export default BirthdayPopup;
