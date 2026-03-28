import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface Festival {
    date: string; // YYYY-MM-DD
    name: string;
    message: string;
    emoji?: string;
}

// 📅 Comprehensive Indian Festival Calendar 2026
const INDIAN_FESTIVALS_2026: Festival[] = [
    // January
    { date: '2026-01-01', name: 'New Year', message: 'Wishing you a very Happy New Year 2026! May this year bring you joy and success. ✨', emoji: '🎆' },
    { date: '2026-01-13', name: 'Lohri', message: 'May the bonfire of Lohri burn all your sorrows and bring you happiness! 🔥', emoji: '🔥' },
    { date: '2026-01-14', name: 'Makar Sankranti / Pongal', message: 'Wishing you a harvest of happiness and prosperity! 🪁', emoji: '🪁' },
    { date: '2026-01-26', name: 'Republic Day', message: 'Happy Republic Day! Let us celebrate the spirit of our great nation. 🇮🇳', emoji: '🇮🇳' },
    { date: '2026-01-26', name: 'Vasant Panchami', message: 'May Goddess Saraswati bless you with knowledge and wisdom. 📚', emoji: '🪷' },
    
    // February
    { date: '2026-02-14', name: 'Maha Shivratri', message: 'Om Namah Shivaya! May Lord Shiva bless you with strength and peace. 🕉️', emoji: '🕉️' },
    
    // March
    { date: '2026-03-03', name: 'Holika Dahan', message: 'May the fire of Holika burn all evil and bring positivity to your life. 🔥', emoji: '🔥' },
    { date: '2026-03-04', name: 'Holi', message: 'Wishing you a vibrant and joyous Holi! Let the colors of happiness fill your life. 🎨', emoji: '🎨' },
    { date: '2026-03-19', name: 'Gudi Padwa / Ugadi', message: 'Wishing you a prosperous and auspicious new year! 🌸', emoji: '🌸' },
    { date: '2026-03-20', name: 'Ramzan / fasting starts', message: 'Ramadan Mubarak! May this holy month bring you peace and blessings. 🌙', emoji: '🕌' },
    { date: '2026-03-27', name: 'Ram Navami', message: 'May Lord Rama bless you with righteousness and joy! 🏹', emoji: '🏹' },

    // April
    { date: '2026-04-02', name: 'Mahavir Jayanti', message: 'May Lord Mahavir bless you with peace and compassion. 🕊️', emoji: '🪷' },
    { date: '2026-04-03', name: 'Good Friday', message: 'May the grace of the Lord bring peace to your heart. ✝️', emoji: '✝️' },
    { date: '2026-04-05', name: 'Easter', message: 'Happy Easter! Wishing you joy, hope, and new beginnings. 🐰', emoji: '🐰' },
    { date: '2026-04-14', name: 'Baisakhi / Ambedkar Jayanti', message: 'Happy Baisakhi! Wishing you a golden harvest of joy. 🌾', emoji: '🌾' },
    { date: '2026-04-20', name: 'Eid-ul-Fitr', message: 'Eid Mubarak! May Allah shower His blessings upon you and your loved ones. 🌙', emoji: '🌙' },

    // May
    { date: '2026-05-01', name: 'Labour Day / Maharashtra Day', message: 'Honoring the hard work and dedication of every worker. Happy Labour Day! 🛠️', emoji: '🛠️' },
    { date: '2026-05-31', name: 'Buddha Purnima', message: 'May the teachings of Lord Buddha guide you towards peace and enlightenment. ☸️', emoji: '☸️' },

    // June
    { date: '2026-06-27', name: 'Eid al-Adha (Bakrid)', message: 'Eid Mubarak! May your sacrifices be appreciated and your prayers answered. 🌙', emoji: '🌙' },

    // July
    { date: '2026-07-26', name: 'Muharram', message: 'Wishing you peace and blessings on this holy day of Muharram. 🕌', emoji: '🕌' },

    // August
    { date: '2026-08-15', name: 'Independence Day', message: 'Happy Independence Day! Let us salute the heroes of our nation. 🇮🇳', emoji: '🇮🇳' },
    { date: '2026-08-19', name: 'Onam', message: 'Wishing you a joyous and prosperous Onam! 🌺', emoji: '🛶' },
    { date: '2026-08-28', name: 'Raksha Bandhan', message: 'Celebrate the beautiful bond of love and protection! Happy Rakhi! 💝', emoji: '💝' },

    // September
    { date: '2026-09-04', name: 'Janmashtami', message: 'Hare Krishna! May Lord Krishna shower you with his divine blessings. 🦚', emoji: '🦚' },
    { date: '2026-09-14', name: 'Ganesh Chaturthi', message: 'Ganpati Bappa Morya! May Lord Ganesha remove all obstacles from your path. 🌺', emoji: '🌺' },
    { date: '2026-09-24', name: 'Eid e Milad', message: 'May the blessings of the Prophet guide you in all your endeavors. 🕌', emoji: '🕌' },

    // October
    { date: '2026-10-02', name: 'Gandhi Jayanti', message: 'Remembering the Mahatma! Let us follow the path of truth and non-violence. 🕊️', emoji: '🕊️' },
    { date: '2026-10-18', name: 'Maha Saptami / Durga Puja', message: 'Shubho Durga Puja! May Maa Durga bless you with strength and courage. 🔱', emoji: '🔱' },
    { date: '2026-10-19', name: 'Maha Ashtami', message: 'May the divine blessings of Goddess Durga be with you. Shubho Ashtami! ✨', emoji: '✨' },
    { date: '2026-10-20', name: 'Maha Navami', message: 'Wishing you a blessed and joyful Maha Navami! 🌸', emoji: '🌸' },
    { date: '2026-10-21', name: 'Dussehra (Vijayadashami)', message: 'Happy Dussehra! May the truth and goodness always triumph. 🏹', emoji: '🏹' },
    { date: '2026-10-31', name: 'Karva Chauth', message: 'Wishing you a beautiful and loving Karva Chauth. 🌙', emoji: '🌙' },

    // November
    { date: '2026-11-06', name: 'Dhanteras', message: 'Happy Dhanteras! May Goddess Lakshmi bless you with wealth and prosperity. 🪙', emoji: '🪙' },
    { date: '2026-11-08', name: 'Diwali', message: 'Happy Diwali! May the festival of lights brighten your life with happiness and success. 🪔', emoji: '🪔' },
    { date: '2026-11-09', name: 'Govardhan Puja', message: 'May Lord Krishna shower you with his abundant blessings! 🦚', emoji: '🦚' },
    { date: '2026-11-10', name: 'Bhai Dooj', message: 'Celebrating the eternal bond of love between brothers and sisters! 💝', emoji: '💝' },
    { date: '2026-11-14', name: 'Chhath Puja', message: 'May the Sun God bless you with health, wealth, and success. 🌅', emoji: '🌅' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti', message: 'Happy Gurpurab! May Guru Nanak Dev Ji inspire you to achieve all your dreams. 🙏', emoji: '🙏' },

    // December
    { date: '2026-12-25', name: 'Christmas', message: 'Merry Christmas! Wishing you a season of joy, peace, and festive cheer. 🎄', emoji: '🎄' }
];

class FestivalSchedulerService {

    /**
     * Fetch holidays from Nager.Date API as backup
     */
    private async fetchNagerHolidays(year: number): Promise<Festival[]> {
        try {
            const cacheKey = `nager_holidays_${year}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            console.log(`🌍 Fetching Nager API holidays for ${year}...`);
            const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/IN`);
            if (!response.ok) return [];

            const data = await response.json();
            const holidays: Festival[] = data.map((item: any) => ({
                date: item.date,
                name: item.name,
                message: `Wishing you a happy ${item.name}! 🎉`,
                emoji: '🎉'
            }));

            localStorage.setItem(cacheKey, JSON.stringify(holidays));
            return holidays;
        } catch (error) {
            console.warn('⚠️ Nager API failed, relying solely on local calendar.', error);
            return [];
        }
    }

    /**
     * Get festival for exactly today (prioritizes beautiful local calendar)
     */
    async getTodaysFestival(): Promise<Festival | null> {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        const year = now.getFullYear();

        // 1. Check local comprehensive calendar first (best messages/emojis)
        let festival = INDIAN_FESTIVALS_2026.find(f => f.date === today);

        // 2. If not found locally, check Nager API (handles unexpected/regional official holidays)
        if (!festival) {
            const apiHolidays = await this.fetchNagerHolidays(year);
            festival = apiHolidays.find(f => f.date === today);
        }

        return festival || null;
    }

    /**
     * Checks if today is a festival and sends a global announcement to Firestore.
     * Run this on App mount so the bell catches it.
     */
    async checkAndSendFestivalNotification() {
        try {
            const festival = await this.getTodaysFestival();
            if (!festival) return;

            const now = new Date();
            const today = now.toISOString().split('T')[0];

            console.log(`🎉 Today is ${festival.name}! Checking Firestore announcement...`);

            // Check if we already announced this to Firestore
            const q = query(
                collection(db, 'announcements'),
                where('type', '==', 'FESTIVAL'),
                where('date', '==', today)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                console.log('✅ Festival announcement already in Firestore.');
                return;
            }

            // ADD to Firestore so it appears in the NotificationBell
            await addDoc(collection(db, 'announcements'), {
                type: 'FESTIVAL',
                title: `${festival.emoji || '🎉'} Happy ${festival.name}!`,
                message: festival.message,
                date: today,
                createdAt: Timestamp.now(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            console.log(`🚀 Festival announcement sent for ${festival.name}`);

        } catch (error) {
            console.error('❌ Error in Festival Scheduler:', error);
        }
    }
}

export const festivalScheduler = new FestivalSchedulerService();
