import { NextResponse } from "next/server";
import { proposeSwap } from "@/lib/kv";
import type { FlavorId } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { fromPlayerId, toPlayerId, offeredFlavor, requestedFlavor } = body as {
    fromPlayerId: string;
    toPlayerId: string;
    offeredFlavor: FlavorId;
    requestedFlavor: FlavorId;
  };

  if (!fromPlayerId || !toPlayerId || !offeredFlavor || !requestedFlavor) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await proposeSwap(fromPlayerId, toPlayerId, offeredFlavor, requestedFlavor);

  if (result.ok) {
    return NextResponse.json({ proposalId: result.proposalId });
  }

  const statusMap: Record<string, number> = {
    locked: 429,
    no_match: 422,
    no_offer_scoop: 422,
    game_not_active: 409,
    not_found: 404,
    same_player: 400,
  };

  return NextResponse.json(
    { error: result.code, ...(("lockedUntil" in result) ? { lockedUntil: result.lockedUntil } : {}) },
    { status: statusMap[result.code] ?? 400 }
  );
}
