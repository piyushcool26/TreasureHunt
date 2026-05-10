import { useState, useRef } from "react";
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
    if (containerRef.current) {
      gsap.from(containerRef.current, {
        opacity: 0,
        duration: 0.2,
        ease: "power2.out",
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

      {/* Static gradient orbs background */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute top-20 left-20 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: "linear-gradient(45deg, #4285F4, #34A853)",
          }}
        />
        <div
          className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{
            background: "linear-gradient(45deg, #FBBC05, #EA4335)",
          }}
        />
      </div>

      <div
        ref={containerRef}
        className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-10 relative border border-white/50"
      >
        <div>
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className="text-[#4285F4] text-4xl font-bold">G</span>
            <span className="text-[#EA4335] text-4xl font-bold">o</span>
            <span className="text-[#FBBC05] text-4xl font-bold">o</span>
            <span className="text-[#4285F4] text-4xl font-bold">g</span>
            <span className="text-[#34A853] text-4xl font-bold">l</span>
            <span className="text-[#EA4335] text-4xl font-bold">e</span>
          </div>

          <div className="text-center mb-6">
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
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            </div>

            <div>
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
            </div>

            {error && (
              <div className="text-sm text-[#EA4335] bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#4285F4] to-[#34A853] text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <>
                    ⏳ Please wait...
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
            </button>
          </form>

          <div className="text-center mt-6 text-sm">
            <span className="text-gray-600">
              {mode === "signin"
                ? "New to the hunt?"
                : "Already have an account?"}{" "}
            </span>
            <button
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
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}