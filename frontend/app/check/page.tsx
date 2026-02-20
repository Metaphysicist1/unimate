// frontend/app/check/page.tsx
"use client";

import { useState } from "react";
import { UploadZone } from "@/components/upload-zone";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

export default function CheckPage() {
  const [transcriptFile, setTranscriptFile] = useState<File | undefined>();
  const [degreeFile, setDegreeFile] = useState<File | undefined>();
  const [languageFile, setLanguageFile] = useState<File | undefined>();
  const [email, setEmail] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [universities, setUniversities] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleUpload = async () => {
    if (
      !transcriptFile ||
      !degreeFile ||
      !languageFile ||
      !country ||
      !universities
    ) {
      setError(
        "Please fill in all required fields and upload all three files.",
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("transcript", transcriptFile);
      formData.append("degree", degreeFile);
      formData.append("language", languageFile);
      if (email) formData.append("email", email);
      formData.append("country", country);
      formData.append(
        "universities",
        JSON.stringify(universities.split(",").map((u) => u.trim())),
      );

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Upload failed: ${response.statusText}`,
        );
      }

      const data = await response.json();
      setSuccessMessage("Analysis started successfully!");
      setTimeout(() => {
        router.push(`/results/${data.application_id}`);
      }, 1500);
    } catch (err) {
      setError((err as Error).message || "An error occurred during upload.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Document Analysis Checker
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Upload your university assistance documents for AI-powered review.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            How It Works
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Our AI-driven tool helps you verify and analyze your documents for
            university applications. It checks for potential issues and provides
            detailed insights.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Documents
          </h3>

          <div className="space-y-4">
            <UploadZone
              label="Transcript (PDF/DOC/DOCX)"
              onFileSelect={setTranscriptFile}
            />
            {transcriptFile && (
              <p className="text-sm text-green-600">✓ {transcriptFile.name}</p>
            )}
          </div>

          <div className="space-y-4">
            <UploadZone
              label="Degree Certificate (PDF/DOC/DOCX)"
              onFileSelect={setDegreeFile}
            />
            {degreeFile && (
              <p className="text-sm text-green-600">✓ {degreeFile.name}</p>
            )}
          </div>

          <div className="space-y-4">
            <UploadZone
              label="Language Test (PDF/DOC/DOCX)"
              onFileSelect={setLanguageFile}
            />
            {languageFile && (
              <p className="text-sm text-green-600">✓ {languageFile.name}</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Application Details
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country *
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="e.g., USA, UK, Germany"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Universities (comma-separated) *
            </label>
            <textarea
              value={universities}
              onChange={(e) => setUniversities(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="e.g., MIT, Stanford, Cambridge"
              rows={3}
              required
            />
          </div>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleUpload}
            disabled={
              isUploading ||
              !transcriptFile ||
              !degreeFile ||
              !languageFile ||
              !country ||
              !universities
            }
            className="w-full"
            variant="default"
          >
            {isUploading ? "Analyzing..." : "Start Analysis"}
          </Button>
          {isUploading && (
            <Progress value={uploadProgress} className="w-full" />
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Need help? Check our{" "}
          <a href="/faq" className="text-purple-600 hover:underline">
            FAQ
          </a>{" "}
          or contact support.
        </div>
      </div>
    </main>
  );
}
