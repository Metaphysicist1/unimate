import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error, count } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    connected: !error,
    rowCount: count,
    error: error?.message || null,
    urlUsed: process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)",
  });
}
