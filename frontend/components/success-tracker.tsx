"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  Lightbulb,
  Activity,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { TrackerState } from "@/lib/types";

interface SuccessTrackerProps {
  tracker: TrackerState;
}

function formatTimeSaved(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function readinessColor(score: number): string {
  if (score >= 80) return "from-emerald-500 to-emerald-400";
  if (score >= 50) return "from-blue-500 to-cyan-400";
  if (score >= 25) return "from-amber-500 to-yellow-400";
  return "from-red-500 to-orange-400";
}

function readinessLabel(score: number): string {
  if (score >= 80) return "Ready";
  if (score >= 50) return "Getting there";
  if (score >= 25) return "Needs more info";
  return "Just started";
}

const NODE_LABELS: Record<string, string> = {
  supervisor: "Evaluating...",
  extraction_agent: "Asking for details...",
  clarification_agent: "Resolving conflict...",
  researcher: "Searching web...",
  db_retriever: "Checking database...",
  strategist: "Analyzing application...",
};

export function SuccessTracker({ tracker }: SuccessTrackerProps) {
  const {
    readinessScore,
    secondsSaved,
    missingFields,
    activeNode,
    hint,
    isProcessing,
  } = tracker;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ── Readiness Score ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={12} />
            Application Readiness
          </h3>
          <span className="text-lg font-bold text-white">{readinessScore}%</span>
        </div>

        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${readinessColor(readinessScore)}`}
            initial={{ width: 0 }}
            animate={{ width: `${readinessScore}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        <p className="text-[10px] text-slate-500">{readinessLabel(readinessScore)}</p>
      </div>

      {/* ── Time Saved ── */}
      <AnimatePresence>
        {secondsSaved > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5"
          >
            <Clock size={16} className="text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">
                {formatTimeSaved(secondsSaved)} saved
              </p>
              <p className="text-[10px] text-emerald-400/70">
                by extracting data from your files
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Active Node Indicator ── */}
      <AnimatePresence>
        {isProcessing && activeNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5"
          >
            <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-300">
                {NODE_LABELS[activeNode] || activeNode}
              </p>
              {tracker.supervisorReasoning && (
                <p className="text-[10px] text-blue-400/60 truncate">
                  {tracker.supervisorReasoning}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dynamic Hint ── */}
      <AnimatePresence mode="wait">
        {hint && (
          <motion.div
            key={hint}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2.5"
          >
            <Lightbulb size={14} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-purple-200 leading-relaxed">{hint}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Missing Fields Checklist ── */}
      <div className="space-y-1.5 flex-1">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Activity size={10} />
          Profile Checklist
        </h4>

        {["country", "universities", "program", "degree_type", "language_level", "gpa_estimated"].map(
          (field) => {
            const isMissing = missingFields.includes(field);
            const label = field
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div
                key={field}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  isMissing
                    ? "text-slate-500 bg-transparent"
                    : "text-emerald-300 bg-emerald-500/10"
                }`}
              >
                {isMissing ? (
                  <AlertCircle size={12} className="text-slate-600 shrink-0" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                )}
                <span className={isMissing ? "line-through opacity-50" : "font-medium"}>
                  {label}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}
