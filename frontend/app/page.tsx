"use client";

import React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

// Dynamic imports — already perfect
const CosmicBackground = dynamic(
  () => import("@/components/CosmicBackground"),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-zinc-950" />,
  },
);

const AnimatedHero = dynamic(() => import("@/components/AnimatedHero"), {
  ssr: false,
  loading: () => <div className="space-y-8 h-[400px]" />,
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-white selection:bg-blue-500/40 overflow-hidden">
      <CosmicBackground />
      <Navbar />
      <AnimatedHero>
        <main className="relative z-10 container mx-auto px-6 min-h-screen flex items-center pt-20 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <div className="hidden lg:block" />
            {/* ← Put your left-side content here later */}
          </div>
        </main>
      </AnimatedHero>
    </div>
  );
}
