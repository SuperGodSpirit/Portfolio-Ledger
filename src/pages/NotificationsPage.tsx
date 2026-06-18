import { Bell, AlertTriangle, Shield, CheckCircle, Info } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useInAppNotifications } from "../hooks/useInAppNotifications";
import type { NotificationCategory } from "../types/notification";
import Button from "../components/ui/Button";

interface NotificationsPageProps {
  basePath: string;
}

export default function NotificationsPage({ basePath }: NotificationsPageProps) {
  const { ledgerUser } = useAuth();
  // Fetch up to 100 for the full page
  const { notifications, unreadCount, markAllAsRead, localLastReadStr } = useInAppNotifications(100);

  const getIcon = (category: NotificationCategory) => {
    switch (category) {
      case "ipoAlerts":
        return <Info className="h-6 w-6 text-blue-400" />;
      case "settlementAlerts":
        return <CheckCircle className="h-6 w-6 text-green-400" />;
      case "adminAlerts":
        return <AlertTriangle className="h-6 w-6 text-amber-400" />;
      default:
        return <Shield className="h-6 w-6 text-ledger-primary" />;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <DashboardLayout
      title="Notification Center"
      subtitle="Your recent alerts and messages"
      basePath={basePath}
      headerRight={
        unreadCount > 0 ? (
          <Button onClick={markAllAsRead} variant="primary">
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      <div className="mb-6 rounded border border-ledger-amber/20 bg-ledger-amber/5 p-4">
        <p className="text-[11px] leading-relaxed text-ledger-amber/90">
          <strong>Important:</strong> Notifications and alerts are provided for convenience only. They do not constitute financial advice, and Portfolio Ledger accepts no liability for missed deadlines or inaccurate event data.
        </p>
      </div>

      <div className="bg-[#151a20] rounded-2xl border border-ledger-line shadow-xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-ledger-text-secondary">
            <div className="h-16 w-16 bg-[#0a0d11] rounded-full flex items-center justify-center border border-ledger-line mb-4">
              <Bell className="h-8 w-8 text-[#8793a3] opacity-50" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No notifications yet</h3>
            <p>You're all caught up! New alerts will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-ledger-line">
            {notifications.map((notif) => {
              const isUnread = notif.sentAt && localLastReadStr 
                ? notif.sentAt.toDate().getTime() > new Date(localLastReadStr).getTime()
                : !localLastReadStr;

              return (
                <div 
                  key={notif.id} 
                  className={`p-6 flex gap-6 hover:bg-white/[0.02] transition-colors ${
                    isUnread ? 'bg-white/[0.01]' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(notif.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h4 className={`text-lg font-medium truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-sm text-ledger-text-secondary whitespace-nowrap">
                        {notif.sentAt ? formatDateTime(notif.sentAt.toDate()) : "Just now"}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isUnread ? 'text-gray-300' : 'text-ledger-text-secondary'}`}>
                      {notif.body}
                    </p>
                    {isUnread && (
                      <span className="inline-block mt-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-ledger-primary/20 text-ledger-primary border border-ledger-primary/30">
                        New
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
