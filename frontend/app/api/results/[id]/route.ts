// app/api/results/[id]/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  // 1. Await params (required in Next.js 15+ for dynamic routes)
  const { id } = await context.params;

  console.log("[RESULTS-API] Requested ID:", id);
  console.log(
    "[RESULTS-API] Supabase URL:",
    process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)",
  );

  // 2. Create Supabase client (safe now inside async function)
  const supabase = await createClient();

  // 3. Query with maybeSingle() to handle 0 rows gracefully
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  console.log("[RESULTS-API] Query outcome:", {
    found: !!data,
    idInData: data?.id || null,
    riskLevel: data?.risk_level || null,
    errorCode: error?.code,
    errorMessage: error?.message,
  });

  if (error) {
    console.error("[RESULTS-API] Supabase error:", error);
    return NextResponse.json(
      { detail: "Database query failed" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { detail: "Application not found" },
      { status: 404 },
    );
  }

  // Flatten the useful fields
  const responseData = {
    id: data.id,
    paid: data.paid,
    upgrade_required: data.analysis_results?.upgrade_required ?? false,
    overall_risk:
      data.analysis_results?.overall_risk ?? data.risk_level ?? "unknown",
    rejection_probability:
      data.analysis_results?.rejection_probability ??
      data.rejection_probability ??
      0,
    total_issues:
      data.analysis_results?.total_issues ??
      data.analysis_results?.issues_found?.length ??
      0,
    issues_found: data.analysis_results?.issues_found ?? [],
    what_looks_good: data.analysis_results?.what_looks_good ?? [],
    // add other fields you need
  };

  return NextResponse.json(responseData);
}
