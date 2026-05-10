import { motion } from "motion/react";
import { Trophy, Medal, Award } from "lucide-react";

type Row = { id: string; name: string; current_question: number };

export function Leaderboard({ rows, currentUserId }: { rows: Row[]; currentUserId?: string }) {
  // Extra safety: filter out admin users client-side (should already be filtered server-side)
  const filteredRows = rows.filter(r => r.name !== 'admin');

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 h-full relative overflow-hidden">
      {/* Header with trophy icon */}
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="text-[#FBBC05]" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
      </div>

      <div className="space-y-2">
        {filteredRows.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No players yet. Be the first!
          </p>
        )}
        {filteredRows.map((r, i) => {
          const isMe = r.id === currentUserId;
          const isTop3 = i < 3;
          const colors = [
            { bg: "#FBBC05", icon: Trophy },
            { bg: "#9AA0A6", icon: Medal },
            { bg: "#CD7F32", icon: Award },
          ];
          const topStyle = colors[i];
          const Icon = topStyle?.icon;

          return (
            <div
              key={r.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                isMe
                  ? "bg-gradient-to-r from-[#4285F4]/20 to-[#34A853]/20 border-2 border-[#4285F4] shadow-lg"
                  : isTop3
                  ? "bg-gradient-to-r from-gray-50 to-white border border-gray-200 shadow-md"
                  : "bg-[#F8F9FA] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{
                    background: isTop3 ? topStyle.bg : "#DADCE0",
                    color: "white",
                  }}
                >
                  {isTop3 && Icon ? (
                    <Icon size={16} />
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="min-w-0">
                  <span className={`text-sm font-medium truncate block ${isMe ? "text-[#4285F4]" : "text-gray-800"}`}>
                    {r.name} {isMe && "👤"}
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ml-2 ${
                  isMe
                    ? "bg-[#4285F4] text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Q{r.current_question}
              </span>
            </div>
          );
        })}
      </div>

      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335]" />
    </div>
  );
}
