"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight } from "lucide-react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

// Dynamic import with NO server-side rendering (this is the fix!)
const CosmicBackground = dynamic(
  () => import("@/components/CosmicBackground"),
  {
    ssr: false, // ← THIS STOPS THE ERROR
    loading: () => <div className="absolute inset-0 bg-zinc-950" />, // optional nice placeholder
  },
);

const AnimatedHero = dynamic(() => import("@/components/AnimatedHero"), {
  ssr: false, // ← this is the magic line
  loading: () => <div className="space-y-8 h-[400px]" />, // optional skeleton
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-white selection:bg-blue-500/40 overflow-hidden">
      {/* 3D COSMIC BACKGROUND — now safely client-only */}
      <CosmicBackground />

      <Navbar />
      <AnimatedHero>
        <main className="relative z-10 container mx-auto px-6 min-h-screen flex items-center pt-20 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <div className="hidden lg:block" />
          </div>
        </main>
      </AnimatedHero>
    </div>
  );
}
