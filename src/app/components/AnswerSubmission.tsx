import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, XCircle, Sparkles, AlertCircle } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type AnswerSubmissionProps = {
  currentQuestion: number;
  totalQuestions: number;
  onSubmit: (answer: string) => Promise<{ correct: boolean; rateLimited?: boolean; message?: string }>;
  questionImage?: string | null;
  roundNumber?: number;
};

export function AnswerSubmission({ currentQuestion, totalQuestions, onSubmit, questionImage, roundNumber = 1 }: AnswerSubmissionProps) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"correct" | "incorrect" | "rateLimited" | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // GSAP entrance animation
  useGSAP(() => {
    if (containerRef.current) {
      gsap.from(containerRef.current.children, {
        y: 50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
    }
  }, [currentQuestion]);

  // Animate on correct answer
  useEffect(() => {
    if (result === "correct" && containerRef.current) {
      gsap.to(containerRef.current, {
        scale: 1.02,
        duration: 0.3,
        yoyo: true,
        repeat: 1,
        ease: "power2.inOut",
      });
    }
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;

    setSubmitting(true);
    setResult(null);
    setRateLimitMessage("");

    const response = await onSubmit(answer);

    if (response.rateLimited) {
      setResult("rateLimited");
      setRateLimitMessage(response.message || "Too many submissions. Please wait.");
      setSubmitting(false);
      setTimeout(() => {
        setResult(null);
        setRateLimitMessage("");
      }, 5000);
    } else if (response.correct) {
      setResult("correct");
      setAnswer("");
      setTimeout(() => {
        setResult(null);
        setSubmitting(false);
      }, 3000);
    } else {
      setResult("incorrect");
      setSubmitting(false);
      setTimeout(() => setResult(null), 4000);
    }
  }

  const progress = ((currentQuestion - 1) / totalQuestions) * 100;

  return (
    <div ref={containerRef} className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            x: [0, 20, 0],
            y: [0, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(66, 133, 244, 0.8) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(52, 168, 83, 0.8) 0%, transparent 50%),
              radial-gradient(circle at 40% 10%, rgba(251, 188, 5, 0.8) 0%, transparent 50%),
              radial-gradient(circle at 90% 20%, rgba(234, 67, 53, 0.8) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      {/* Floating particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ["rgba(66, 133, 244, 1)", "rgba(52, 168, 83, 1)", "rgba(251, 188, 5, 1)", "rgba(234, 67, 53, 1)"][i % 4],
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      <div className="relative z-10">
        {/* Header with progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-gray-900 flex items-center gap-2"
            >
              <Sparkles className="text-[#FBBC05]" size={28} />
              Submit Answer
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-4 py-2 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-full text-sm font-semibold shadow-lg"
            >
              Round {roundNumber} - Question {currentQuestion} / {totalQuestions}
            </motion.div>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 mt-4"
          >
            Enter the answer you discovered at the desk location.
          </motion.p>
        </div>

        {/* Question Image */}
        {questionImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg"
          >
            <img
              src={questionImage}
              alt={`Question ${currentQuestion}`}
              className="w-full h-auto object-contain max-h-96"
            />
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="answer" className="block text-sm font-semibold text-gray-700 mb-2">
              Your Answer
            </label>
            <input
              ref={inputRef}
              id="answer"
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={submitting}
              className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none transition-all disabled:opacity-50 text-lg font-medium"
              autoFocus
              onFocus={() => {
                gsap.to(inputRef.current, {
                  scale: 1.02,
                  duration: 0.2,
                  ease: "power2.out",
                });
              }}
              onBlur={() => {
                gsap.to(inputRef.current, {
                  scale: 1,
                  duration: 0.2,
                  ease: "power2.out",
                });
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={`flex items-center gap-3 p-5 rounded-2xl shadow-lg ${
                  result === "correct"
                    ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-300"
                    : result === "rateLimited"
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 text-yellow-800 border-2 border-yellow-300"
                    : "bg-gradient-to-r from-red-50 to-orange-50 text-red-800 border-2 border-red-300"
                }`}
              >
                {result === "correct" ? (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6 }}
                    >
                      <CheckCircle size={28} className="text-green-600" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-lg">Excellent! That's correct! 🎉</p>
                      <p className="text-sm text-green-700">Moving to the next question...</p>
                    </div>
                  </>
                ) : result === "rateLimited" ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <AlertCircle size={28} className="text-yellow-600" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-lg">Slow down! ⏱️</p>
                      <p className="text-sm text-yellow-700">{rateLimitMessage || "Too many attempts. Wait a minute before trying again."}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: [-5, 5, -5, 5, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <XCircle size={28} className="text-red-600" />
                    </motion.div>
                    <div>
                      <p className="font-bold text-lg">Not quite right</p>
                      <p className="text-sm text-red-700">Check your desk clue and try again!</p>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            ref={buttonRef}
            type="submit"
            disabled={submitting || !answer.trim()}
            className="w-full py-4 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all relative overflow-hidden"
            onMouseEnter={() => {
              gsap.to(buttonRef.current, {
                scale: 1.03,
                boxShadow: "0 20px 40px rgba(66, 133, 244, 0.4)",
                duration: 0.3,
                ease: "power2.out",
              });
            }}
            onMouseLeave={() => {
              gsap.to(buttonRef.current, {
                scale: 1,
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                duration: 0.3,
                ease: "power2.out",
              });
            }}
          >
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6 }}
              style={{ opacity: 0.1 }}
            />
            <span className="relative z-10">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    ⏳
                  </motion.div>
                  Checking your answer...
                </span>
              ) : (
                "Submit Answer"
              )}
            </span>
          </button>
        </form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
            <p className="text-sm text-blue-900">
              <strong className="font-semibold">Remember:</strong> Questions are distributed in person at each desk location. This form is only for submitting your discovered answers.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
