import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ detail: "Backend URL not configured." })}\n\n`,
      {
        status: 503,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }

  const body = await request.json();

  const backendResponse = await fetch(`${backendUrl}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ detail: `Backend error: ${backendResponse.status}` })}\n\n`,
      {
        status: backendResponse.status,
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  }

  return new Response(backendResponse.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
