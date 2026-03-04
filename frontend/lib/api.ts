// lib/api.ts
const API_URL = process.env.BACKEND_URL || "http://localhost:8000";
const API_BASE = process.env.BACKEND_URL || "http://localhost:8000";

// Optional: fallback + log warning in dev
if (!process.env.BACKEND_URL && process.env.NODE_ENV !== "production") {
  console.warn("BACKEND_URL not set → falling back to localhost");
}

export async function analyzeDocuments(
  transcript: File,
  degree: File,
  language: File,
  email: string,
  country: string,
  universities: string[],
) {
  console.log("Preparing to send data to backend...");
  const formData = new FormData();
  formData.append("transcript", transcript);
  formData.append("degree", degree);
  formData.append("language", language);
  formData.append("email", email);
  formData.append("country", country);
  formData.append("universities", JSON.stringify(universities));

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Analysis failed");
  }

  return response.json();
}

export async function getResults(
  id: string,
  paid: boolean = false,
  signal?: AbortSignal,
) {
  const res = await fetch(`/api/results/${id}?paid=${paid}`, {
    signal,
    cache: "no-store",
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Failed (${res.status})`);
  }

  return res.json();
}

export async function createCheckout(applicationId: string, email: string) {
  const response = await fetch(`${API_URL}/api/create-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      application_id: applicationId,
      email,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout");
  }

  return response.json();
}
