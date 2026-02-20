// app/api/results/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const paid = request.nextUrl.searchParams.get("paid") === "true";

    console.log("[RESULTS-API] Requested ID:", id, "Paid:", paid);

    if (!id) {
      return NextResponse.json(
        { detail: "Missing application ID" },
        { status: 400 },
      );
    }

    // Forward to backend
    const backendUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/results/${id}?paid=${paid}`;
    console.log("[RESULTS-API] Forwarding to:", backendUrl);

    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      console.error("[RESULTS-API] Backend error:", errorData);
      return NextResponse.json(
        { detail: errorData.detail || "Failed to fetch results" },
        { status: backendResponse.status },
      );
    }

    const result = await backendResponse.json();
    console.log("[RESULTS-API] Success, returning results");
    return NextResponse.json(result);
  } catch (error) {
    console.error("[RESULTS-API] Error:", error);
    return NextResponse.json(
      { detail: (error as Error).message || "Failed to fetch results" },
      { status: 500 },
    );
  }
}
