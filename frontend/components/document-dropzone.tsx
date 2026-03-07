"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { UploadedFile } from "@/lib/types";

interface DocumentDropzoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onFileUpload: (file: File) => Promise<void>;
  maxFiles?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 10 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusIcon = {
  pending: <Upload size={14} className="text-slate-400" />,
  uploading: <Loader2 size={14} className="animate-spin text-blue-400" />,
  processing: <Loader2 size={14} className="animate-spin text-purple-400" />,
  done: <CheckCircle2 size={14} className="text-emerald-400" />,
  error: <AlertCircle size={14} className="text-red-400" />,
};

export function DocumentDropzone({
  files,
  onFilesChange,
  onFileUpload,
  maxFiles = 5,
  disabled = false,
}: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const valid: File[] = [];
      for (const f of Array.from(incoming)) {
        if (!ACCEPTED_TYPES.includes(f.type)) continue;
        if (f.size > MAX_SIZE) continue;
        if (files.length + valid.length >= maxFiles) break;
        valid.push(f);
      }

      const newEntries: UploadedFile[] = valid.map((f) => ({
        file: f,
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        status: "pending" as const,
      }));

      onFilesChange([...files, ...newEntries]);

      for (const entry of newEntries) {
        await onFileUpload(entry.file);
      }
    },
    [files, maxFiles, onFilesChange, onFileUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!disabled) handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles],
  );

  const removeFile = useCallback(
    (id: string) => {
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFilesChange],
  );

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-white/10 hover:border-white/20 bg-white/[0.02]"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload
          size={24}
          className={`mx-auto mb-2 transition-colors ${isDragOver ? "text-blue-400" : "text-slate-500"}`}
        />
        <p className="text-sm font-medium text-slate-300">
          Drop your CV, transcript, or certificates here
        </p>
        <p className="text-xs text-slate-500 mt-1">
          PDF or DOCX — max {maxFiles} files, 10MB each
        </p>
      </div>

      <AnimatePresence mode="popLayout">
        {files.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
          >
            <FileText size={16} className="text-slate-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate">{f.name}</p>
              <p className="text-[10px] text-slate-500">{formatSize(f.size)}</p>
            </div>
            <div className="shrink-0">{statusIcon[f.status]}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFile(f.id);
              }}
              className="shrink-0 p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              <X size={12} className="text-slate-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
