import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json(
        {
          status: "error",
          data: {
            answer:
              "Backend URL is not configured. Set BACKEND_URL in environment variables.",
            sources: [],
            next_steps: [],
          },
        },
        { status: 503 },
      );
    }

    const backendResponse = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `Backend error: ${backendResponse.status}`,
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chat proxy error:", error);
    return NextResponse.json(
      {
        status: "error",
        data: {
          answer: (error as Error).message || "Failed to reach the analysis server.",
          sources: [],
          next_steps: [],
        },
      },
      { status: 500 },
    );
  }
}
