import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Trophy, Star, Sparkles, Award } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function Congrats({ name, roundNumber }: { name: string; roundNumber?: number }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple fallback UI in case of errors
  const SimpleCongrats = () => (
    <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 min-h-[400px] flex items-center justify-center">
      <div className="text-center max-w-2xl">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#FBBC05] via-[#34A853] to-[#4285F4] flex items-center justify-center shadow-2xl">
          <Trophy size={64} className="text-white" />
        </div>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] mb-4">
          Congratulations, {name}!
        </h1>
        <p className="text-2xl text-gray-700 max-w-2xl font-medium mb-3">
          🎉 You've completed all questions in Round {roundNumber || 1}! 🎉
        </p>
        <p className="text-lg text-gray-600 max-w-xl">
          Amazing work! Check the leaderboard to see where you stand. {roundNumber && roundNumber > 0 && "Stay tuned for the next round!"} 🏆
        </p>
      </div>
    </div>
  );

  useEffect(() => {
    try {
      const end = Date.now() + 5000;
      const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

      const interval = setInterval(() => {
        try {
          confetti({
            particleCount: 8,
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 0.8 },
            colors,
            ticks: 200,
            gravity: 1.2,
            scalar: 1.2,
          });
          confetti({
            particleCount: 8,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 0.8 },
            colors,
            ticks: 200,
            gravity: 1.2,
            scalar: 1.2,
          });
          confetti({
            particleCount: 5,
            angle: 90,
            spread: 100,
            origin: { x: 0.5, y: 0.5 },
            colors,
            shapes: ["star"],
            scalar: 1.5,
          });
        } catch (error) {
          console.error("Error in confetti animation:", error);
        }
      }, 400);

      setTimeout(() => clearInterval(interval), end - Date.now());

      return () => clearInterval(interval);
    } catch (error) {
      console.error("Error setting up confetti:", error);
    }
  }, []);

  useGSAP(() => {
    try {
      if (titleRef.current) {
        const text = titleRef.current.textContent || "";
        titleRef.current.innerHTML = text
          .split("")
          .map((char) => `<span class="inline-block">${char === " " ? "&nbsp;" : char}</span>`)
          .join("");

        const chars = titleRef.current.querySelectorAll("span");

        gsap.fromTo(chars,
          {
            y: -50,
            opacity: 0,
            scale: 0.3,
            rotation: 180,
          },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotation: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.8)",
            stagger: 0.05,
          }
        );
      }
    } catch (error) {
      console.error("Error in title animation:", error);
    }
  }, []);

  // Use try-catch to provide fallback
  try {
    return (
      <div ref={containerRef} className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 min-h-[400px]">
      {/* Floating celebration elements */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            opacity: 0,
          }}
          animate={{
            y: [null, -100],
            opacity: [0, 1, 0],
            rotate: [0, 360],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        >
          {i % 4 === 0 ? (
            <Star size={20} className="text-[#FBBC05]" />
          ) : i % 4 === 1 ? (
            <Sparkles size={20} className="text-[#4285F4]" />
          ) : i % 4 === 2 ? (
            <Trophy size={20} className="text-[#34A853]" />
          ) : (
            <Award size={20} className="text-[#EA4335]" />
          )}
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center text-center py-20 px-6 relative z-10"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity } }}
            className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FBBC05] via-[#34A853] to-[#4285F4] flex items-center justify-center shadow-2xl"
          >
            <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center">
              <Trophy size={64} className="text-[#FBBC05]" />
            </div>
          </motion.div>

          {/* Orbiting stars */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
              }}
              animate={{
                rotate: [0, 360],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.25,
              }}
            >
              <div
                style={{
                  transform: `translateX(${60 + i * 10}px) translateY(-50%)`,
                }}
              >
                <Star size={16} className="text-[#FBBC05]" fill="#FBBC05" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <h1
          ref={titleRef}
          className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] mb-4"
        >
          Congratulations, {name}!
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="text-2xl text-gray-700 max-w-2xl font-medium"
        >
          🎉 You've completed all questions in Round {roundNumber || 1}! 🎉
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="text-lg text-gray-600 max-w-xl mt-3"
        >
          Amazing work! Check the leaderboard to see where you stand. {roundNumber && roundNumber > 0 && "Stay tuned for the next round!"} 🏆
        </motion.p>
      </motion.div>
    </div>
    );
  } catch (error) {
    console.error("Error rendering Congrats component:", error);
    return <SimpleCongrats />;
  }
}
