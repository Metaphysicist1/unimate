"use client";
import { motion } from "framer-motion";

export default function AboutPage() {
  return (
    <main className="container mx-auto px-6 pt-40 pb-20 relative z-10 max-w-4xl min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-10 rounded-[2rem] border border-white/10"
      >
        <h1 className="text-5xl font-black tracking-tight mb-6">
          ℹ️ The Story Behind UniMate
        </h1>

        <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
          <p>
            Hi, I'm the creator of UniMate. As a Computer Science Master's
            student studying here in Germany, I know exactly how terrifying the
            uni-assist portal can be.
          </p>
          <p>
            When I was applying, I faced the wall of German bureaucracy alone. I
            spent weeks deciphering Anabin databases and uni-assist regulations.
            I was terrified that one unnotarized copy, one wrong translation, or
            a misunderstood credit requirement would waste my €75 application
            fee and delay my life by a full semester.
          </p>
          <p>
            After finally securing my admission, I realized that international
            students are losing thousands of euros to easily preventable formal
            errors.
          </p>
          <p className="text-blue-400 font-medium">
            That’s why I built UniMate.
          </p>
          <p>
            I used my CS background to build an Agentic AI engine that verifies
            your documents exactly like an admission officer would. My goal is
            to give you the confidence to click "Submit" without fear.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <h3 className="text-xl font-bold mb-4">📍 Contact Information</h3>
          <ul className="space-y-2 text-slate-400">
            <li>
              <strong>Headquarters:</strong> Kiel, Germany
            </li>
            <li>
              <strong>Email:</strong> support@unimate.ai
            </li>
            <li>
              <strong>Business:</strong> founders@unimate.ai
            </li>
          </ul>
        </div>
      </motion.div>
    </main>
  );
}
