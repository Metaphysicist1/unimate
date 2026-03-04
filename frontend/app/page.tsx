"use client";

import React from "react";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

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
      <main className="relative z-10 container mx-auto px-6 min-h-screen flex items-center justify-center pt-20 pb-20">
        <AnimatedHero />
      </main>
    </div>
  );
}
