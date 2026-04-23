import { useState, useRef } from "react";
import { motion } from "motion/react";
import { supabase, apiFetch } from "../lib/supabase";
import { ParticleBackground } from "./ParticleBackground";
import { LogIn, UserPlus, Sparkles } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function Login() {
  const [mode, setMode] = useState<"signin" | "signup">(
    "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (logoRef.current) {
      gsap.from(logoRef.current.children, {
        y: -100,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "bounce.out",
      });
    }

    if (containerRef.current) {
      gsap.from(containerRef.current, {
        scale: 0.8,
        opacity: 0,
        duration: 0.6,
        ease: "back.out(1.7)",
      });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        await apiFetch("/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err.message || "Login failed");

      // Shake animation on error
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.4,
          ease: "power2.inOut",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <ParticleBackground />

      {/* Animated gradient orbs background */}
      <div className="absolute inset-0 -z-10">
        <motion.div
          className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            background:
              "linear-gradient(45deg, #4285F4, #34A853)",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-20"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          style={{
            background:
              "linear-gradient(45deg, #FBBC05, #EA4335)",
          }}
        />
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 relative overflow-hidden border border-white/50"
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-30 overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 w-[200%] h-full"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(66, 133, 244, 0.2), transparent)",
            }}
          />
        </motion.div>

        <div className="relative z-10">
          <div
            ref={logoRef}
            className="flex items-center justify-center gap-1 mb-3"
          >
            <motion.span
              className="text-[#4285F4] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: 10 }}
            >
              G
            </motion.span>
            <motion.span
              className="text-[#EA4335] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: -10 }}
            >
              o
            </motion.span>
            <motion.span
              className="text-[#FBBC05] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: 10 }}
            >
              o
            </motion.span>
            <motion.span
              className="text-[#4285F4] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: -10 }}
            >
              g
            </motion.span>
            <motion.span
              className="text-[#34A853] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: 10 }}
            >
              l
            </motion.span>
            <motion.span
              className="text-[#EA4335] text-4xl font-bold inline-block"
              whileHover={{ scale: 1.2, rotate: -10 }}
            >
              e
            </motion.span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mb-6"
          >
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] to-[#34A853] mb-2">
              Treasure Hunt
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="text-[#FBBC05]" size={16} />
              <p className="text-gray-600 text-sm font-medium">
                @google.com accounts only
              </p>
              <Sparkles className="text-[#FBBC05]" size={16} />
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@google.com"
                required
                className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none transition-all font-medium"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-5 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4285F4] focus:ring-4 focus:ring-[#4285F4]/20 outline-none transition-all font-medium"
              />
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-[#EA4335] bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{
                scale: 1.02,
                boxShadow:
                  "0 20px 40px rgba(66, 133, 244, 0.4)",
              }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-white"
                initial={{ x: "-100%" }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.6 }}
                style={{ opacity: 0.1 }}
              />
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      ⏳
                    </motion.div>
                    Please wait...
                  </>
                ) : mode === "signup" ? (
                  <>
                    <UserPlus size={20} />
                    Sign Up & Enter
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In & Start Hunt
                  </>
                )}
              </span>
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center mt-6 text-sm"
          >
            <span className="text-gray-600">
              {mode === "signin"
                ? "New to the hunt?"
                : "Already have an account?"}{" "}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setMode(
                  mode === "signin" ? "signup" : "signin",
                );
                setError(null);
              }}
              className="text-[#4285F4] hover:underline font-bold"
            >
              {mode === "signin"
                ? "Sign up now"
                : "Sign in instead"}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}