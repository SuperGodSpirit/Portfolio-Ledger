import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { requestNotificationPermission } from "../../services/notificationService";

const NotificationPromptCard: React.FC = () => {
  const { ledgerUser } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only show the card if notifications are supported, not already granted, and the user hasn't explicitly disabled them in settings
    if (
      "Notification" in window &&
      Notification.permission !== "granted" &&
      Notification.permission !== "denied" &&
      ledgerUser?.notifications?.enabled !== false
    ) {
      setIsVisible(true);
    }
  }, [ledgerUser]);

  const handleEnable = async () => {
    if (!ledgerUser) return;
    setLoading(true);
    const granted = await requestNotificationPermission(ledgerUser.uid);
    setLoading(false);
    if (granted) {
      setIsVisible(false);
    } else {
      alert("Please enable notification permissions in your browser to receive alerts.");
      setIsVisible(false); // Hide the card if they denied or it failed, so it's not annoying
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-full flex-shrink-0">
          <Bell className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Enable Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get IPO alerts, settlement reminders, and account updates directly to your device.
          </p>
        </div>
      </div>
      <button
        onClick={handleEnable}
        disabled={loading}
        className="whitespace-nowrap px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Enabling..." : "Enable Notifications"}
      </button>
    </div>
  );
};

export default NotificationPromptCard;
