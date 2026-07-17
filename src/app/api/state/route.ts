import { NextResponse } from "next/server";
import { getPlayer, getGameState, getPendingProposalsForPlayer } from "@/lib/kv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const [player, gameState] = await Promise.all([
    getPlayer(playerId),
    getGameState(),
  ]);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const pendingProposals =
    gameState.status === "active"
      ? await getPendingProposalsForPlayer(playerId)
      : [];

  return NextResponse.json({
    gameStatus: gameState.status,
    player: {
      id: player.id,
      name: player.name,
      scoops: player.scoops,
      hasWon: player.hasWon,
      wonAt: player.wonAt,
      lockedUntil: player.lockedUntil,
    },
    pendingProposals,
  });
}
