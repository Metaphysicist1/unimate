"use client";

import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";
import { ContextBar } from "@/components/context-bar";
import { DocumentDropzone } from "@/components/document-dropzone";
import { ContextSidebar } from "@/components/context-sidebar";
import { VerificationStep } from "@/components/verification-step";
import { Chat } from "@/components/ui/chat";
import { Button } from "@/components/ui/button";
import { useContextExtraction } from "@/lib/hooks/use-context-extraction";
import type { UploadedFile, ContextFieldKey, ConflictInfo } from "@/lib/types";

type Phase = "intake" | "verify" | "chat";

export default function CheckPage() {
  const [sessionId] = useState(() => crypto.randomUUID());
  const [phase, setPhase] = useState<Phase>("intake");
  const [userInput, setUserInput] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const {
    context,
    confidence,
    followUpQuestions,
    extractionStatus,
    isExtracting,
    chips,
    debouncedExtract,
    runExtraction,
    extractFromFile,
    confirmContext,
    updateChipManually,
  } = useContextExtraction(sessionId);

  const handleInputChange = useCallback(
    (value: string) => {
      setUserInput(value);
      debouncedExtract(value);
    },
    [debouncedExtract],
  );

  const handleSubmit = useCallback(() => {
    if (userInput.trim().length >= 10) {
      runExtraction(userInput);
    }
  }, [userInput, runExtraction]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === file ? { ...f, status: "processing" as const } : f,
        ),
      );

      const result = await extractFromFile(file);

      setFiles((prev) =>
        prev.map((f) =>
          f.file === file
            ? { ...f, status: result ? ("done" as const) : ("error" as const) }
            : f,
        ),
      );
    },
    [extractFromFile],
  );

  const handleProceedToVerify = useCallback(() => {
    if (context) setPhase("verify");
  }, [context]);

  const handleConfirm = useCallback(() => {
    confirmContext();
    setPhase("chat");
  }, [confirmContext]);

  const handleEditField = useCallback(
    (field: ContextFieldKey, value: string) => {
      updateChipManually(field, value);
    },
    [updateChipManually],
  );

  const handleResolveConflict = useCallback(
    (conflict: ConflictInfo, chosenValue: string) => {
      updateChipManually(conflict.field as ContextFieldKey, chosenValue);
    },
    [updateChipManually],
  );

  const handleAskFollowUp = useCallback(
    (question: string) => {
      setUserInput((prev) => (prev ? `${prev}\n\n${question}` : question));
    },
    [],
  );

  const handleReset = useCallback(() => {
    setPhase("intake");
    setUserInput("");
    setFiles([]);
  }, []);

  const conflicts = useMemo(
    () => context?.conflicts ?? [],
    [context],
  );

  const canProceed =
    context && chips.some((c) => c.status !== "empty") && !isExtracting;

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
      <DynamicBackground />
      <Navbar />

      <main className="container mx-auto px-4 pt-28 pb-10 relative z-10">
        <AnimatePresence mode="wait">
          {/* ─── PHASE 1: INTAKE ─── */}
          {phase === "intake" && (
            <motion.div
              key="intake"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-6 max-w-6xl mx-auto"
            >
              {/* Left: Input area */}
              <div className="flex-1 space-y-5">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Tell us about your application
                  </h1>
                  <p className="text-sm text-slate-400">
                    Describe your goals, upload documents, and our AI will
                    automatically extract all the details it needs.
                  </p>
                </div>

                <ContextBar
                  value={userInput}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  isExtracting={isExtracting}
                />

                <DocumentDropzone
                  files={files}
                  onFilesChange={setFiles}
                  onFileUpload={handleFileUpload}
                />

                {/* Proceed button */}
                <AnimatePresence>
                  {canProceed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <Button
                        onClick={handleProceedToVerify}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 text-sm font-medium flex items-center gap-2"
                      >
                        Review Extracted Data
                        <ArrowRight size={16} />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right: Context sidebar */}
              <div className="w-72 shrink-0">
                <div className="sticky top-28 glass-panel rounded-2xl border border-white/10 p-4 bg-[#0f172a]/90 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <ContextSidebar
                    chips={chips}
                    conflicts={conflicts}
                    followUpQuestions={followUpQuestions}
                    isExtracting={isExtracting}
                    extractionStatus={extractionStatus}
                    onAskFollowUp={handleAskFollowUp}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── PHASE 2: VERIFICATION ─── */}
          {phase === "verify" && context && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Verify Your Information
                  </h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Review what our AI extracted. Click any field to correct it.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setPhase("intake")}
                  className="text-slate-400 hover:text-white"
                >
                  <RotateCcw size={14} className="mr-1" />
                  Back
                </Button>
              </div>

              <VerificationStep
                context={context}
                confidence={confidence}
                onConfirm={handleConfirm}
                onEdit={handleEditField}
                onResolveConflict={handleResolveConflict}
              />
            </motion.div>
          )}

          {/* ─── PHASE 3: CHAT ─── */}
          {phase === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex gap-6 max-w-6xl mx-auto h-[calc(100vh-10rem)]"
            >
              {/* Chat panel */}
              <div className="flex-1 glass-panel rounded-[2rem] border border-white/10 shadow-2xl flex flex-col bg-[#0f172a]/90 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/5 shrink-0 flex items-center justify-between">
                  <h1 className="text-lg font-bold text-white">
                    UniMate Analysis
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    <RotateCcw size={12} className="mr-1" />
                    New Session
                  </Button>
                </div>

                <div className="flex-1 min-h-0">
                  <Chat
                    context={context}
                    sessionId={sessionId}
                    placeholder="Ask about your uni-assist application..."
                  />
                </div>
              </div>

              {/* Persistent sidebar */}
              <div className="w-72 shrink-0">
                <div className="sticky top-28 glass-panel rounded-2xl border border-white/10 p-4 bg-[#0f172a]/90 max-h-[calc(100vh-10rem)] overflow-y-auto">
                  <ContextSidebar
                    chips={chips}
                    conflicts={[]}
                    followUpQuestions={[]}
                    isExtracting={false}
                    extractionStatus="confirmed"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
