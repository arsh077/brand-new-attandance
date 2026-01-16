# 🔔 Notification System - Complete Guide

## Overview
The notification system provides real-time alerts for attendance and leave management activities across all devices and browser tabs.

## Features Implemented

### 1. **Notification Bell Component**
- Located in the header (top-right corner)
- Shows unread count with animated badge
- Dropdown with notification list
- Mark as read functionality
- Clear all notifications

### 2. **Notification Types**

#### For Admin Users:
1. **Clock In Notifications** 🟢
   - Triggered when any employee clocks in
   - Shows employee name, time, and late status
   - Example: "Kabir Sharma clocked in at 10:45 AM (Late)"

2. **Clock Out Notifications** 🔴
   - Triggered when any employee clocks out
   - Shows employee name, time, and duration
   - Example: "Kabir Sharma clocked out at 6:30 PM (Duration: 7h 45m)"

3. **Leave Request Notifications** 📝
   - Triggered when employee submits leave request
   - Shows employee name, leave type, and dates
   - Example: "Kabir Sharma requested Casual leave from 2026-02-10 to 2026-02-12"

#### For Employee Users:
1. **Leave Approved Notifications** ✅
   - Triggered when admin approves leave request
   - Example: "Your Casual leave request has been approved"

2. **Leave Rejected Notifications** ❌
   - Triggered when admin rejects leave request
   - Example: "Your Sick leave request has been rejected"

### 3. **Real-Time Sync**
- **Pusher WebSocket**: Primary method for cross-device notifications
- **BroadcastChannel API**: Backup for same-browser tabs
- **LocalStorage Events**: Cross-tab sync
- **Polling**: Fallback mechanism (every 2 seconds)

### 4. **Clock In/Out from Dashboard**
- Employees can clock in/out directly from the main dashboard
- No need to navigate to Attendance page
- Shows current status (clocked in time or prompt to clock in)
- Large, prominent button with visual feedback

## Technical Architecture

### Files Modified/Created:
1. **`components/NotificationBell.tsx`** - Notification UI component
2. **`services/notificationService.ts`** - Notification management service
3. **`services/pusherService.ts`** - Updated with notification events
4. **`App.tsx`** - Integrated notification system
5. **`pages/Dashboard.tsx`** - Added clock in/out button for employees
6. **`pages/Leaves.tsx`** - Triggers notification events

### Event Flow:

#### Clock In/Out Flow:
```
Employee clicks "Clock In" 
  → App.tsx updates attendance state
  → localStorage updated with timestamp
  → Pusher event triggered: 'client-clock-in'
  → All connected devices receive event
  → Admin receives notification
  → Attendance table updates in real-time
```

#### Leave Request Flow:
```
Employee submits leave request
  → App.tsx updates leave requests state
  → localStorage updated
  → Pusher event triggered: 'client-leave-request'
  → Admin/Manager receives notification
  → Leave request appears in Leaves page
```

#### Leave Approval Flow:
```
Admin approves/rejects leave
  → App.tsx updates leave status
  → localStorage updated
  → Pusher event triggered: 'client-leave-action'
  → Employee receives notification
  → Leave status updates in employee's view
```

## Pusher Configuration

### Required Environment Variables:
```env
VITE_PUSHER_APP_KEY=29d18e6ae1f9ed4b02ce
VITE_PUSHER_CLUSTER=ap2
```

### Pusher Dashboard:
- URL: https://dashboard.pusher.com/apps/2102508
- App ID: 2102508
- Cluster: Asia Pacific (ap2)
- Client Events: **ENABLED** (required for cross-device sync)

### Event Names:
- `client-clock-in` - Employee clocked in
- `client-clock-out` - Employee clocked out
- `client-attendance-update` - Attendance data synced
- `client-leave-request` - Leave request submitted
- `client-leave-action` - Leave approved/rejected

## User Experience

### Admin View:
1. Bell icon in header shows unread count
2. Click bell to see notification dropdown
3. Notifications include:
   - Employee clock in/out with timing
   - Leave requests from all employees
4. Click notification to mark as read
5. "Clear All" button to remove all notifications

### Employee View:
1. Dashboard shows "Quick Attendance" card
2. Large "Clock In" or "Clock Out" button
3. Shows current status (clocked in time)
4. Bell icon shows leave approval/rejection notifications
5. No clock in/out notifications (only for admin)

## Testing Checklist

### Cross-Device Testing:
- [ ] Admin on desktop, employee on mobile
- [ ] Employee clocks in on mobile → Admin sees notification on desktop
- [ ] Admin approves leave on desktop → Employee sees notification on mobile
- [ ] Multiple tabs open → All tabs sync in real-time

### Notification Testing:
- [ ] Clock in notification appears for admin
- [ ] Clock out notification shows duration
- [ ] Late clock in shows "(Late)" indicator
- [ ] Leave request notification appears for admin
- [ ] Leave approval notification appears for employee
- [ ] Unread count updates correctly
- [ ] Mark as read works
- [ ] Clear all removes all notifications

### UI Testing:
- [ ] Bell icon visible in header
- [ ] Unread badge animates (pulse effect)
- [ ] Dropdown opens/closes correctly
- [ ] Notifications display with correct icons
- [ ] Timestamps show in 12-hour format
- [ ] Clock in button on employee dashboard
- [ ] Button changes from "Clock In" to "Clock Out"

## Troubleshooting

### Notifications Not Appearing:
1. Check Pusher connection in browser console
2. Verify environment variables are set
3. Ensure client events are enabled in Pusher dashboard
4. Check localStorage for `ls_notifications`

### Cross-Device Not Working:
1. Verify both devices are online
2. Check Pusher connection status
3. Ensure same Pusher app key on both devices
4. Check browser console for errors

### Clock In Button Not Showing:
1. Verify user is logged in as Employee (not Admin)
2. Check Dashboard.tsx is rendering correctly
3. Ensure currentUser prop is passed correctly

## Future Enhancements

### Possible Additions:
1. **Sound Notifications**: Play sound when notification arrives
2. **Browser Notifications**: Use Web Notification API
3. **Notification History**: Archive old notifications
4. **Notification Preferences**: Let users choose which notifications to receive
5. **Email Notifications**: Send email for important events
6. **Push Notifications**: Mobile push notifications
7. **Notification Filters**: Filter by type or employee
8. **Notification Search**: Search through notifications

## Deployment Notes

### GitHub Actions:
- Automatic deployment configured
- Pusher credentials stored in GitHub Secrets
- Builds and deploys on every push to main branch

### Environment Setup:
1. Add Pusher credentials to `.env.local` (development)
2. Add Pusher credentials to `.env.production` (production)
3. Add credentials to GitHub Secrets for automated deployment
4. Verify Pusher dashboard shows active connections

## Support

### Common Issues:
1. **"Pusher not initialized"**: Check environment variables
2. **"Client events not working"**: Enable in Pusher dashboard
3. **"Notifications not syncing"**: Check internet connection
4. **"Bell icon not showing"**: Clear browser cache

### Contact:
- Admin Email: Info@legalsuccessindia.com
- GitHub: https://github.com/arsh077/legal-success-india-attandnce

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
