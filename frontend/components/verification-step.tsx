"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Edit3,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  UserContext,
  ContextFieldKey,
  ConflictInfo,
} from "@/lib/types";
import { CONTEXT_FIELD_META as META } from "@/lib/types";

interface VerificationStepProps {
  context: UserContext;
  confidence: Record<string, number>;
  onConfirm: () => void;
  onEdit: (field: ContextFieldKey, value: string) => void;
  onResolveConflict: (conflict: ConflictInfo, chosenValue: string) => void;
}

const EDITABLE_FIELDS: ContextFieldKey[] = [
  "degree_type",
  "language_level",
  "target_country",
  "target_university",
  "target_program",
  "gpa_estimated",
];

function ConfidenceDot({ value }: { value: number }) {
  const color =
    value >= 0.8
      ? "bg-emerald-400"
      : value >= 0.5
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color}`}
      title={`${Math.round(value * 100)}% confidence`}
    />
  );
}

export function VerificationStep({
  context,
  confidence,
  onConfirm,
  onEdit,
  onResolveConflict,
}: VerificationStepProps) {
  const [editingField, setEditingField] = useState<ContextFieldKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDetails, setShowDetails] = useState(true);

  function startEdit(field: ContextFieldKey) {
    setEditingField(field);
    setEditValue(String(context[field] ?? ""));
  }

  function saveEdit() {
    if (editingField && editValue.trim()) {
      onEdit(editingField, editValue.trim());
    }
    setEditingField(null);
    setEditValue("");
  }

  const hasConflicts = context.conflicts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className="text-blue-400" />
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">
              Verify Extracted Information
            </h3>
            <p className="text-xs text-slate-400">
              Please confirm or correct the data below before proceeding
            </p>
          </div>
        </div>
        {showDetails ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4">
              {/* Conflicts first */}
              {hasConflicts && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Resolve Conflicts
                  </h4>
                  {context.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3"
                    >
                      <p className="text-sm text-amber-200">
                        {c.resolution_question}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onResolveConflict(c, c.user_value)}
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-slate-300 transition-all"
                        >
                          Use: <strong>{c.user_value}</strong>
                        </button>
                        <button
                          onClick={() => onResolveConflict(c, c.document_value)}
                          className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/30 text-slate-300 transition-all"
                        >
                          Use: <strong>{c.document_value}</strong>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Field grid */}
              <div className="grid grid-cols-2 gap-2">
                {EDITABLE_FIELDS.map((field) => {
                  const value = context[field];
                  const conf = confidence[field] ?? 0;
                  const isEditing = editingField === field;

                  return (
                    <div
                      key={field}
                      className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2.5 flex items-center gap-2 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                          {META[field].label}
                        </p>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            className="w-full bg-transparent text-sm text-white outline-none border-b border-blue-500/50"
                          />
                        ) : (
                          <p className="text-sm text-white truncate">
                            {value !== null && value !== undefined
                              ? String(value)
                              : "—"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <ConfidenceDot value={conf} />
                        <button
                          onClick={() => startEdit(field)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all"
                        >
                          <Edit3 size={10} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* File sources */}
              {context.file_sources.length > 0 && (
                <p className="text-[10px] text-slate-500">
                  Data sources: {context.file_sources.join(", ")}
                </p>
              )}

              {/* Confirm button */}
              <Button
                onClick={onConfirm}
                disabled={hasConflicts}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                {hasConflicts
                  ? "Resolve conflicts first"
                  : "Confirm & Proceed to Analysis"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
