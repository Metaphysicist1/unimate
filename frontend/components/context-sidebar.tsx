"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Languages,
  Globe,
  School,
  BookOpen,
  BarChart3,
  Check,
  AlertTriangle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import type { ContextChipData, ContextFieldKey, ConflictInfo } from "@/lib/types";

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap,
  Languages,
  Globe,
  School,
  BookOpen,
  BarChart3,
};

const STATUS_STYLES: Record<ContextChipData["status"], string> = {
  empty: "border-white/10 bg-white/[0.02] text-slate-500",
  detected: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  conflict: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

function StatusIndicator({ status }: { status: ContextChipData["status"] }) {
  switch (status) {
    case "confirmed":
      return <Check size={12} className="text-emerald-400" />;
    case "conflict":
      return <AlertTriangle size={12} className="text-amber-400" />;
    case "detected":
      return (
        <div className="w-3 h-3 rounded-full border-2 border-blue-400 bg-blue-400/30" />
      );
    default:
      return <HelpCircle size={12} className="text-slate-600" />;
  }
}

interface ContextChipProps {
  chip: ContextChipData;
  onEdit?: (field: ContextFieldKey) => void;
}

function ContextChip({ chip, onEdit }: ContextChipProps) {
  const Icon = ICON_MAP[chip.icon] || HelpCircle;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onEdit?.(chip.field)}
      className={`
        flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl border transition-all duration-200
        hover:brightness-110 text-left group
        ${STATUS_STYLES[chip.status]}
      `}
    >
      <Icon size={16} className="shrink-0 opacity-70" />

      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-medium opacity-60">
          {chip.label}
        </p>
        <p className="text-sm font-medium truncate">
          {chip.value !== null && chip.value !== undefined
            ? String(chip.value)
            : "—"}
        </p>
      </div>

      <StatusIndicator status={chip.status} />
    </motion.button>
  );
}

interface ContextSidebarProps {
  chips: ContextChipData[];
  conflicts: ConflictInfo[];
  followUpQuestions: string[];
  isExtracting: boolean;
  extractionStatus: string;
  onEditChip?: (field: ContextFieldKey) => void;
  onAskFollowUp?: (question: string) => void;
}

export function ContextSidebar({
  chips,
  conflicts,
  followUpQuestions,
  isExtracting,
  extractionStatus,
  onEditChip,
  onAskFollowUp,
}: ContextSidebarProps) {
  const filled = chips.filter((c) => c.status !== "empty").length;
  const total = chips.length;
  const progress = total > 0 ? (filled / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Detected Context
          </h3>
          {isExtracting && (
            <Loader2 size={12} className="animate-spin text-blue-400" />
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-slate-500">
          {filled}/{total} fields identified
        </p>
      </div>

      {/* Chips */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {chips.map((chip) => (
            <ContextChip key={chip.field} chip={chip} onEdit={onEditChip} />
          ))}
        </AnimatePresence>
      </div>

      {/* Conflicts */}
      <AnimatePresence>
        {conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <h4 className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} />
              Conflicts Found
            </h4>
            {conflicts.map((c, i) => (
              <div
                key={i}
                className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-200"
              >
                <p className="font-medium">{c.resolution_question}</p>
                <div className="flex gap-2 mt-1.5 text-[10px]">
                  <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">
                    You said: {c.user_value}
                  </span>
                  <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">
                    Document: {c.document_value}
                  </span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow-up questions */}
      <AnimatePresence>
        {followUpQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              Missing Info
            </h4>
            {followUpQuestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => onAskFollowUp?.(q)}
                className="w-full text-left text-xs text-slate-400 hover:text-blue-300 bg-white/[0.02] hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20 rounded-lg px-3 py-2 transition-all"
              >
                {q}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
