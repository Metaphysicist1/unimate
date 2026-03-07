"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Upload,
  Search,
  GitCompareArrows,
  Globe,
  FileText,
} from "lucide-react";
import type { SuggestedAction } from "@/lib/types";

const ICON_MAP: Record<string, React.ElementType> = {
  ArrowRight,
  Upload,
  Search,
  GitCompare: GitCompareArrows,
  Globe,
  FileText,
};

interface NextStepButtonsProps {
  actions: SuggestedAction[];
  onAction: (intent: string) => void;
  disabled?: boolean;
}

export function NextStepButtons({
  actions,
  onAction,
  disabled = false,
}: NextStepButtonsProps) {
  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
      {actions.map((action, i) => {
        const Icon = ICON_MAP[action.icon] || ArrowRight;

        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            disabled={disabled}
            onClick={() => onAction(action.intent)}
            className="
              flex items-center gap-1.5 px-3 py-1.5
              bg-blue-500/10 hover:bg-blue-500/20
              border border-blue-500/20 hover:border-blue-500/40
              text-blue-300 hover:text-blue-200
              text-xs font-medium rounded-lg
              transition-all duration-150
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          >
            <Icon size={12} className="shrink-0" />
            <span>{action.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
