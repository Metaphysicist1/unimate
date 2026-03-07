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

export interface AgentData {
  answer: string;
  sources: string[];
  next_steps: string[];
}

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
