import { useState } from "react";
import Button from "../ui/Button";

export default function DatabaseMaintenance() {
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!window.confirm("Run cleanup to delete notifications older than 90 days?")) {
      return;
    }

    setIsCleaning(true);
    try {
      const res = await fetch('/.netlify/functions/cleanupNotifications', { method: 'POST' });
      const data = await res.json();
      alert(data.message || "Cleanup completed");
    } catch (e) {
      alert("Cleanup failed.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-medium text-white mb-2">System Maintenance</h3>
        <p className="text-sm text-ledger-text-secondary mb-4">
          Perform database optimizations and cleanup tasks to keep the system running smoothly.
        </p>
        
        <div className="bg-[#0a0d11] border border-ledger-line rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white mb-1">Clean Old Notifications</h4>
              <p className="text-xs text-ledger-text-secondary">
                Permanently deletes all broadcast notifications older than 90 days to prevent infinite database growth.
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={handleCleanup}
              disabled={isCleaning}
              className="whitespace-nowrap"
            >
              {isCleaning ? "Running..." : "Run Cleanup"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
