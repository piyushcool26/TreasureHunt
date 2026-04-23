import { motion, AnimatePresence } from "motion/react";
import { Megaphone, Sparkles, Bell } from "lucide-react";

type Ann = { id: string; message: string; created_at: string; is_active?: boolean };

export function AnnouncementBanner({ announcement }: { announcement: Ann | null }) {
  // Only show if announcement exists and is active
  const shouldShow = announcement && (announcement.is_active !== false);

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key={announcement.id}
          initial={{ opacity: 0, height: 0, y: -50 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden"
        >
          {/* Animated background gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #FBBC05 0%, #F4B400 50%, #FBBC05 100%)" }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, #F4B400 0%, #FBBC05 50%, #F4B400 100%)" }}
              animate={{
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />
          </div>

          {/* Sparkle effects */}
          <div className="absolute inset-0 opacity-20">
            <motion.div
              className="absolute left-[10%] top-1/2"
              animate={{ scale: [0, 1, 0], rotate: [0, 180, 360] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            >
              <Sparkles size={16} className="text-white" />
            </motion.div>
            <motion.div
              className="absolute right-[15%] top-1/2"
              animate={{ scale: [0, 1, 0], rotate: [0, -180, -360] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <Sparkles size={16} className="text-white" />
            </motion.div>
          </div>

          <div className="relative z-10 px-6 py-4 flex items-center gap-4">
            <motion.div
              animate={{
                rotate: [0, -12, 12, -12, 0],
                scale: [1, 1.1, 1.1, 1.1, 1]
              }}
              transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
              className="flex-shrink-0"
            >
              <div className="relative">
                <Megaphone size={28} className="text-white drop-shadow-lg" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Bell size={12} className="text-white" />
                </motion.div>
              </div>
            </motion.div>

            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 mb-1"
              >
                <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                  📢 Announcement
                </span>
              </motion.div>
              <motion.p
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-base font-semibold text-white drop-shadow-md"
              >
                {announcement.message}
              </motion.p>
            </div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="flex-shrink-0 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full"
            >
              <span className="text-xs font-medium text-white">
                {new Date(announcement.created_at).toLocaleTimeString()}
              </span>
            </motion.div>
          </div>

          {/* Bottom glow effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
