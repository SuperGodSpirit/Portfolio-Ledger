import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";
import { notificationSender } from "../../services/notificationSender";
import type { NotificationHistoryItem, TargetType } from "../../types/notification";
import Button from "../ui/Button";

const NotificationsTab = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("broadcast");
  const [targets, setTargets] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [resendTarget, setResendTarget] = useState<NotificationHistoryItem | null>(null);
  const [resending, setResending] = useState(false);

  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, "notifications"), orderBy("sentAt", "desc"), limit(20));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as NotificationHistoryItem[];
      setHistory(data);
    } catch (error) {
      console.error("Failed to fetch notification history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setMessage({ type: "error", text: "Title and body are required." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const targetList = targets.split(",").map((t) => t.trim()).filter(Boolean);

      if (targetType === "broadcast") {
        await notificationSender.sendBroadcast(title, body);
      } else if (targetType === "role") {
        if (!targetList.length) throw new Error("Please specify at least one role");
        await notificationSender.sendToRole(targetList, title, body);
      } else if (targetType === "portfolio") {
        if (!targetList.length) throw new Error("Please specify at least one portfolio ID");
        await notificationSender.sendToPortfolio(targetList, title, body);
      } else if (targetType === "users") {
        if (!targetList.length) throw new Error("Please specify at least one user UID");
        await notificationSender.sendToUsers(targetList, title, body);
      }

      setMessage({ type: "success", text: "Notification sent successfully!" });
      setTitle("");
      setBody("");
      setTargets("");
      fetchHistory(); // Refresh history
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to send notification" });
    } finally {
      setLoading(false);
    }
  };

  const executeResend = async () => {
    if (!resendTarget) return;
    setResending(true);
    try {
      const payload = resendTarget.targets || [];
      if (resendTarget.targetType === "broadcast") {
        await notificationSender.sendBroadcast(resendTarget.title, resendTarget.body, resendTarget.category);
      } else if (resendTarget.targetType === "role") {
        await notificationSender.sendToRole(payload, resendTarget.title, resendTarget.body, resendTarget.category);
      } else if (resendTarget.targetType === "portfolio") {
        await notificationSender.sendToPortfolio(payload, resendTarget.title, resendTarget.body, resendTarget.category);
      } else if (resendTarget.targetType === "users") {
        await notificationSender.sendToUsers(payload, resendTarget.title, resendTarget.body, resendTarget.category);
      }
      setMessage({ type: "success", text: "Notification resent successfully!" });
      fetchHistory();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to resend notification" });
    } finally {
      setResending(false);
      setResendTarget(null);
    }
  };

  return (
    <div className="space-y-12 relative">
      {resendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#151a20] border border-ledger-line rounded-lg w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-white mb-2">Confirm Resend</h3>
            <p className="text-[#8793a3] text-sm mb-6">
              Are you sure you want to resend "<span className="text-white">{resendTarget.title}</span>" to {resendTarget.recipientCount} original targets?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setResendTarget(null)} disabled={resending}>Cancel</Button>
              <Button variant="primary" onClick={executeResend} disabled={resending}>
                {resending ? "Sending..." : "Yes, Resend"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <section>
        <h3 className="text-lg font-medium text-white mb-1">Send Manual Notification</h3>
        <p className="text-xs text-ledger-amber/90 mb-4 bg-ledger-amber/5 border border-ledger-amber/20 p-2 rounded">
          <strong>Important:</strong> Use informational language and avoid investment recommendations, endorsements, or solicitation-style messaging.
        </p>
        
        {message && (
          <div className={`p-4 mb-4 rounded-md ${message.type === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-[#8793a3] mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#151a20] border border-ledger-line rounded px-3 py-2 text-white focus:outline-none focus:border-ledger-primary"
              placeholder="e.g., New Market IPO Added"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8793a3] mb-1">Message Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-[#151a20] border border-ledger-line rounded px-3 py-2 text-white h-24 focus:outline-none focus:border-ledger-primary"
              placeholder="e.g., A new IPO has been added to the market feed for your tracking."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#8793a3] mb-1">Target Type</label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as TargetType)}
              className="w-full bg-[#151a20] border border-ledger-line rounded px-3 py-2 text-white focus:outline-none focus:border-ledger-primary"
            >
              <option value="broadcast">All Users (Broadcast)</option>
              <option value="role">Specific Roles</option>
              <option value="portfolio">Specific Portfolios</option>
              <option value="users">Specific Users (UIDs)</option>
            </select>
          </div>

          {targetType !== "broadcast" && (
            <div>
              <label className="block text-sm font-medium text-[#8793a3] mb-1">
                Targets <span className="text-xs text-gray-500">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={targets}
                onChange={(e) => setTargets(e.target.value)}
                className="w-full bg-[#151a20] border border-ledger-line rounded px-3 py-2 text-white focus:outline-none focus:border-ledger-primary"
                placeholder={
                  targetType === "role" ? "e.g., owner, manager, viewer" :
                  targetType === "portfolio" ? "e.g., portfolioAlpha" : "e.g., uid1, uid2"
                }
                required
              />
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Sending..." : "Send Notification"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="text-lg font-medium text-white mb-4">Notification History</h3>
        {loadingHistory ? (
          <p className="text-[#8793a3]">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="text-[#8793a3]">No notifications have been sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#151a20] text-[#8793a3]">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-md">Date</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Recipients</th>
                  <th className="px-4 py-3 font-medium">Sender</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-md">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ledger-line text-white">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-[#151a20]/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.sentAt?.toDate ? item.sentAt.toDate().toLocaleString() : "Just now"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[200px]" title={item.title}>{item.title}</div>
                      <div className="text-xs text-[#8793a3] truncate max-w-[200px]" title={item.body}>{item.body}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="capitalize">{item.targetType}</span>
                      {item.targets && item.targets.length > 0 && (
                        <span className="text-xs text-[#8793a3] ml-1">({item.targets.length} targets)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{item.recipientCount} Targets</div>
                      {(item.successCount !== undefined) && (
                        <div className="text-xs text-[#8793a3]">
                          <span className="text-green-400">{item.successCount} OK</span>
                          {item.failureCount > 0 && <span className="text-red-400 ml-2">{item.failureCount} Fail</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[#8793a3]">{item.sentByName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "success" ? "bg-green-500/10 text-green-400" :
                        item.status === "partial" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-red-500/10 text-red-400"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button 
                        onClick={() => setResendTarget(item)} 
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        Resend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default NotificationsTab;
