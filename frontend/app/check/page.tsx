"use client";

import { motion } from "framer-motion";
import { Chat } from "@/components/ui/chat";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";
import nextConfig from "../../next.config";

console.log("API URL:", process.env.NEXT_PUBLIC_BACKEND_URL);

export default function CheckPage() {
  return (
    <div className="relative min-h-screen text-white  overflow-hidden">
      <DynamicBackground />
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-10 relative z-10 flex flex-col items-center h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl glass-panel rounded-[2rem] border border-white/10 shadow-2xl flex flex-col h-full max-h-[750px] bg-[#0f172a]/90"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 bg-white/5 shrink-0">
            <h1 className="text-lg font-bold text-white">
              Document Verification
            </h1>
          </div>

          {/* Chat Container - flex-1 forces it to fill space, min-h-0 prevents overflow */}
          <div className="flex-1 min-h-0 relative">
            <Chat
              api={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analyze`}
              placeholder="Type your prompt, upload a PDF, or fill the fields below..."
            />
          </div>
        </motion.div>
      </main>
    </div>
  );
}
