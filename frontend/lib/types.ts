export interface UserContext {
  degree_type: string | null;
  language_level: string | null;
  target_country: string | null;
  target_university: string | null;
  target_program: string | null;
  gpa_estimated: number | null;
  gaps_in_info: GapInfo[];
  conflicts: ConflictInfo[];
  raw_prompt: string;
  file_sources: string[];
}

export interface GapInfo {
  field: keyof Omit<UserContext, "gaps_in_info" | "conflicts" | "raw_prompt" | "file_sources">;
  question: string;
}

export interface ConflictInfo {
  field: string;
  user_value: string;
  document_value: string;
  resolution_question: string;
}

export interface ExtractionResponse {
  context: UserContext;
  confidence: Record<string, number>;
  follow_up_questions: string[];
  status: "complete" | "needs_info" | "conflict";
}

export type ContextFieldKey =
  | "degree_type"
  | "language_level"
  | "target_country"
  | "target_university"
  | "target_program"
  | "gpa_estimated";

export interface ContextChipData {
  field: ContextFieldKey;
  label: string;
  icon: string;
  value: string | number | null;
  confidence: number;
  status: "empty" | "detected" | "confirmed" | "conflict";
}

export const CONTEXT_FIELD_META: Record<ContextFieldKey, { label: string; icon: string }> = {
  degree_type: { label: "Degree", icon: "GraduationCap" },
  language_level: { label: "Language", icon: "Languages" },
  target_country: { label: "Country", icon: "Globe" },
  target_university: { label: "University", icon: "School" },
  target_program: { label: "Program", icon: "BookOpen" },
  gpa_estimated: { label: "GPA", icon: "BarChart3" },
};

// ── Citation & suggested action types ─────────────────────────────────

export interface Citation {
  fact: string;
  source_url: string;
  source_title: string;
  last_verified: string;
}

export interface SuggestedAction {
  label: string;
  intent: string;
  icon: string;
}

// ── Agent response data ───────────────────────────────────────────────

export interface AgentData {
  answer: string;
  sources: string[];
  citations?: Citation[];
  next_steps: string[];
  suggested_actions?: SuggestedAction[];
  readiness_score?: number;
  missing_fields?: string[];
  seconds_saved?: number;
}

// ── SSE streaming types ───────────────────────────────────────────────

export interface SSENodeUpdate {
  node: string;
  supervisor_action: string;
  supervisor_reasoning: string;
  readiness_score: number;
  missing_fields: string[];
  seconds_saved: number;
  follow_up_question: string;
}

export interface SSEResearchProgress {
  depth: number;
  queries_used: string[];
  citation_count: number;
  phase: "core" | "nested";
}

export interface SSEFinalEvent {
  status: string;
  data: AgentData;
}

export type SSEEvent =
  | { type: "session"; data: { session_id: string } }
  | { type: "status"; data: { node: string; phase: string } }
  | { type: "node_update"; data: SSENodeUpdate }
  | { type: "research_progress"; data: SSEResearchProgress }
  | { type: "final"; data: SSEFinalEvent }
  | { type: "error"; data: { detail: string } }
  | { type: "done"; data: { session_id: string } };

// ── Success Tracker types ─────────────────────────────────────────────

export interface TrackerState {
  readinessScore: number;
  secondsSaved: number;
  missingFields: string[];
  activeNode: string;
  supervisorReasoning: string;
  hint: string | null;
  isProcessing: boolean;
  researchPhase?: "core" | "nested" | null;
  citationCount?: number;
}

export const FIELD_HINTS: Record<string, string> = {
  country: "Tip: Mentioning your target country helps us check country-specific requirements instantly.",
  language_level: "Tip: Uploading your language certificate now will save ~2 minutes of back-and-forth.",
  degree_type: "Tip: Specifying Bachelor/Master/PhD lets us filter to the right admission rules.",
  program: "Tip: Naming your exact program helps us look up specific prerequisites.",
  universities: "Tip: Adding your target university lets us check their uni-assist deadline.",
  gpa_estimated: "Tip: Uploading your transcript now will save ~10 minutes of typing.",
};

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  data?: AgentData;
  type?: "extraction" | "followup" | "verification" | "chat";
}

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  extractedText?: string;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  error?: string;
}
