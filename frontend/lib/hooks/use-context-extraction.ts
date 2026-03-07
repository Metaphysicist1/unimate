"use client";

import { useState, useRef, useCallback } from "react";
import type {
  UserContext,
  ExtractionResponse,
  ContextChipData,
  ContextFieldKey,
} from "@/lib/types";
import { CONTEXT_FIELD_META as META } from "@/lib/types";

const DEBOUNCE_MS = 800;

function buildChips(
  ctx: UserContext | null,
  confidence: Record<string, number>,
): ContextChipData[] {
  const fields: ContextFieldKey[] = [
    "degree_type",
    "language_level",
    "target_country",
    "target_university",
    "target_program",
    "gpa_estimated",
  ];

  return fields.map((field) => {
    const value = ctx ? (ctx[field] as string | number | null) : null;
    const conf = confidence[field] ?? 0;
    const hasConflict = ctx?.conflicts?.some((c) => c.field === field) ?? false;

    let status: ContextChipData["status"] = "empty";
    if (hasConflict) status = "conflict";
    else if (value !== null && value !== undefined) status = "detected";

    return {
      field,
      label: META[field].label,
      icon: META[field].icon,
      value,
      confidence: conf,
      status,
    };
  });
}

export function useContextExtraction(sessionId: string) {
  const [context, setContext] = useState<UserContext | null>(null);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [extractionStatus, setExtractionStatus] = useState<string>("needs_info");
  const [isExtracting, setIsExtracting] = useState(false);
  const [chips, setChips] = useState<ContextChipData[]>(() => buildChips(null, {}));

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestInput = useRef("");

  const runExtraction = useCallback(
    async (input: string, fileText?: string) => {
      setIsExtracting(true);
      try {
        const res = await fetch("/api/extract-context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_input: input,
            file_text: fileText,
            previous_context: context,
            session_id: sessionId,
          }),
        });

        if (!res.ok) throw new Error("Extraction failed");

        const data: ExtractionResponse = await res.json();
        setContext(data.context);
        setConfidence(data.confidence);
        setFollowUpQuestions(data.follow_up_questions);
        setExtractionStatus(data.status);
        setChips(buildChips(data.context, data.confidence));
        return data;
      } catch (e) {
        console.error("Extraction error:", e);
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [context, sessionId],
  );

  const debouncedExtract = useCallback(
    (input: string) => {
      latestInput.current = input;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        if (latestInput.current.trim().length >= 10) {
          runExtraction(latestInput.current);
        }
      }, DEBOUNCE_MS);
    },
    [runExtraction],
  );

  const extractFromFile = useCallback(
    async (file: File): Promise<ExtractionResponse | null> => {
      setIsExtracting(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_input", latestInput.current || `Uploaded: ${file.name}`);
        formData.append("session_id", sessionId);
        if (context) {
          formData.append("previous_context", JSON.stringify(context));
        }

        const res = await fetch("/api/extract-context/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("File extraction failed");

        const data = await res.json();
        setContext(data.context);
        setConfidence(data.confidence);
        setFollowUpQuestions(data.follow_up_questions);
        setExtractionStatus(data.status);
        setChips(buildChips(data.context, data.confidence));
        return data;
      } catch (e) {
        console.error("File extraction error:", e);
        return null;
      } finally {
        setIsExtracting(false);
      }
    },
    [context, sessionId],
  );

  const confirmContext = useCallback(async () => {
    try {
      const formData = new FormData();
      formData.append("session_id", sessionId);

      const res = await fetch("/api/extract-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_input: context?.raw_prompt || "",
          previous_context: context,
          session_id: sessionId,
        }),
      });

      if (res.ok) {
        setExtractionStatus("confirmed");
        setChips((prev) =>
          prev.map((c) =>
            c.status === "detected" ? { ...c, status: "confirmed" as const } : c,
          ),
        );
      }
    } catch (e) {
      console.error("Confirm error:", e);
    }
  }, [context, sessionId]);

  const updateChipManually = useCallback(
    (field: ContextFieldKey, value: string | number | null) => {
      setContext((prev) => (prev ? { ...prev, [field]: value } : prev));
      setChips((prev) =>
        prev.map((c) =>
          c.field === field
            ? { ...c, value, status: "confirmed" as const, confidence: 1.0 }
            : c,
        ),
      );
    },
    [],
  );

  return {
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
  };
}
