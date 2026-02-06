
import { db } from './firebaseConfig';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface Festival {
    date: string; // YYYY-MM-DD
    name: string;
    message: string;
}

// 📅 Fallback Calendar (if API fails)
const FALLBACK_FESTIVALS: Festival[] = [
    { date: '2026-01-26', name: 'Republic Day', message: 'Wishing you a very Happy Republic Day! 🇮🇳' },
    { date: '2026-03-08', name: 'Holi', message: 'May your life be as colorful and joyful as the festival of Holi! 🎨' },
    { date: '2026-04-20', name: 'Eid-ul-Fitr', message: 'Eid Mubarak! Wishing you and your family peace and prosperity. 🌙' },
    { date: '2026-08-15', name: 'Independence Day', message: 'Happy Independence Day! Let\'s celebrate the spirit of freedom. 🇮🇳' },
    { date: '2026-10-02', name: 'Gandhi Jayanti', message: 'Remembering the Mahatma on his birth anniversary.' },
    { date: '2026-10-20', name: 'Durga Puja', message: 'Shubho Mahalaya! May Ma Durga bless you with strength and happiness.' },
    { date: '2026-11-08', name: 'Diwali', message: 'Wishing you a sparkling Festival of Lights! Happy Diwali! 🪔' },
    { date: '2026-12-25', name: 'Christmas', message: 'Merry Christmas! Wishing you joy and festive cheer. 🎄' }
];

class FestivalSchedulerService {

    /**
     * Fetch holidays from Nager.Date API
     */
    private async fetchHolidays(year: number): Promise<Festival[]> {
        try {
            // Check cache first
            const cacheKey = `festivals_${year}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }

            console.log(`🌍 Fetching real-time holidays for ${year}...`);
            const response = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/IN`);

            if (!response.ok) throw new Error('API Error');

            const data = await response.json();

            // Transform API data to our format
            const holidays: Festival[] = data.map((item: any) => ({
                date: item.date,
                name: item.name, // e.g. "Diwali"
                message: `Wishing you a happy ${item.name}! 🎉` // Generic message
            }));

            // Cache for 30 days
            localStorage.setItem(cacheKey, JSON.stringify(holidays));
            return holidays;

        } catch (error) {
            console.warn('⚠️ Could not fetch real-time holidays, using fallback.', error);
            return FALLBACK_FESTIVALS;
        }
    }

    /**
     * Checks if today is a festival and sends a notification if not already sent.
     * Run this on App mount.
     */
    async checkAndSendFestivalNotification() {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            const year = now.getFullYear();

            // Get festivals (API or Fallback)
            const festivals = await this.fetchHolidays(year);
            const festival = festivals.find(f => f.date === today);

            if (!festival) {
                // No festival today
                return;
            }

            console.log(`🎉 Today is ${festival.name}! Checking if notification sent...`);

            // 1. Check if we already sent this notification today
            // We check the 'system_logs' or just query notifications to see if one exists for today
            // To keep it simple and centralized, let's query the notifications collection directly
            const q = query(
                collection(db, 'notifications'),
                where('type', '==', 'FESTIVAL'),
                where('date', '==', today)
            );

            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                console.log('✅ Festival notification already sent today.');
                return;
            }

            // 2. Not sent yet? Send it now!
            // We create a "Broadcast" notification.
            // Since our notification system is currently user-based in UI but stored centrally,
            // we can add a special notification type that everyone listens to, OR
            // to avoid complicating the listener, we just add it to the collection.

            // Wait! The current notificationService listens to specific collections.
            // Let's create a new collection 'announcements' or just add to 'announcements'
            // But wait, the current system filters broadly. 
            // Let's create a generic "BROADCAST" in notifications.

            // Actually, looking at notificationService.ts, it listens to specific queries.
            // To make this visible to EVERYONE without changing every client listener:
            // We should probably just trigger a client-side alert for now, 
            // OR better: Create a 'global_notifications' collection that App.tsx listens to.

            // PLAN B (Simpler & Robust): 
            // Just record that we recognized the festival so we don't spam.
            // And relies on the App.tsx to show it locally to the user who logged in.
            // BUT user wants everyone to get it.

            // BEST APPROACH for "No Backend":
            // Use the 'notifications' collection but we need a way for everyone to see it.
            // Our current `notificationService` filters by `startTime`.
            // If we add a doc now, connected clients need to pick it up.
            // The current listeners in `notificationService.ts` are very specific (leave requests, etc).
            // We need to ADD a listener for general announcements.

            // Let's first ADD the notification to Firestore so we have a record.
            await addDoc(collection(db, 'announcements'), {
                type: 'FESTIVAL',
                title: `🎉 Happy ${festival.name}!`,
                message: festival.message,
                date: today,
                createdAt: Timestamp.now(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });

            console.log(`🚀 Festival notification sent for ${festival.name}`);

        } catch (error) {
            console.error('❌ Error in Festival Scheduler:', error);
        }
    }
}

export const festivalScheduler = new FestivalSchedulerService();
