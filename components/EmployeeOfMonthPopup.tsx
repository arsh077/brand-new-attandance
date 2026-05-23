import React, { useState, useEffect } from 'react';
import { MonthlyGoals } from '../services/firebaseTargetService';

interface EmployeeOfMonthPopupProps {
    monthlyGoals: MonthlyGoals;
}

const EmployeeOfMonthPopup: React.FC<EmployeeOfMonthPopupProps> = ({ monthlyGoals }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (!monthlyGoals?.employeeOfMonth) return;

        const emp = monthlyGoals.employeeOfMonth;
        const month = monthlyGoals.targetMonth ||
            `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Show once per session per month-employee combination
        const sessionKey = `eomPopup_${month}_${emp.id}`;
        if (sessionStorage.getItem(sessionKey)) return;

        // Dramatic 2-second delay before revealing
        const timer = setTimeout(() => {
            setIsVisible(true);
            sessionStorage.setItem(sessionKey, 'true');
        }, 2000);

        return () => clearTimeout(timer);
    }, [monthlyGoals?.employeeOfMonth?.id, monthlyGoals?.targetMonth]);

    const handleDismiss = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
        }, 500);
    };

    if (!isVisible || !monthlyGoals?.employeeOfMonth) return null;

    const emp = monthlyGoals.employeeOfMonth;
    const monthName = monthlyGoals.targetMonth
        ? new Date(monthlyGoals.targetMonth + '-02').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            style={{ backgroundColor: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(12px)' }}
        >
            <div
                className={`relative w-full max-w-2xl transition-all duration-500 ${isClosing ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}
                style={{ animation: isClosing ? 'none' : 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                {/* Main gold card */}
                <div className="relative bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 rounded-[48px] overflow-hidden shadow-2xl">
                    {/* Animated background blobs */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-2xl" />
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
                    </div>

                    {/* Floating star decorations */}
                    <span className="absolute top-8 left-10 text-4xl animate-bounce opacity-80" style={{ animationDelay: '0s', animationDuration: '2s' }}>⭐</span>
                    <span className="absolute top-10 right-14 text-3xl animate-bounce opacity-80" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>✨</span>
                    <span className="absolute bottom-14 left-14 text-3xl animate-bounce opacity-70" style={{ animationDelay: '0.8s', animationDuration: '3s' }}>🌟</span>
                    <span className="absolute bottom-8 right-10 text-4xl animate-bounce opacity-80" style={{ animationDelay: '1.2s', animationDuration: '2s' }}>⭐</span>
                    <span className="absolute top-1/2 right-6 text-2xl animate-bounce opacity-60" style={{ animationDelay: '1.5s' }}>✨</span>
                    <span className="absolute top-1/2 left-6 text-2xl animate-bounce opacity-60" style={{ animationDelay: '0.3s' }}>🌟</span>

                    {/* Content */}
                    <div className="relative z-10 py-14 px-10 text-center">
                        {/* Trophy — bouncing */}
                        <div className="text-[7.5rem] leading-none mb-4 animate-bounce" style={{ animationDuration: '2s', filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.3))' }}>
                            🏆
                        </div>

                        {/* Month label */}
                        <p className="text-white/70 font-black uppercase tracking-[0.5em] text-xs mb-3">
                            {monthName}
                        </p>

                        {/* Title */}
                        <h1
                            className="text-white font-black uppercase mb-8 leading-tight"
                            style={{
                                fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
                                letterSpacing: '0.12em',
                                textShadow: '0 2px 30px rgba(0,0,0,0.4)'
                            }}
                        >
                            Employee of the Month
                        </h1>

                        {/* ━━ THE BIG MOMENT — Employee Name ━━ */}
                        <div className="bg-white/20 backdrop-blur-sm rounded-[32px] border-2 border-white/40 px-8 py-10 mb-8 shadow-inner relative overflow-hidden">
                            {/* Inner glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-[32px]" />
                            <p
                                className="relative text-white font-black leading-none mb-4"
                                style={{
                                    fontSize: 'clamp(3.5rem, 9vw, 6.5rem)',
                                    textShadow: '0 4px 40px rgba(0,0,0,0.5)',
                                    letterSpacing: '-0.02em'
                                }}
                            >
                                {emp.name}
                            </p>
                            <p className="relative text-white/85 font-bold text-xl">{emp.designation}</p>
                            <p className="relative text-white/65 font-bold text-sm uppercase tracking-widest mt-1">{emp.department}</p>
                        </div>

                        {/* Congratulations */}
                        <p className="text-white/95 font-black text-xl mb-10" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                            🎉 Congratulations on this outstanding achievement! 🎊
                        </p>

                        {/* Dismiss button */}
                        <button
                            onClick={handleDismiss}
                            className="bg-white text-amber-600 px-14 py-5 rounded-2xl font-black text-xl shadow-2xl hover:bg-amber-50 hover:scale-105 active:scale-95 transition-all duration-200 uppercase tracking-widest"
                            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.25)' }}
                        >
                            🌟 Celebrate!
                        </button>
                    </div>
                </div>

                {/* Pinging dots at the top */}
                <div className="absolute -top-3 left-1/4 w-4 h-4 bg-yellow-300 rounded-full animate-ping opacity-60" />
                <div className="absolute -top-3 right-1/4 w-4 h-4 bg-amber-300 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.4s' }} />
                <div className="absolute -top-2 left-1/2 w-3 h-3 bg-yellow-200 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.8s' }} />
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(60px) scale(0.9); opacity: 0; }
                    to   { transform: translateY(0) scale(1);  opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default EmployeeOfMonthPopup;
