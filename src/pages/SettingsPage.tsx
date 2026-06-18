import React, { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { updateNotificationPreferences, requestNotificationPermission } from "../services/notificationService";
import type { NotificationPreferences } from "../types/user";
import { Bell, BellOff } from "lucide-react";

interface SettingsPageProps {
  basePath: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ basePath }) => {
  const { ledgerUser } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: false,
    ipoAlerts: false,
    settlementAlerts: false,
    adminAlerts: false,
  });
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(Notification.permission === "granted");

  useEffect(() => {
    if (ledgerUser?.notifications) {
      setPreferences(ledgerUser.notifications);
    }
  }, [ledgerUser]);

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!ledgerUser) return;
    setLoading(true);
    
    if (preferences.enabled && Notification.permission !== "granted") {
      const granted = await requestNotificationPermission(ledgerUser.uid);
      setPermissionGranted(granted);
      if (!granted) {
        alert("Please enable notification permissions in your browser to receive alerts.");
        setLoading(false);
        return;
      }
    }

    const success = await updateNotificationPreferences(ledgerUser.uid, preferences);
    if (success) {
      alert("Settings saved successfully.");
    } else {
      alert("Failed to save settings.");
    }
    setLoading(false);
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your preferences">
      <div className="flex flex-col h-full max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">Manage your account and application preferences.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              {preferences.enabled ? <Bell className="w-5 h-5 mr-2 text-indigo-600" /> : <BellOff className="w-5 h-5 mr-2 text-gray-400" />}
              Push Notifications
            </h2>
            <p className="text-sm text-gray-500 mt-1">Receive alerts directly to your device.</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Notifications</h3>
                <p className="text-sm text-gray-500">Master toggle for all push notifications</p>
              </div>
              <button
                type="button"
                className={`${preferences.enabled ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2`}
                role="switch"
                aria-checked={preferences.enabled}
                onClick={() => handleToggle("enabled")}
              >
                <span
                  aria-hidden="true"
                  className={`${preferences.enabled ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>

            {preferences.enabled && (
              <div className="pl-4 space-y-4 border-l-2 border-gray-100 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">IPO Alerts</h3>
                    <p className="text-sm text-gray-500">Get notified about new IPOs and application deadlines</p>
                  </div>
                  <button
                    type="button"
                    className={`${preferences.ipoAlerts ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                    onClick={() => handleToggle("ipoAlerts")}
                  >
                    <span className={`${preferences.ipoAlerts ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Settlement Alerts</h3>
                    <p className="text-sm text-gray-500">Updates on fund settlements and transfers</p>
                  </div>
                  <button
                    type="button"
                    className={`${preferences.settlementAlerts ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                    onClick={() => handleToggle("settlementAlerts")}
                  >
                    <span className={`${preferences.settlementAlerts ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Admin Alerts</h3>
                    <p className="text-sm text-gray-500">Important system updates and account changes</p>
                  </div>
                  <button
                    type="button"
                    className={`${preferences.adminAlerts ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
                    onClick={() => handleToggle("adminAlerts")}
                  >
                    <span className={`${preferences.adminAlerts ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="p-6 bg-gray-50 flex justify-end">
             <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
             >
                {loading ? "Saving..." : "Save Settings"}
             </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
