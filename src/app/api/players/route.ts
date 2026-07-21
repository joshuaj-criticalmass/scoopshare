import { NextResponse } from "next/server";
import { getAllPlayers } from "@/lib/kv";

export async function GET() {
  const players = await getAllPlayers();
  return NextResponse.json(
    players
      .filter((player) => !player.hasWon)
      .map(({ id, name, hasWon }) => ({ id, name, hasWon }))
  );
}
