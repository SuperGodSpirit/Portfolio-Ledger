import { useState, useRef, useEffect } from "react";
import { Bell, AlertTriangle, Shield, CheckCircle, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useInAppNotifications } from "../../hooks/useInAppNotifications";
import type { NotificationCategory } from "../../types/notification";

interface NotificationBellProps {
  basePath: string;
}

export default function NotificationBell({ basePath }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllAsRead } = useInAppNotifications(5);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (category: NotificationCategory) => {
    switch (category) {
      case "ipoAlerts":
        return <Info className="h-5 w-5 text-blue-400" />;
      case "settlementAlerts":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "adminAlerts":
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Shield className="h-5 w-5 text-ledger-primary" />;
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ledger-text-secondary hover:text-white transition-colors rounded-full hover:bg-white/5"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#0d1117]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#151a20] border border-ledger-line shadow-2xl shadow-black/50 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-ledger-line bg-white/[0.02]">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-ledger-primary hover:text-ledger-primary/80 transition-colors font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-ledger-text-secondary flex flex-col items-center">
                <Bell className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-ledger-line/50">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-white/[0.02] transition-colors flex gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {getIcon(notif.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white mb-0.5 truncate">
                        {notif.title}
                      </p>
                      <p className="text-sm text-ledger-text-secondary line-clamp-2 leading-snug">
                        {notif.body}
                      </p>
                      <p className="text-xs text-ledger-text-secondary/60 mt-2">
                        {notif.sentAt ? getTimeAgo(notif.sentAt.toDate()) : "Just now"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-ledger-line bg-white/[0.02]">
            <Link
              to={`${basePath}/notifications`}
              onClick={() => setIsOpen(false)}
              className="block w-full text-center text-sm text-ledger-primary hover:text-white transition-colors font-medium py-1"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
