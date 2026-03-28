import React, { useState, useEffect } from 'react';
import { festivalScheduler, Festival } from '../services/festivalScheduler';

interface FestivalPopupProps {
    festival?: Festival | null;
}

const FestivalPopup: React.FC<FestivalPopupProps> = ({ festival: externalFestival }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [festival, setFestival] = useState<Festival | null>(externalFestival || null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const checkFestival = async () => {
            // Check for festival today - ONLY RUN ONCE on mount
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Allow override via props for testing or direct passing
            let currentFestival = externalFestival;
            
            if (!currentFestival) {
                currentFestival = await festivalScheduler.getTodaysFestival();
            }

            if (currentFestival) {
                // Determine today's cache key matching the specific festival
                const todayKey = `${todayStr}_${currentFestival.name.replace(/\s+/g, '_')}`;
                
                // Track separately per session (browser tab/window restart clears it) and local
                // so it doesn't annoy users on every refresh, but shows once per day per login
                const sessionKey = `festivalPopupShownSession_${todayKey}`;
                const localKey = `festivalPopupDismissed_${todayKey}`;
                
                const shownInSession = sessionStorage.getItem(sessionKey);
                const dismissedToday = localStorage.getItem(localKey);
                
                // We show if neither dismissed today NOR shown in this session
                if (!shownInSession && !dismissedToday) {
                    console.log(`🎊 Showing festival popup for: ${currentFestival.name}`);
                    setFestival(currentFestival);
                    setIsVisible(true);
                    // Mark as shown in this session immediately
                    sessionStorage.setItem(sessionKey, 'true');
                    
                    // Auto dismiss after 15 seconds
                    setTimeout(() => {
                        handleDismiss(todayKey);
                    }, 15000);
                } else {
                     console.log(`🎊 Festival popup for ${currentFestival.name} already shown or dismissed.`);
                }
            }
        };

        checkFestival();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [externalFestival]);

    const handleDismiss = (customKey?: string) => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            if (festival) {
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const todayKey = customKey || `${todayStr}_${festival.name.replace(/\s+/g, '_')}`;
                localStorage.setItem(`festivalPopupDismissed_${todayKey}`, 'true');
                console.log(`🎊 Festival popup dismissed for today: ${festival.name}`);
            }
        }, 500); // Wait for fade out animation
    };

    if (!isVisible || !festival) {
        return null;
    }

    // Determine colors based on festival type or name
    let gradientFrom = 'from-orange-400';
    let gradientVia = 'via-red-500';
    let gradientTo = 'to-yellow-500';
    let emoji = '🎉';
    
    const nameLower = festival.name.toLowerCase();
    
    if (nameLower.includes('holi')) {
        gradientFrom = 'from-pink-500'; gradientVia = 'via-purple-500'; gradientTo = 'to-yellow-500'; emoji = '🎨';
    } else if (nameLower.includes('diwali') || nameLower.includes('deepavali')) {
        gradientFrom = 'from-orange-500'; gradientVia = 'via-yellow-500'; gradientTo = 'to-red-500'; emoji = '🪔';
    } else if (nameLower.includes('eid') || nameLower.includes('ramzan')) {
        gradientFrom = 'from-emerald-500'; gradientVia = 'via-teal-500'; gradientTo = 'to-cyan-600'; emoji = '🌙';
    } else if (nameLower.includes('republic') || nameLower.includes('independence') || nameLower.includes('gandhi')) {
       gradientFrom = 'from-orange-400'; gradientVia = 'via-white'; gradientTo = 'to-green-500'; emoji = '🇮🇳';
    } else if (nameLower.includes('christmas')) {
       gradientFrom = 'from-red-600'; gradientVia = 'via-red-500'; gradientTo = 'to-green-600'; emoji = '🎄';
    } else if (nameLower.includes('navratri') || nameLower.includes('durga') || nameLower.includes('dussehra')) {
       gradientFrom = 'from-orange-600'; gradientVia = 'via-red-600'; gradientTo = 'to-orange-500'; emoji = '🔱';
    } else if (nameLower.includes('ganesh')) {
       gradientFrom = 'from-yellow-400'; gradientVia = 'via-orange-500'; gradientTo = 'to-red-500'; emoji = '🌺';
    } else if (nameLower.includes('shivratri')) {
       gradientFrom = 'from-slate-700'; gradientVia = 'via-indigo-800'; gradientTo = 'to-blue-900'; emoji = '🕉️';
    }

    // Override emoji with festival specific one if available in message
    const msgEmojis = festival.message.match(/[\p{Emoji_Presentation}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu);
    if(msgEmojis && msgEmojis.length > 0) {
        emoji = msgEmojis[msgEmojis.length-1]; // Use last emoji from message
    } else if (festival.emoji) {
        emoji = festival.emoji;
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity duration-500 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fade-in'}`}>
            <div className={`bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl relative transition-transform duration-500 ${isClosing ? 'scale-95 translate-y-10' : 'animate-slide-up'}`}>
                
                {/* Visual Header Banner */}
                <div className={`h-48 w-full bg-gradient-to-br ${gradientFrom} ${gradientVia} ${gradientTo} relative overflow-hidden flex items-center justify-center`}>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30">
                        <div className="absolute top-2 left-10 w-32 h-32 bg-white rounded-full mix-blend-overlay blur-xl animate-pulse"></div>
                        <div className="absolute -bottom-10 right-10 w-40 h-40 bg-white rounded-full mix-blend-overlay blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                    
                    {/* Floating emojis matching the theme */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                       <span className="absolute top-4 left-6 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
                       <span className="absolute top-20 right-10 text-4xl animate-bounce" style={{ animationDelay: '1.2s' }}>🎊</span>
                       <span className="absolute bottom-6 left-1/4 text-2xl animate-bounce" style={{ animationDelay: '0.7s' }}>🎉</span>
                    </div>

                    <div className="relative z-10 text-center flex flex-col items-center drop-shadow-lg">
                        <div className="text-7xl mb-2 filter drop-shadow-md animate-bounce transform origin-bottom">{emoji}</div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-8 text-center relative z-10 bg-white">
                    <h2 className={`text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${gradientFrom}  ${gradientTo} mb-4 tracking-tight`}>
                        {festival.name}
                    </h2>
                    
                    <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 shadow-inner">
                        <p className="text-lg font-bold text-gray-800 leading-relaxed">
                            {festival.message.replace(emoji, '').trim()}
                        </p>
                    </div>

                    <button
                        onClick={() => handleDismiss()}
                        className={`w-full bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white px-8 py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-xl shadow-orange-500/20 text-[15px] uppercase tracking-widest active:scale-95`}
                    >
                        Celebrate Now ✨
                    </button>
                    
                    <button 
                        onClick={() => handleDismiss()}
                        className="mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FestivalPopup;
