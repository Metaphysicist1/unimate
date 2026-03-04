import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const user_prompt = formData.get("user_prompt") as string;
    const program = formData.get("program") as string;
    const country = formData.get("country") as string;
    const universities = formData.get("universities") as string;

    if (!user_prompt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Forward to backend
    const backendFormData = new FormData();
    backendFormData.append("country", country);
    backendFormData.append("universities", universities);
    backendFormData.append("program", program);
    backendFormData.append(
      "user_prompt",
      user_prompt || "Analyze my profile for university admission",
    ); // fallback if empty

    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    const backendResponse = await fetch(
      `${backendUrl}/api/analyze`,
      {
        method: "POST",
        body: backendFormData,
      },
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      throw new Error(
        errorData.detail || `Backend error: ${backendResponse.status}`,
      );
    }

    const result = await backendResponse.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to analyze files" },
      { status: 500 },
    );
  }
}
