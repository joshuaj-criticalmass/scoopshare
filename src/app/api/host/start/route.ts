import { NextResponse } from "next/server";
import { getGameState, getAllPlayers, startGame } from "@/lib/kv";

export async function POST() {
  try {
    const gameState = await getGameState();
    if (gameState.status !== "lobby") {
      return NextResponse.json({ error: "Game is not in lobby" }, { status: 400 });
    }

    const players = await getAllPlayers();
    if (players.length === 0) {
      return NextResponse.json({ error: "No players have joined yet" }, { status: 400 });
    }

    await startGame();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/host/start]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
