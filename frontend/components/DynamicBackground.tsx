"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function DynamicBackground() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#020617]">
      {/* 1. Massive Ambient Glows (Spread across the corners) */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-blue-600 rounded-full blur-[150px]"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-600 rounded-full blur-[150px]"
      />

      {/* 2. Agentic Tech Grid (Adds serious, high-tech texture) */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* 3. Fast Moving Data Particles */}
      {isMounted &&
        [...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * 100 + "vw",
              y: "110vh",
              opacity: 0,
            }}
            animate={{
              y: "-10vh",
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 5 + 8, // Faster, more active
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5,
            }}
            className="absolute w-1 h-3 bg-blue-400/50 rounded-full blur-[1px]"
          />
        ))}
    </div>
  );
}
