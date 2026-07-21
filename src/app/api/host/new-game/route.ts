import { NextResponse } from "next/server";
import { getAllPlayers, getGameState, startNewGame } from "@/lib/kv";
import { MIN_PLAYERS_TO_START, WINNERS_TO_END_GAME } from "@/lib/flavors";

export async function POST() {
  try {
    const [gameState, players] = await Promise.all([getGameState(), getAllPlayers()]);

    if (gameState.status !== "ended") {
      return NextResponse.json({ error: "Game is not ready for a new round" }, { status: 400 });
    }

    if (players.length < MIN_PLAYERS_TO_START) {
      return NextResponse.json(
        { error: `At least ${MIN_PLAYERS_TO_START} players are required to start` },
        { status: 400 }
      );
    }

    const winners = players.filter((player) => player.hasWon).length;
    if (winners < WINNERS_TO_END_GAME) {
      return NextResponse.json(
        { error: `${WINNERS_TO_END_GAME} winners are required before starting a new game` },
        { status: 400 }
      );
    }

    await startNewGame();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/host/new-game]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}