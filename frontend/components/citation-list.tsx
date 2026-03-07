"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Clock } from "lucide-react";
import type { Citation } from "@/lib/types";

interface CitationListProps {
  citations: Citation[];
}

function formatTimestamp(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function CitationList({ citations }: CitationListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!citations.length) return null;

  const visible = expanded ? citations : citations.slice(0, 2);

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 mb-2 hover:text-cyan-300 transition-colors"
      >
        <BookOpen size={11} />
        <span>
          {citations.length} cited {citations.length === 1 ? "source" : "sources"}
        </span>
        {citations.length > 2 && (
          expanded
            ? <ChevronUp size={11} />
            : <ChevronDown size={11} />
        )}
      </button>

      <AnimatePresence initial={false}>
        <div className="space-y-1.5">
          {visible.map((c, i) => (
            <motion.div
              key={`${c.source_url}-${i}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-2 text-[11px]"
            >
              <p className="text-slate-300 leading-relaxed">{c.fact}</p>
              <div className="flex items-center gap-3 mt-1.5">
                {c.source_url && (
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors truncate max-w-[200px]"
                  >
                    <ExternalLink size={9} className="shrink-0" />
                    <span className="truncate">{c.source_title || c.source_url}</span>
                  </a>
                )}
                {c.last_verified && (
                  <span className="flex items-center gap-1 text-slate-600 shrink-0">
                    <Clock size={9} />
                    {formatTimestamp(c.last_verified)}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
