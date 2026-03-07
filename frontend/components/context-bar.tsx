"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface ContextBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isExtracting: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ContextBar({
  value,
  onChange,
  onSubmit,
  isExtracting,
  disabled = false,
  placeholder = "Describe your situation — what degree, where, your documents, language level, anything relevant...",
}: ContextBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="relative group">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

      <div className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm focus-within:border-blue-500/40 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          className="w-full bg-transparent text-white text-sm leading-relaxed px-4 pt-4 pb-12 resize-none outline-none placeholder:text-slate-500 disabled:opacity-50"
        />

        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {isExtracting ? (
              <>
                <Loader2 size={12} className="animate-spin text-blue-400" />
                <span className="text-blue-400">Analyzing your input...</span>
              </>
            ) : (
              <>
                <Sparkles size={12} />
                <span>AI extracts context as you type</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={12} />
            Extract
          </button>
        </div>
      </div>
    </div>
  );
}
