"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getResults, createCheckout } from "@/lib/api";
import { RiskBadge } from "@/components/risk-badge";
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
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for slow analysis

    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const paid = paymentStatus === "success";
        // Don't pass the abort signal - let it complete naturally
        const data = await getResults(applicationId, paid);
        setResults(data);
        console.log("Loaded results structure:", JSON.stringify(data, null, 2));

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-white">
              📊 Analysis Complete
            </h1>
            <p className="text-slate-400 mt-1">
              Here's what we found in your documents
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        {/* Risk Summary Card */}
        <div className="mb-8">
          <RiskBadge
            level={results.analysis_results?.overall_risk || "unknown"}
            probability={results.analysis_results?.rejection_probability || 0}
          />
        </div>
        {/* What looks good */}
        {(results.what_looks_good ||
          results.analysis_results?.what_looks_good) &&
          (results.what_looks_good?.length > 0 ||
            results.analysis_results?.what_looks_good?.length > 0) && (
            <div className="mb-8">
              <div className="bg-emerald-900/30 border border-emerald-500/30 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-emerald-300">
                  <span className="text-2xl">✅</span> Strengths
                </h2>
                <ul className="space-y-3">
                  {(
                    results.what_looks_good ||
                    results.analysis_results?.what_looks_good ||
                    []
                  ).map((item: string, index: number) => (
                    <li
                      key={index}
                      className="text-slate-200 flex items-start gap-3"
                    >
                      <span className="text-emerald-400 text-lg leading-none mt-0.5">
                        →
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        {/* Issues found */}
        <div>
          {(() => {
            const issues =
              results.analysis_results?.issues_found ||
              results.issues_found ||
              [];
            const issueCount =
              results.analysis_results?.total_issues ||
              results.total_issues ||
              issues.length ||
              0;

            return (
              <>
                {/* Section Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span className="text-2xl">⚠️</span> Issues Found
                    </h2>
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-2">
                      <span className="text-red-300 font-bold text-lg">
                        {issueCount}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {issueCount === 0
                      ? "No issues detected"
                      : `${issueCount} item${issueCount !== 1 ? "s" : ""} need attention`}
                  </p>
                </div>

                {issues && issues.length > 0 ? (
                  <div className="space-y-4">
                    {issues.map((issue: any, index: number) => {
                      const rawSeverity = (
                        issue.severity || "warning"
                      ).toLowerCase();
                      // Map API severity values to our config keys
                      const severityMap: { [key: string]: string } = {
                        critical: "critical",
                        warning: "high",
                        info: "low",
                        high: "high",
                        medium: "medium",
                        low: "low",
                      };
                      const severity = severityMap[rawSeverity] || "medium";
                      const severityConfig = {
                        critical: {
                          bg: "bg-red-900/30",
                          border: "border-red-500/30",
                          badge: "bg-red-500/20 text-red-300",
                          icon: "🔴",
                        },
                        high: {
                          bg: "bg-orange-900/30",
                          border: "border-orange-500/30",
                          badge: "bg-orange-500/20 text-orange-300",
                          icon: "🟠",
                        },
                        medium: {
                          bg: "bg-yellow-900/30",
                          border: "border-yellow-500/30",
                          badge: "bg-yellow-500/20 text-yellow-300",
                          icon: "🟡",
                        },
                        low: {
                          bg: "bg-blue-900/30",
                          border: "border-blue-500/30",
                          badge: "bg-blue-500/20 text-blue-300",
                          icon: "🔵",
                        },
                      };

                      const config =
                        severityConfig[
                          severity as keyof typeof severityConfig
                        ] || severityConfig.medium;

                      return (
                        <div
                          key={index}
                          className={`${config.bg} border ${config.border} backdrop-blur-sm rounded-xl p-6 hover:border-opacity-60 transition-all duration-300`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="text-2xl mt-1">{config.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-bold text-white text-lg">
                                    {issue.title ||
                                      issue.issue ||
                                      issue.name ||
                                      "Unnamed Issue"}
                                  </h3>
                                  {issue.category && (
                                    <p className="text-xs text-slate-400 mt-1">
                                      {issue.category}
                                    </p>
                                  )}
                                </div>
                                <span
                                  className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap ml-2 ${config.badge}`}
                                >
                                  {rawSeverity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-slate-300 mb-3 text-sm leading-relaxed">
                                {issue.description ||
                                  issue.detail ||
                                  issue.message ||
                                  "No description provided"}
                              </p>

                              {/* Additional Info */}
                              {(issue.estimated_time ||
                                issue.estimated_cost) && (
                                <div className="flex gap-4 mb-3 text-xs text-slate-400">
                                  {issue.estimated_time && (
                                    <span>⏱️ {issue.estimated_time}</span>
                                  )}
                                  {issue.estimated_cost && (
                                    <span>💰 {issue.estimated_cost}</span>
                                  )}
                                </div>
                              )}

                              {/* Solution Section */}
                              {results.paid &&
                              (issue.how_to_fix || issue.solution) ? (
                                <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                                  <p className="text-sm font-semibold text-purple-300 mb-2">
                                    💡 How to Fix
                                  </p>
                                  <p className="text-sm text-slate-200 leading-relaxed">
                                    {issue.how_to_fix || issue.solution}
                                  </p>

                                  {/* Example Section */}
                                  {issue.example && (
                                    <div className="mt-3 pt-3 border-t border-slate-700">
                                      <p className="text-xs font-semibold text-slate-300 mb-1">
                                        ✓ Real Example
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {issue.example.student_country} student
                                        applying to {issue.example.target_uni}:
                                        "{issue.example.what_they_did}" →{" "}
                                        <span className="text-emerald-400">
                                          {issue.example.outcome}
                                        </span>
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                (issue.how_to_fix || issue.solution) && (
                                  <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg">
                                    <p className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                                      🔒 Solution & examples locked
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Upgrade to €7 to see detailed fix guide
                                      and real examples
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-emerald-900/30 border border-emerald-500/30 backdrop-blur-sm rounded-xl p-8 text-center">
                    <p className="text-emerald-300 font-semibold text-lg">✨</p>
                    <p className="text-emerald-200 font-semibold mt-2">
                      Excellent! No issues detected.
                    </p>
                    <p className="text-slate-400 text-sm mt-1">
                      Your documents look great!
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Premium Section */}
        {results.upgrade_required && !results.paid && (
          <div className="mt-12 pt-8 border-t border-slate-700/50">
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 backdrop-blur-sm rounded-xl p-8">
              <h3 className="text-2xl font-bold mb-6 text-white flex items-center gap-3">
                👀 Premium Features
              </h3>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Feature 1 */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h4 className="font-semibold text-purple-300 mb-2">
                    📋 Detailed Fix Guides
                  </h4>
                  <p className="text-sm text-slate-300">
                    Step-by-step instructions on how to fix each issue in your
                    documents.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h4 className="font-semibold text-purple-300 mb-2">
                    👥 Real Examples
                  </h4>
                  <p className="text-sm text-slate-300">
                    See real examples from successful applicants who had similar
                    issues.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h4 className="font-semibold text-purple-300 mb-2">
                    🎯 Personalized Tips
                  </h4>
                  <p className="text-sm text-slate-300">
                    Get specific advice tailored to your country and
                    universities.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <h4 className="font-semibold text-purple-300 mb-2">
                    ⭐ Priority Support
                  </h4>
                  <p className="text-sm text-slate-300">
                    Direct access to our support team for additional help.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all"
              >
                {upgrading ? "Processing..." : "🚀 Unlock Premium (€7)"}
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-12 flex gap-4 justify-center">
          <Button
            onClick={() => router.push("/check")}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
          >
            ↩️ Check Another Document
          </Button>
          {!results.paid && results.upgrade_required && (
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
            >
              {upgrading ? "Processing..." : "🚀 Get Full Report"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
