import { NextResponse } from "next/server";
import { getAllPlayers, getPlayer, getGameState, getPendingProposalsForPlayer } from "@/lib/kv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }

  const [player, gameState, allPlayers] = await Promise.all([
    getPlayer(playerId),
    getGameState(),
    getAllPlayers(),
  ]);

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const winPlace = player.hasWon
    ? allPlayers
        .filter((candidate) => candidate.hasWon && candidate.wonAt !== null)
        .sort((a, b) => {
          if (a.wonAt !== b.wonAt) {
            return (a.wonAt ?? 0) - (b.wonAt ?? 0);
          }
          if (a.joinedAt !== b.joinedAt) {
            return a.joinedAt - b.joinedAt;
          }
          return a.id.localeCompare(b.id);
        })
        .findIndex((candidate) => candidate.id === player.id) + 1
    : null;

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
      winPlace,
      lockedUntil: player.lockedUntil,
    },
    pendingProposals,
  });
}
