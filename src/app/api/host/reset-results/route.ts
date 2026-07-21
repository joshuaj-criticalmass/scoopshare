import { NextResponse } from "next/server";
import { resetResultsHistory } from "@/lib/kv";

export async function POST() {
  try {
    await resetResultsHistory();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/host/reset-results]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}