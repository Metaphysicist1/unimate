import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcript = formData.get("transcript") as File;
    const degree = formData.get("degree") as File;
    const language = formData.get("language") as File;
    const email = formData.get("email") as string | null;
    const country = formData.get("country") as string;
    const universities = formData.get("universities") as string;

    if (!transcript || !degree || !language || !country || !universities) {
      return NextResponse.json(
        { error: "Missing required files or fields" },
        { status: 400 },
      );
    }

    // Forward to backend
    const backendFormData = new FormData();
    backendFormData.append("transcript", transcript);
    backendFormData.append("degree", degree);
    backendFormData.append("language", language);
    if (email) backendFormData.append("email", email);
    backendFormData.append("country", country);
    backendFormData.append("universities", universities);

    const backendResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/analyze`,
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
