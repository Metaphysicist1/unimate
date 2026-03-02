"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Chat } from "@/components/ui/chat";
import { ShieldCheck, Zap, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen text-white selection:bg-blue-500/40 ">
      <DynamicBackground />
      <Navbar />

      {/* FIX 2: Increased padding-top (pt-40) to push content down away from the Navbar */}
      <main className="container mx-auto px-6 pt-40 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <Zap className="w-3 h-3 animate-pulse" /> Agentic Analysis 2026
            </div>

            {/* FIX 3: Explicitly forced text-white so "UNI" is visible */}
            <h1 className="text-7xl lg:text-8xl font-black italic tracking-tighter leading-[0.9] text-white">
              UNI<span className="text-blue-500">MATE.</span>
            </h1>

            <p className="text-slate-400 text-xl max-w-md leading-relaxed border-l-2 border-blue-500/30 pl-6">
              Your documents are analyzed by our{" "}
              <span className="text-white font-medium">Agentic Engine</span> to
              guarantee zero formal rejections.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => router.push("/check")}
                className="group relative px-8 py-4 bg-blue-600 rounded-2xl font-bold text-white overflow-hidden transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                <span className="relative z-10">START FREE SCAN</span>
                <ArrowRight className="relative z-10 w-5 h-5" />
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </button>
            </div>
          </motion.div>

          {/* FIX 1: Removed `whileHover={{ y: -5 }}` so the chat window stays perfectly still */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "circOut" }}
            className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-15 group-hover:opacity-30 transition duration-1000" />

            <div className="relative glass-panel rounded-[3rem] h-[600px] border-white/10 shadow-2xl overflow-hidden flex flex-col bg-[#0f172a]/80">
              <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <span className="text-sm font-semibold tracking-wide flex items-center gap-2 text-white">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  SYSTEM_ACTIVE // UNIMATE
                </span>
                <ShieldCheck className="w-4 h-4 text-slate-500" />
              </div>

              <div className="flex-1 relative">
                {/* Optional: Kept the scanline inside the chat, but you can remove it if it's distracting */}
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 blur-sm animate-scanline z-20 pointer-events-none" />
                <Chat
                  api={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analyze`}
                  placeholder="IELTS 6.5, GPA in German System 2.3, Will I get addmitted? "
                />
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
