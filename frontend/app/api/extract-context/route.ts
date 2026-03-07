import { NextRequest, NextResponse } from "next/server";

const backendUrl = () => process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const url = backendUrl();
    if (!url) {
      return NextResponse.json(
        { error: "Backend URL not configured." },
        { status: 503 },
      );
    }

    const body = await request.json();

    const res = await fetch(`${url}/api/extract-context`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Backend error: ${res.status}`);
    }

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("extract-context proxy error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Extraction failed" },
      { status: 500 },
    );
  }
}
