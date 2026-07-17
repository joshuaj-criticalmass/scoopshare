import { NextResponse } from "next/server";
import { respondToProposal } from "@/lib/kv";

export async function POST(request: Request) {
  const body = await request.json();
  const { proposalId, accept, playerId } = body as {
    proposalId: string;
    accept: boolean;
    playerId: string;
  };

  if (!proposalId || accept === undefined || !playerId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await respondToProposal(proposalId, accept, playerId);

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404,
      expired: 410,
      wrong_player: 403,
      stale: 409,
    };
    return NextResponse.json(
      { error: result.code },
      { status: statusMap[result.code] ?? 400 }
    );
  }

  return NextResponse.json(result);
}
