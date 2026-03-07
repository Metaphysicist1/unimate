"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  School,
  Globe,
  GraduationCap,
  Loader2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface AgentData {
  answer: string;
  sources: string[];
  next_steps: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  data?: AgentData;
}

export function Chat({ placeholder }: { placeholder?: string }) {
  const [userPrompt, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "System Initialized. Provide your university details and describe your case to check your uni-assist application.",
    },
  ]);
  const [universities, setUniversity] = useState("");
  const [program, setProgram] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();

    const text = userPrompt.trim();
    if (!text || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: text },
    ]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          country: country || undefined,
          program: program || undefined,
          universities: universities
            ? universities.split(",").map((u) => u.trim())
            : [],
        }),
      });

      const json = await res.json();
      const data: AgentData | undefined = json?.data;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data?.answer ?? JSON.stringify(json, null, 2),
          data: data,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Failed to reach the analysis server. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-start gap-3`}
          >
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl text-sm leading-relaxed shadow-lg ${
                m.role === "user"
                  ? "bg-blue-600 text-white px-4 py-3"
                  : "glass-panel text-slate-200 border-white/5 px-4 py-3"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>

              {m.role === "assistant" && m.data?.sources?.length ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-blue-400 mb-1.5">
                    Sources
                  </p>
                  <ul className="space-y-1">
                    {m.data.sources.map((src, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <ExternalLink size={10} className="shrink-0" />
                        {src.startsWith("http") ? (
                          <a
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 transition-colors truncate"
                          >
                            {src}
                          </a>
                        ) : (
                          <span>{src}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {m.role === "assistant" && m.data?.next_steps?.length ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-emerald-400 mb-1.5">
                    Next Steps
                  </p>
                  <ul className="space-y-1">
                    {m.data.next_steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                        <ArrowRight size={10} className="mt-0.5 shrink-0 text-emerald-400" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </motion.div>
        ))}

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Bot size={16} />
            </div>
            <div className="glass-panel text-slate-200 border-white/5 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-400" />
              <span className="text-slate-400">Analyzing your case…</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* --- INPUT SECTION --- */}
      <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-md">
        <form className="max-w-3xl mx-auto space-y-3" onSubmit={handleSend}>
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="University"
                value={universities}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="Program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <input
              id="uni-mate-input"
              name="uni-mate-message"
              value={userPrompt}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder || "Ask or describe your case..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
            />

            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
