import { NextResponse } from "next/server";
import { getGameState, setPlayer, addPlayerToIndex, uniqueDisplayName } from "@/lib/kv";
import { randomScoops } from "@/lib/flavors";
import type { Player } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const trimmed = (body.name ?? "").toString().trim().slice(0, 30);

    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const gameState = await getGameState();
    if (gameState.status !== "lobby") {
      return NextResponse.json(
        { error: "The game has already started — check with your host" },
        { status: 400 }
      );
    }

    const name = await uniqueDisplayName(trimmed);
    const id = crypto.randomUUID();

    const player: Player = {
      id,
      name,
      scoops: randomScoops(), // re-dealt when host starts game
      joinedAt: Date.now(),
      hasWon: false,
      wonAt: null,
      lockedUntil: null,
    };

    await setPlayer(player);
    await addPlayerToIndex(id);

    return NextResponse.json({ playerId: id, name });
  } catch (err) {
    console.error("[/api/join]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
