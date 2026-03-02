"use client";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen text-white ">
      <DynamicBackground />
      <Navbar />

      <main className="container mx-auto px-4 pt-32 pb-20 relative z-10 flex flex-col items-center">
        <div className="text-center max-w-2xl mb-16">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black tracking-tight mb-4"
          >
            Invest €7. Save €75.
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg"
          >
            Don't let formal errors ruin your German admission chances. Choose
            the plan that secures your future.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* Freemium Tier */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-panel p-8 rounded-3xl border border-white/5 flex flex-col"
          >
            <h3 className="text-xl font-bold text-slate-300 mb-2">
              Guest Check
            </h3>
            <div className="text-4xl font-black mb-6">€0</div>
            <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-400">
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> 1
                Free Document Check
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />{" "}
                Basic Text-Prompt Analysis
              </li>
              <li className="flex gap-3 items-start opacity-50">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" /> Limited
                Output Details
              </li>
              <li className="flex gap-3 items-start opacity-50">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" /> No PDF
                Uploads
              </li>
            </ul>
            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/10 hover:bg-white/10"
              onClick={() => router.push("/check")}
            >
              Try Free
            </Button>
          </motion.div>

          {/* Pro Tier (Highlighted) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-panel p-8 rounded-3xl border border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.2)] flex flex-col relative transform md:-translate-y-4 bg-blue-900/10"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase flex items-center gap-1">
              <Zap className="w-3 h-3" /> Most Popular
            </div>
            <h3 className="text-xl font-bold text-blue-400 mb-2">
              UNIMATE PRO
            </h3>
            <div className="text-5xl font-black mb-1">
              €7 <span className="text-lg text-slate-500 font-normal">/mo</span>
            </div>
            <p className="text-xs text-blue-300/70 mb-6">Cancel anytime.</p>
            <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-200">
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" /> 10
                Deep-Scans per month
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />{" "}
                Direct PDF/Document Uploads
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />{" "}
                Detailed Error & Gap Reports
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />{" "}
                Anabin Recognition Verification
              </li>
            </ul>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg h-12"
              onClick={() => router.push("/login")}
            >
              Upgrade to Pro
            </Button>
          </motion.div>

          {/* Business Tier */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-8 rounded-3xl border border-white/5 flex flex-col"
          >
            <h3 className="text-xl font-bold text-slate-300 mb-2">
              Business Suite
            </h3>
            <div className="text-4xl font-black mb-6">Custom</div>
            <ul className="space-y-4 mb-8 flex-1 text-sm text-slate-400">
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-slate-300 shrink-0" />{" "}
                Unlimited Scans
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-slate-300 shrink-0" /> API
                Access & Integration
              </li>
              <li className="flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-slate-300 shrink-0" />{" "}
                Agency / Consultant Licensing
              </li>
            </ul>
            <a
              href="mailto:business@unimate.ai?subject=Business Suite Inquiry"
              className="w-full"
            >
              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10"
              >
                Contact Sales
              </Button>
            </a>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
