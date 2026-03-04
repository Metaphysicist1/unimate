"use client"; // ← CRITICAL

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Zap } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AnimatedHero({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
        <Zap className="w-3 h-3 animate-pulse" /> Agentic Analysis 2026
      </div>

      <h1 className="text-7xl lg:text-8xl font-black italic tracking-tighter leading-[0.9] text-white">
        UNI<span className="text-blue-500">MATE</span>
      </h1>

      <p className="text-slate-400 text-xl max-w-md leading-relaxed border-l-2 border-blue-500/30 pl-6">
        Your documents are analyzed by our{" "}
        <span className="text-white font-medium">Agentic Engine</span> to
        guarantee zero formal rejections.
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => router.push("/check")}
          className="group relative px-8 py-4 bg-blue-600 rounded-2xl font-bold text-white overflow-hidden transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:bg-blue-500"
        >
          <span className="relative z-10">START FREE SCAN</span>
          <ArrowRight className="relative z-10 w-5 h-5" />
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </button>
      </div>
    </motion.div>
  );
}
