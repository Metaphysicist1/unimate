"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getResults, createCheckout } from "@/lib/api";
import { RiskBadge } from "@/components/risk-badge";
import { IssueCard } from "@/components/issue-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";

export default function ResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Safely get ID – never force-cast without check
  const applicationIdRaw = params.id;
  const applicationId = Array.isArray(applicationIdRaw)
    ? applicationIdRaw[0]
    : typeof applicationIdRaw === "string"
      ? applicationIdRaw
      : undefined;

  const paymentStatus = searchParams.get("payment");

  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Early exit if no valid ID
    if (!applicationId) {
      setError("No application ID found in the URL. Please check your link.");
      setLoading(false);
      return;
    }

    // Quick sanity check (prevents "undefined" string)
    if (applicationId === "undefined" || applicationId.length < 30) {
      setError("Invalid application ID in the URL.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const paid = paymentStatus === "success";
        const data = await getResults(applicationId, paid, controller.signal);
        setResults(data);
        console.log(
          "Loaded results structure:",
          JSON.stringify(data, null, 2),
        );

        if (paid) {
          toast.success("🎉 Payment successful! Full report unlocked");
        }
      } catch (err: any) {
        console.error("Fetch error:", err);
        let msg = "Failed to load results";
        if (err.name === "AbortError") {
          msg = "Request timed out. Server may be slow.";
        } else if (err.message?.includes("Invalid")) {
          msg = "This application ID is invalid or does not exist.";
        }
        setError(msg);
        toast.error(msg);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchResults();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [applicationId, paymentStatus]);

  const handleUpgrade = async () => {
    if (!applicationId) return;

    setUpgrading(true);
    try {
      const email = prompt("Enter your email for the receipt:");
      if (!email) {
        setUpgrading(false);
        return;
      }

      const { checkout_url } = await createCheckout(applicationId, email);
      window.location.href = checkout_url;
    } catch (error) {
      toast.error("Failed to create checkout");
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2 text-red-600">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push("/check")}>Start New Check</Button>
        </Card>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Results not found</h2>
          <p className="text-gray-600 mb-4">
            This application may have expired or doesn't exist.
          </p>
          <Button onClick={() => router.push("/check")}>
            Check New Documents
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-8">
          📊 Your Analysis Results
        </h1>

        <RiskBadge
          level={results.analysis_results?.overall_risk || "unknown"}
          probability={results.analysis_results?.rejection_probability || 0}
        />
        {/* What looks good */}
        {results.what_looks_good && results.what_looks_good.length > 0 && (
          <Card className="p-6 mt-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-green-600">✅</span> What Looks Good
            </h2>
            <ul className="space-y-2">
              {results.what_looks_good.map((item: string, index: number) => (
                <li
                  key={index}
                  className="text-gray-700 flex items-start gap-2"
                >
                  <span className="text-green-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Issues found */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">
            ⚠️ Issues Found:{" "}
            {results.total_issues || results.issues_found.length}
          </h2>

          <div className="space-y-4">
            {results.issues_found.map((issue: any, index: number) => (
              <IssueCard key={index} issue={issue} showFull={results.paid} />
            ))}
          </div>

          {results.analysis_results?.upgrade_required && !results.paid && (
            <Card className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8">
              <h3 className="text-2xl font-bold mb-4">
                🔓 Unlock Full Report - €7
              </h3>
              <p className="text-lg mb-6">
                Get the complete fixing guide to save your €75 application fee
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Step-by-step fixing instructions for each issue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Real student success examples who had same issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>
                    University-specific requirements for your target unis
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Email PDF report you can reference while fixing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>1 FREE RECHECK after you fix the issues</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span>Access to Common Mistakes Database</span>
                </div>
              </div>

              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                size="lg"
                variant="secondary"
                className="w-full text-lg font-semibold"
              >
                {upgrading ? "Processing..." : "💳 Upgrade Now - €7"}
              </Button>

              <p className="text-sm text-center mt-4 opacity-90">
                💡 Think of it as insurance: Pay €7 now to avoid losing €75
                later
              </p>
            </Card>
          )}

          {/* Preview of what they'll get */}
          {results.upgrade_required && !results.paid && (
            <Card className="mt-8 p-6 bg-gray-50 border-2 border-dashed border-gray-300">
              <h3 className="text-xl font-bold mb-4">
                👀 Preview: What You'll Get
              </h3>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-semibold mb-2">
                  Example Fix Guide (from €7 version):
                </h4>
                <p className="text-sm mb-2">
                  <strong>Issue:</strong> Transcript missing "Contact Hours"
                  column
                </p>

                <div className="bg-gray-100 p-3 rounded relative overflow-hidden">
                  <div className="absolute inset-0 backdrop-blur-sm bg-white/50 flex items-center justify-center">
                    <div className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold">
                      🔒 Unlock to see full guide
                    </div>
                  </div>
                  <p className="text-sm blur-sm">
                    <strong>How to fix:</strong> Lorem ipsum dolor sit amet
                    consectetur adipiscing elit sed do eiusmod tempor incididunt
                    ut labore et dolore magna aliqua. Ut enim ad minim veniam
                    quis nostrud exercitation ullamco laboris.
                  </p>
                  <p className="text-sm blur-sm mt-2">
                    <strong>Real Example:</strong> Student Priya from India had
                    this issue applying to TUM Lorem ipsum dolor sit amet
                    consectetur adipiscing elit.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Start over button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/check")}
          >
            🔄 Check Different Documents
          </Button>
        </div>
      </div>
    </div>
  );
}
