import { NextResponse } from "next/server";
import { getGameState, getAllPlayers, startGame } from "@/lib/kv";
import { MIN_PLAYERS_TO_START } from "@/lib/flavors";

export async function POST() {
  try {
    const gameState = await getGameState();
    if (gameState.status !== "lobby") {
      return NextResponse.json({ error: "Game is not in lobby" }, { status: 400 });
    }

    const players = await getAllPlayers();
    if (players.length < MIN_PLAYERS_TO_START) {
      return NextResponse.json(
        { error: `At least ${MIN_PLAYERS_TO_START} players are required to start` },
        { status: 400 }
      );
    }

    await startGame();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/host/start]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
