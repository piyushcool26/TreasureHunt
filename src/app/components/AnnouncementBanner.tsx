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
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="relative overflow-hidden"
        >
          {/* Static background gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #FBBC05 0%, #F4B400 50%, #FBBC05 100%)" }} />

          <div className="relative z-10 px-6 py-4 flex items-center gap-4">
            <div className="flex-shrink-0">
              <Megaphone size={28} className="text-white drop-shadow-lg" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white/90 uppercase tracking-wider">
                  📢 Announcement
                </span>
              </div>
              <p className="text-base font-semibold text-white drop-shadow-md">
                {announcement.message}
              </p>
            </div>

            <div className="flex-shrink-0 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
              <span className="text-xs font-medium text-white">
                {new Date(announcement.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
