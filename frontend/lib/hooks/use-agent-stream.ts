"use client";

import { useState, useCallback, useRef } from "react";
import type {
  TrackerState,
  AgentData,
  SSENodeUpdate,
  SSEResearchProgress,
  UserContext,
} from "@/lib/types";
import { FIELD_HINTS as HINTS } from "@/lib/types";

interface StreamMessage {
  role: "user" | "assistant";
  content: string;
  data?: AgentData;
}

interface UseAgentStreamReturn {
  tracker: TrackerState;
  messages: StreamMessage[];
  sendMessage: (
    message: string,
    context: UserContext | null,
    sessionId: string,
    secondsSaved?: number,
  ) => Promise<void>;
  isStreaming: boolean;
}

function pickHint(missingFields: string[]): string | null {
  for (const field of missingFields) {
    const hint = HINTS[field];
    if (hint) return hint;
  }
  return null;
}

export function useAgentStream(): UseAgentStreamReturn {
  const [tracker, setTracker] = useState<TrackerState>({
    readinessScore: 0,
    secondsSaved: 0,
    missingFields: [],
    activeNode: "",
    supervisorReasoning: "",
    hint: null,
    isProcessing: false,
    researchPhase: null,
    citationCount: 0,
  });
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      message: string,
      context: UserContext | null,
      sessionId: string,
      secondsSaved = 0,
    ) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setIsStreaming(true);
      setTracker((prev) => ({ ...prev, isProcessing: true, activeNode: "supervisor" }));

      try {
        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            country: context?.target_country || "",
            program: context?.target_program || "",
            universities: context?.target_university ? [context.target_university] : [],
            degree_type: context?.degree_type || "",
            language_level: context?.language_level || "",
            gpa_estimated: context?.gpa_estimated,
            file_sources: context?.file_sources || [],
            seconds_saved: secondsSaved,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) throw new Error(`Stream error: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(eventType, data);
              } catch {
                // skip malformed JSON
              }
              eventType = "";
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Stream error:", e);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Connection lost. Please try again." },
          ]);
        }
      } finally {
        setIsStreaming(false);
        setTracker((prev) => ({ ...prev, isProcessing: false }));
      }
    },
    [],
  );

  function handleSSEEvent(type: string, data: Record<string, unknown>) {
    switch (type) {
      case "node_update": {
        const update = data as unknown as SSENodeUpdate;
        setTracker((prev) => ({
          ...prev,
          activeNode: update.node,
          readinessScore: update.readiness_score || prev.readinessScore,
          missingFields: update.missing_fields?.length
            ? update.missing_fields
            : prev.missingFields,
          secondsSaved: update.seconds_saved || prev.secondsSaved,
          supervisorReasoning: update.supervisor_reasoning || prev.supervisorReasoning,
          hint: pickHint(update.missing_fields || prev.missingFields),
        }));
        break;
      }
      case "final": {
        const final = data as { status: string; data: AgentData };
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: final.data.answer, data: final.data },
        ]);
        setTracker((prev) => ({
          ...prev,
          readinessScore: final.data.readiness_score ?? prev.readinessScore,
          missingFields: final.data.missing_fields ?? prev.missingFields,
          secondsSaved: final.data.seconds_saved ?? prev.secondsSaved,
          hint: pickHint(final.data.missing_fields ?? prev.missingFields),
          isProcessing: false,
        }));
        break;
      }
      case "research_progress": {
        const rp = data as unknown as SSEResearchProgress;
        setTracker((prev) => ({
          ...prev,
          researchPhase: rp.phase,
          citationCount: rp.citation_count,
        }));
        break;
      }
      case "error": {
        const detail = (data as { detail: string }).detail;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${detail}` },
        ]);
        break;
      }
    }
  }

  return { tracker, messages, sendMessage, isStreaming };
}
