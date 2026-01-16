import React, { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'LEAVE_REQUEST' | 'LEAVE_APPROVED' | 'LEAVE_REJECTED';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  employeeName?: string;
}

interface NotificationBellProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead, onClearAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-600 hover:text-indigo-600 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
            <div>
              <h3 className="font-bold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">{unreadCount} unread</p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                </svg>
                <p className="text-sm font-medium">No notifications</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notif.read ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.type === 'CLOCK_IN' ? 'bg-green-100' :
                      notif.type === 'CLOCK_OUT' ? 'bg-blue-100' :
                      notif.type === 'LEAVE_REQUEST' ? 'bg-orange-100' :
                      notif.type === 'LEAVE_APPROVED' ? 'bg-green-100' :
                      'bg-red-100'
                    }`}>
                      {notif.type === 'CLOCK_IN' && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                        </svg>
                      )}
                      {notif.type === 'CLOCK_OUT' && (
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                      )}
                      {notif.type === 'LEAVE_REQUEST' && (
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      )}
                      {(notif.type === 'LEAVE_APPROVED' || notif.type === 'LEAVE_REJECTED') && (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notif.timestamp}</p>
                    </div>

                    {/* Unread Indicator */}
                    {!notif.read && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default NotificationBell;
