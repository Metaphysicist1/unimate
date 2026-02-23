# UniMate 🎓

### _Your AI-Powered Companion for German University Admissions_

**UniMate** is an intelligent orchestration platform designed to streamline the complex process of applying to German universities. By leveraging Large Language Models (LLMs) and stateful agentic workflows, UniMate analyzes academic documents, provides gap analysis, and ensures requirements are met before students submit to platforms like uni-assist.

---

## 🚀 Project Vision

The path to studying in Germany is often blocked by administrative hurdles and strict document requirements. **UniMate** aims to reduce rejection rates by providing students with an "AI Admission Officer" that pre-screens transcripts, calculates approximate GPAs, and identifies missing credits before they become a problem.

### Key Objectives

- **Precision Extraction:** High-fidelity parsing of academic transcripts using Gemini 1.5/3.
- **Intelligent Feedback:** Actionable advice on missing ECTS or specific course prerequisites.
- **Security by Design:** Strict GDPR compliance with data stored in EU-central regions.
- **Agentic Reliability:** Utilizing a stateful AI Agent to handle complex, multi-step application logic.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend/Database:** Supabase (Auth, PostgreSQL, Row Level Security).
- **AI Orchestration:** LangGraph.js (Stateful Agents), LangChain.
- **LLM:** Google Gemini (Structured JSON Output).
- **Deployment:** Vercel.

---

## 🗺 Roadmap & Development Stages

### Stage 1: Prototype (Current)

- [x] End-to-end PDF/Text processing pipeline with Gemini.
- [x] TypeScript-based frontend for real-time response visualization.
- [x] Initial Supabase schema integration for data persistence.

### Stage 2: Agentic Intelligence (In Progress)

- [ ] **LangGraph Integration:** Implementing a stateful graph to handle "loops" (e.g., if a document is blurry, the agent requests a re-upload).
- [x] **Structured Data Validation:** Transitioning to strict JSON schemas and Zod validation for 100% type-safety.
- [ ] **Requirement Mapping:** Database of specific German University ECTS requirements.

### Stage 3: User Experience & Security

- [ ] **Supabase Auth:** Secure user accounts and personalized application dashboards.
- [ ] **Progress Stepper UI:** A visual guide for students to track their "Admission Readiness."
- [ ] **Lead Generation:** Integrated email collection for project updates and waitlisting.

### Stage 4: Scale & Monetization

- [ ] **Stripe Integration:** Implementing a seamless payment flow for "Premium Analysis."
- [ ] **Multi-Document Support:** Handling complex portfolios including CVs and Letters of Motivation.

---

## 🏗 System Architecture (LangGraph Logic)

UniMate moves beyond linear processing by using a graph-based approach:

1.  **Ingestion:** User uploads academic records.
2.  **Extraction (Node):** Gemini parses the data into structured JSON.
3.  **Validation (Node):** The system checks for "Admission Gaps" (e.g., missing math credits).
4.  **Correction (Cycle):** If data is ambiguous, the Agent prompts the user for clarification.
5.  **Commit:** Verified data is stored securely in Supabase.

---

## 🔒 Privacy & GDPR

Given the sensitive nature of academic data, UniMate is built with privacy as a priority:

- **Data Residency:** Hosted on **Supabase (eu-central-1 / Frankfurt)** to keep data within Germany/EU.
- **Isolation:** Row Level Security (RLS) ensures that only the authorized user can view their documents.
- **Minimalism:** We only process data required for admission assessment.

---

## 🛠 Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/unimate.git](https://github.com/your-username/unimate.git)
   ```
