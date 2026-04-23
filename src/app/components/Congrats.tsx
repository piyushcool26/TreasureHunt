import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Trophy, Star, Sparkles, Award } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import * as anime from "animejs";

export function Congrats({ name }: { name: string }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const end = Date.now() + 5000;
    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#34A853"];

    const interval = setInterval(() => {
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
    }, 400);

    setTimeout(() => clearInterval(interval), end - Date.now());

    return () => clearInterval(interval);
  }, []);

  useGSAP(() => {
    if (titleRef.current) {
      const text = titleRef.current.textContent || "";
      titleRef.current.innerHTML = text
        .split("")
        .map((char) => `<span class="inline-block">${char === " " ? "&nbsp;" : char}</span>`)
        .join("");

      anime({
        targets: titleRef.current.querySelectorAll("span"),
        translateY: [-50, 0],
        opacity: [0, 1],
        scale: [0.3, 1],
        rotateZ: [180, 0],
        duration: 800,
        delay: anime.stagger(50),
        easing: "easeOutElastic(1, .8)",
      });
    }
  }, []);

  return (
    <div ref={containerRef} className="relative">
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
          🎉 You've cracked every clue in the hunt! 🎉
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="text-lg text-gray-600 max-w-xl mt-3"
        >
          Your name now shines on the leaderboard. You're a true treasure hunter! 🏆
        </motion.p>
      </motion.div>
    </div>
  );
}
