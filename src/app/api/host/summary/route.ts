import { NextResponse } from "next/server";
import { getGameState, getAllPlayers } from "@/lib/kv";

export async function GET() {
  try {
    const [gameState, players] = await Promise.all([getGameState(), getAllPlayers()]);

    const winners = players
      .filter((p) => p.hasWon)
      .sort((a, b) => (a.wonAt ?? 0) - (b.wonAt ?? 0))
      .map((p) => ({ name: p.name, wonAt: p.wonAt }));

    return NextResponse.json({
      status: gameState.status,
      playerCount: players.length,
      winners,
    });
  } catch (err) {
    console.error("[/api/host/summary]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
