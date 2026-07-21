import { NextResponse } from "next/server";
import { getGameState, getAllPlayers, getResultsHistory } from "@/lib/kv";

export async function GET() {
  try {
    const [gameState, players, resultsHistory] = await Promise.all([
      getGameState(),
      getAllPlayers(),
      getResultsHistory(),
    ]);

    const joinedPlayers = players
      .slice()
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((p) => ({ id: p.id, name: p.name, hasWon: p.hasWon }));

    const winners = players
      .filter((p) => p.hasWon)
      .sort((a, b) => (a.wonAt ?? 0) - (b.wonAt ?? 0))
      .map((p) => ({ name: p.name, wonAt: p.wonAt }));

    return NextResponse.json({
      status: gameState.status,
      playerCount: players.length,
      joinedPlayers,
      winners,
      resultsHistory,
    });
  } catch (err) {
    console.error("[/api/host/summary]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
