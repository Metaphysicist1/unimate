"use client";
import { motion } from "framer-motion";

export default function StoriesPage() {
  const stories = [
    {
      title: "Saved from a €75 Rejection",
      uni: "RWTH Aachen",
      tag: "Missing ECTS",
      excerpt:
        "I thought my transcript was perfect. UniMate caught a missing module description that would have caused an instant rejection.",
    },
    {
      title: "Fast-tracked to TUM",
      uni: "TU Munich",
      tag: "Anabin Check",
      excerpt:
        "I wasn't sure if my Bachelor's from my home country was H+ recognized. UniMate verified it in 30 seconds.",
    },
  ];

  return (
    <main className="container mx-auto px-6 pt-40 pb-20 relative z-10 max-w-6xl min-h-screen">
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-5xl font-black tracking-tight mb-4"
      >
        📖 Real Stories
      </motion.h1>
      <p className="text-slate-400 text-lg mb-12">
        See how UniMate is helping students secure their German education.
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {stories.map((story, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-8 rounded-3xl border border-white/10 hover:border-blue-500/50 transition-colors cursor-pointer"
          >
            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
              {story.tag} // {story.uni}
            </div>
            <h3 className="text-2xl font-bold mb-4">{story.title}</h3>
            <p className="text-slate-400">{story.excerpt}</p>
            <button className="mt-6 text-sm font-bold text-white hover:text-blue-400 transition-colors">
              Read full story →
            </button>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
