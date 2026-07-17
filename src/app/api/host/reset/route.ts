import { NextResponse } from "next/server";
import { resetGame } from "@/lib/kv";

export async function POST() {
  try {
    await resetGame();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/host/reset]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
