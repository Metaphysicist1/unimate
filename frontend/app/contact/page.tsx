"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  return (
    <main className="container mx-auto px-6 pt-40 pb-20 relative z-10 max-w-3xl min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-10 rounded-[2rem] border border-white/10"
      >
        <h1 className="text-4xl font-black tracking-tight mb-2">✉️ Write Us</h1>
        <p className="text-slate-400 mb-8">
          Have a specific question about your documents or our Pro tier? Drop us
          a message.
        </p>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Subject
            </label>
            <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
              <option className="bg-slate-900">General Inquiry</option>
              <option className="bg-slate-900">Pro Upgrade Question</option>
              <option className="bg-slate-900">Partnership / Business</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Message
            </label>
            <textarea
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="How can we help you?"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl"
          >
            Send Message
          </Button>
        </form>
      </motion.div>
    </main>
  );
}
