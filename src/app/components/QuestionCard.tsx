import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, XCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

type Q = { id: number; image_url: string };

export function QuestionCard({
  question,
  onSubmit,
}: {
  question: Q;
  onSubmit: (answer: string) => Promise<boolean>;
}) {
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "wrong" | "checking">("idle");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setStatus("checking");
    const ok = await onSubmit(answer);
    if (!ok) {
      setStatus("wrong");
      setTimeout(() => setStatus("idle"), 1500);
    } else {
      setAnswer("");
      setStatus("idle");
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <div className="mb-2">
            <span className="text-xs tracking-wider uppercase text-[#4285F4]">
              Question {question.id}
            </span>
          </div>
          <h2 className="text-2xl text-gray-900 mb-6">Find the answer</h2>
          <div className="rounded-2xl overflow-hidden bg-[#F8F9FA] mb-6 aspect-video">
            <ImageWithFallback
              src={question.image_url}
              alt={`Clue for question ${question.id}`}
              className="w-full h-full object-cover"
            />
          </div>

          <form onSubmit={handle} className="space-y-3">
            <div
              className={`flex items-center gap-2 border-2 rounded-2xl px-4 py-1 transition ${
                status === "wrong"
                  ? "border-[#EA4335] bg-red-50"
                  : "border-gray-200 focus-within:border-[#4285F4] focus-within:ring-4 focus-within:ring-[#4285F4]/10"
              }`}
            >
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={status === "checking"}
                className="flex-1 py-3 bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
              />
              <AnimatePresence>
                {status === "wrong" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="text-[#EA4335]"
                  >
                    <XCircle size={20} />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={status === "checking" || !answer.trim()}
                className="px-5 py-2 bg-[#4285F4] text-white rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md transition"
              >
                <Send size={16} /> Submit
              </motion.button>
            </div>
            {status === "wrong" && (
              <p className="text-sm text-[#EA4335] flex items-center gap-1.5">
                <XCircle size={14} /> Not quite — try again.
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
