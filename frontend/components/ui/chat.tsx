"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CitationList } from "@/components/citation-list";
import { NextStepButtons } from "@/components/next-step-buttons";
import type { AgentData, UserContext } from "@/lib/types";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  data?: AgentData;
}

interface ChatProps {
  placeholder?: string;
  context?: UserContext | null;
  sessionId?: string;
  messages?: StreamMessage[];
  isStreaming?: boolean;
  onSendMessage?: (message: string) => void;
}

export function Chat({
  placeholder,
  context,
  sessionId: _sessionId,
  messages: externalMessages,
  isStreaming: externalStreaming,
  onSendMessage,
}: ChatProps) {
  const [userPrompt, setInput] = useState("");
  const [internalMessages, setInternalMessages] = useState<StreamMessage[]>([
    {
      role: "assistant",
      content: "Your profile is loaded. Ask anything about your uni-assist application.",
    },
  ]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [sessionId] = useState(() => _sessionId || crypto.randomUUID());
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = externalMessages ?? internalMessages;
  const loading = externalStreaming ?? internalLoading;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const dispatchMessage = useCallback(
    (text: string) => {
      if (onSendMessage) {
        onSendMessage(text);
      }
    },
    [onSendMessage],
  );

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = userPrompt.trim();
      if (!text || loading) return;

      setInput("");

      if (onSendMessage) {
        onSendMessage(text);
        return;
      }

      setInternalMessages((prev) => [...prev, { role: "user", content: text }]);
      setInternalLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: sessionId,
            country: context?.target_country || undefined,
            program: context?.target_program || undefined,
            universities: context?.target_university ? [context.target_university] : [],
            degree_type: context?.degree_type || undefined,
            language_level: context?.language_level || undefined,
            gpa_estimated: context?.gpa_estimated,
          }),
        });

        const json = await res.json();
        const data: AgentData | undefined = json?.data;

        setInternalMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data?.answer ?? JSON.stringify(json, null, 2),
            data,
          },
        ]);
      } catch {
        setInternalMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to reach the server. Please try again." },
        ]);
      } finally {
        setInternalLoading(false);
      }
    },
    [userPrompt, loading, onSendMessage, sessionId, context],
  );

  const handleButtonAction = useCallback(
    (intent: string) => {
      dispatchMessage(intent);
    },
    [dispatchMessage],
  );

  const isLastAssistant = (idx: number) => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i === idx;
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m, idx) => (
          <motion.div
            key={idx}
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

              {/* Citations */}
              {m.role === "assistant" && m.data?.citations?.length ? (
                <CitationList citations={m.data.citations} />
              ) : null}

              {/* Legacy source URLs (fallback) */}
              {m.role === "assistant" && !m.data?.citations?.length && m.data?.sources?.length ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-blue-400 mb-1.5">Sources</p>
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

              {/* Next steps (text) */}
              {m.role === "assistant" && m.data?.next_steps?.length ? (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-emerald-400 mb-1.5">Next Steps</p>
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

              {/* Interactive next-step buttons (only on the latest assistant message) */}
              {m.role === "assistant" &&
                isLastAssistant(idx) &&
                m.data?.suggested_actions?.length ? (
                <NextStepButtons
                  actions={m.data.suggested_actions}
                  onAction={handleButtonAction}
                  disabled={loading}
                />
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
              <span className="text-slate-400">Analyzing your case...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-md">
        <form className="max-w-3xl mx-auto flex items-center gap-2" onSubmit={handleSend}>
          <input
            id="uni-mate-input"
            name="uni-mate-message"
            value={userPrompt}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder || "Ask about your application..."}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </form>
      </div>
    </div>
  );
}
