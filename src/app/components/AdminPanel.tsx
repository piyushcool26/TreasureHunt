import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Megaphone, RotateCcw, AlertTriangle, Trash2, Edit2, Power, PowerOff, Calendar } from "lucide-react";
import { apiFetch } from "../lib/supabase";
import { AnswerManagement } from "./AnswerManagement";

type Announcement = { id: string; message: string; created_at: string; is_active: boolean };

export function AdminPanel({
  token,
  announcements,
  onRefresh,
}: {
  token: string;
  announcements: Announcement[];
  onRefresh: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState(0);
  const [loadingRound, setLoadingRound] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingRound, setPendingRound] = useState<number | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    loadActiveRound();
  }, []);

  async function loadActiveRound() {
    try {
      const data = await apiFetch("/admin/round", {}, token);
      setActiveRound(data.active_round_number ?? 0);
    } catch (e) {
      console.error("Failed to load active round:", e);
    }
  }

  function requestRoundChange(roundNumber: number) {
    setPendingRound(roundNumber);
    setShowPasswordPrompt(true);
    setAdminPassword("");
    setPasswordError("");
  }

  async function confirmRoundChange() {
    if (!adminPassword.trim()) {
      setPasswordError("Password is required");
      return;
    }

    setLoadingRound(true);
    setPasswordError("");

    try {
      await apiFetch(
        "/admin/round",
        {
          method: "PUT",
          body: JSON.stringify({
            round_number: pendingRound,
            admin_password: adminPassword
          }),
        },
        token
      );
      setActiveRound(pendingRound!);
      setShowPasswordPrompt(false);
      setAdminPassword("");
      setPendingRound(null);
      onRefresh();
    } catch (e) {
      console.error("Failed to update active round:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      if (errorMsg.includes("Invalid password") || errorMsg.includes("Unauthorized")) {
        setPasswordError("Invalid admin password");
      } else {
        setPasswordError("Failed to update round: " + errorMsg);
      }
    } finally {
      setLoadingRound(false);
    }
  }

  function cancelRoundChange() {
    setShowPasswordPrompt(false);
    setAdminPassword("");
    setPendingRound(null);
    setPasswordError("");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      await apiFetch(
        "/announcements",
        { method: "POST", body: JSON.stringify({ message }) },
        token,
      );
      setMessage("");
      onRefresh();
    } catch (err: any) {
      console.error("Announcement post error:", err);
      setError(err.message || "Failed to post announcement.");
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await apiFetch(
        "/admin/reset",
        { method: "POST" },
        token,
      );
      setShowResetConfirm(false);
      onRefresh();
      alert("✅ All user progress has been reset successfully! New round started.");
    } catch (err: any) {
      console.error("Reset error:", err);
      alert("Failed to reset user progress: " + (err.message || "Unknown error"));
    } finally {
      setResetting(false);
    }
  }

  async function toggleActive(ann: Announcement) {
    try {
      await apiFetch(
        "/announcements",
        {
          method: "PUT",
          body: JSON.stringify({ id: ann.id, is_active: !ann.is_active }),
        },
        token,
      );
      onRefresh();
    } catch (err: any) {
      console.error("Toggle active error:", err);
      alert("Failed to toggle announcement: " + (err.message || "Unknown error"));
    }
  }

  async function reissue(ann: Announcement) {
    try {
      await apiFetch(
        "/announcements",
        { method: "POST", body: JSON.stringify({ message: ann.message }) },
        token,
      );
      onRefresh();
    } catch (err: any) {
      console.error("Reissue error:", err);
      alert("Failed to reissue announcement: " + (err.message || "Unknown error"));
    }
  }

  async function handleEdit(ann: Announcement) {
    setEditingAnn(ann);
    setEditMessage(ann.message);
  }

  async function saveEdit() {
    if (!editingAnn || !editMessage.trim()) return;
    try {
      await apiFetch(
        "/announcements",
        {
          method: "PUT",
          body: JSON.stringify({ id: editingAnn.id, message: editMessage }),
        },
        token,
      );
      setEditingAnn(null);
      setEditMessage("");
      onRefresh();
    } catch (err: any) {
      console.error("Edit error:", err);
      alert("Failed to update announcement: " + (err.message || "Unknown error"));
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiFetch(
        "/announcements",
        { method: "DELETE", body: JSON.stringify({ id }) },
        token,
      );
      setDeleteConfirmId(null);
      onRefresh();
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete announcement: " + (err.message || "Unknown error"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Password Confirmation Modal for Round Change */}
      <AnimatePresence>
        {showPasswordPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !loadingRound && cancelRoundChange()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <AlertTriangle className="text-blue-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Confirm Round Change</h3>
              </div>

              <p className="text-gray-700 mb-4">
                You are about to change the active round to:{" "}
                <strong className="text-blue-600">
                  {pendingRound === 0 ? "Empty (No round active)" : `Round ${pendingRound}`}
                </strong>
              </p>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-800 font-medium">
                  ⚠️ This will immediately change what users see. Please enter your admin password to confirm.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && adminPassword.trim() && !loadingRound) {
                      confirmRoundChange();
                    }
                  }}
                  disabled={loadingRound}
                />
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 mt-2 font-medium"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cancelRoundChange}
                  disabled={loadingRound}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmRoundChange}
                  disabled={loadingRound || !adminPassword.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingRound ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        ⏳
                      </motion.div>
                      Updating...
                    </>
                  ) : (
                    "Confirm Change"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Announcement Modal */}
      <AnimatePresence>
        {editingAnn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setEditingAnn(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <Edit2 className="text-blue-600" size={24} />
                <h3 className="text-2xl font-bold text-gray-900">Edit Announcement</h3>
              </div>

              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none resize-none mb-4"
                rows={4}
                placeholder="Announcement message..."
              />

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditingAnn(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={saveEdit}
                  disabled={!editMessage.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50"
                >
                  Save Changes
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Delete Announcement?</h3>
              </div>

              <p className="text-gray-700 mb-6">
                This will permanently delete this announcement. This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !resetting && setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Reset All Progress?</h3>
              </div>

              <p className="text-gray-700 mb-6">
                This will reset all user progress. All players will start from Question 1 again.
                <strong className="text-blue-600"> Submission history will be preserved.</strong>
              </p>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium">
                  ℹ️ Note: Submission records are never deleted - they are kept as an audit log.
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReset}
                  disabled={resetting}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        ⏳
                      </motion.div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={18} />
                      Reset All Progress
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Round Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="text-blue-600" size={24} />
              <h3 className="text-xl font-bold text-gray-900">Active Round</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Select which round is currently active. Users will see questions only for the active round. Set to "Empty" when no round should be active.
            </p>
            <div className="bg-blue-100 border-2 border-blue-200 rounded-xl p-3 mb-2">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Changing the active round requires admin password confirmation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Current:</span>
            <div className="px-4 py-2 bg-blue-100 border-2 border-blue-300 rounded-xl font-bold text-blue-700">
              {activeRound === 0 ? "Empty" : `Round ${activeRound}`}
            </div>
            <span className="text-sm font-semibold text-gray-700">Change to:</span>
            <select
              value={activeRound}
              onChange={(e) => requestRoundChange(parseInt(e.target.value))}
              disabled={loadingRound}
              className="px-4 py-2 bg-white border-2 border-blue-300 rounded-xl font-bold text-blue-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition disabled:opacity-50 cursor-pointer"
            >
              <option value={0}>Empty (No round active)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  Round {num}
                </option>
              ))}
            </select>
            {loadingRound && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-blue-600"
              >
                ⏳
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Reset Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="text-red-600" size={24} />
              <h3 className="text-xl font-bold text-gray-900">New Round</h3>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              Start a fresh treasure hunt by resetting all user progress. Everyone will restart from Question 1. Submission history is preserved as an audit log.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full text-xs font-semibold text-blue-700">
              <AlertTriangle size={14} />
              Resets progress (preserves history)
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05, rotate: -15 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowResetConfirm(true)}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition flex items-center gap-2 whitespace-nowrap"
          >
            <RotateCcw size={20} />
            Reset All
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
            >
              <Megaphone size={22} className="text-[#FBBC05]" />
            </motion.div>
            <h2 className="text-xl font-bold text-gray-900">Post an announcement</h2>
          </div>
          <form onSubmit={send} className="space-y-4">
            <motion.textarea
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a hint or update to all players..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none resize-none transition-all"
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-[#EA4335] bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3"
              >
                {error}
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(66, 133, 244, 0.3)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={sending || !message.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg font-semibold"
            >
              <Send size={18} /> {sending ? "Broadcasting..." : "Broadcast to All"}
            </motion.button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Manage Announcements</h2>
          <div className="space-y-3 max-h-[480px] overflow-auto">
            {announcements.length === 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-gray-400 text-center py-8"
              >
                No announcements yet. Post one above!
              </motion.p>
            )}
            {announcements.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`border-2 rounded-xl px-4 py-3 shadow-sm ${
                  a.is_active
                    ? "bg-gradient-to-r from-[#34A853]/10 to-[#34A853]/5 border-[#34A853]/40"
                    : "bg-gray-50 border-gray-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          a.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {a.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 font-medium">{a.message}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => toggleActive(a)}
                      className={`p-2 rounded-lg transition ${
                        a.is_active
                          ? "text-gray-600 hover:bg-gray-100"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                      title={a.is_active ? "Deactivate" : "Activate"}
                    >
                      {a.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(a)}
                      className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => reissue(a)}
                      className="p-2 rounded-lg text-[#FBBC05] hover:bg-yellow-50 transition"
                      title="Re-issue as new"
                    >
                      <Send size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirmId(a.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <AnswerManagement token={token} />
      </motion.div>
    </div>
  );
}
