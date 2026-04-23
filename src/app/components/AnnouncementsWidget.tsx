import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X } from "lucide-react";
import { useState } from "react";

type Announcement = { id: string; message: string; created_at: string; is_active: boolean };

export function AnnouncementsWidget({ announcements }: { announcements: Announcement[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeAnnouncements = announcements.filter((a) => a.is_active);

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#FBBC05] to-[#F4B400] rounded-full shadow-2xl flex items-center justify-center z-40"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Megaphone className="text-white" size={28} />
        </motion.div>
        {activeAnnouncements.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
          >
            {activeAnnouncements.length}
          </motion.div>
        )}
      </motion.button>

      {/* Expanded Panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 overflow-hidden"
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#FBBC05] to-[#F4B400] px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Megaphone className="text-white" size={28} />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Announcements</h2>
                      <p className="text-white/80 text-sm">
                        {activeAnnouncements.length} active message{activeAnnouncements.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsExpanded(false)}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
                  >
                    <X className="text-white" size={20} />
                  </motion.button>
                </div>

                {/* Announcements List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeAnnouncements.map((ann, i) => (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-gradient-to-br from-[#FBBC05]/10 to-[#F4B400]/5 border-2 border-[#FBBC05]/30 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FBBC05]/20 flex items-center justify-center flex-shrink-0">
                          <Megaphone className="text-[#FBBC05]" size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 font-medium mb-2">{ann.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(ann.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
                    Stay updated with the latest hints and announcements
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
