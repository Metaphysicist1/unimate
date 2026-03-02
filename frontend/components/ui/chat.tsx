"use client";

console.log("===== CHAT.TSX FILE HAS STARTED EXECUTING =====");

import React, { useState } from "react";
import {
  Send,
  Bot,
  User,
  Paperclip,
  School,
  Globe,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import router from "next/dist/shared/lib/router/router";
import { form } from "framer-motion/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function Chat({
  api,
  placeholder,
}: {
  api: string;
  placeholder?: string;
}) {
  const [user_prompt, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "System Initialized. Provide your university details and upload your transcript to check Anabin recognition.",
    },
  ]);
  console.log("Chat component initialized with API endpoint:", api);
  // --- NEW: ANABIN STATES ---
  const [universities, setUniversity] = useState("");
  const [program, setProgram] = useState("");
  const [country, setCountry] = useState("");
  // const [file, setFile] = useState<File | null>(null);

  // --- NEW: SEND FUNCTION ---
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();

    console.log("handleSend → FUNCTION BODY EXECUTED");

    const text = user_prompt.trim();
    console.log("Text that would be sent:", text || "(empty)");

    if (!text) return;

    try {
      console.log("Creating FormData...");
      const formData = new FormData();
      formData.append("user_prompt", text);
      formData.append("universities", universities);
      formData.append("program", program);
      formData.append("country", country);

      console.log("Calling fetch to:", api);

      const res = await fetch(api, { method: "POST", body: formData });

      console.log("Fetch finished → status:", res.status);

      const data = await res.json();
      console.log("Backend data:", data);

      // Handle different response formats
      let responseText = "";
      if (data.gemini_output) {
        responseText = data.gemini_output;
      } else if (data.issues_found && Array.isArray(data.issues_found)) {
        // Format the structured response into a readable message
        responseText = `Analysis Complete:\n\nRisk Level: ${data.overall_risk}\nRejection Probability: ${data.rejection_probability}%\n\nIssues Found:\n`;
        data.issues_found.forEach((issue: any, index: number) => {
          responseText += `${index + 1}. ${issue.title} (${issue.severity})\n${issue.description}\n\n`;
        });
        if (data.what_looks_good && data.what_looks_good.length > 0) {
          responseText += "What looks good:\n";
          data.what_looks_good.forEach((good: string, index: number) => {
            responseText += `• ${good}\n`;
          });
        }
      } else {
        responseText = JSON.stringify(data, null, 2);
      }

      setMessages((prev) => [        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: responseText,
        },
      ]);
    } catch (err) {
      console.error("handleSend error:", err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-transparent font-sans">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-start gap-3`}
          >
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bot size={16} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${m.role === "user" ? "bg-blue-600 text-white" : "glass-panel text-slate-200 border-white/5"}`}
            >
              {m.content}
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- ENHANCED INPUT SECTION --- */}
      <div className="p-4 bg-white/5 border-t border-white/5 backdrop-blur-md">
        <form className="max-w-3xl mx-auto space-y-3" onSubmit={handleSend}>
          {/* Anabin Detail Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="relative">
              <School className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="University"
                value={universities}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="Program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          {/* Main Input Row */}
          <div className="relative flex items-center gap-2">
            {/*<input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => document.getElementById("file-upload")?.click()}
              className={`p-2 transition-colors ${file ? "text-green-400" : "text-slate-500 hover:text-blue-400"}`}
            >
              <Paperclip size={20} />
            </button> */}

            <input
              id="uni-mate-input"
              name="uni-mate-message"
              value={user_prompt}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder || "Ask or describe your case..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
            />

            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
            >
              <Send size={18} />
            </Button>
          </div>
        </form>
        <button
          type="button"
          onClick={() => {
            console.log("FORCED TEST BUTTON CLICKED");
            handleSend({ preventDefault: () => {} } as any);
          }}
          className="bg-red-600 text-white p-4 m-4"
        >
          FORCE RUN handleSend
        </button>
      </div>
    </div>
  );
}
