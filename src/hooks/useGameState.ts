import { useState, useEffect, useCallback } from "react";
import type { FlavorId, SwapProposal } from "@/lib/types";

export type GameStatus = "lobby" | "active" | "ended";

export type PlayerState = {
  id: string;
  name: string;
  scoops: [FlavorId, FlavorId, FlavorId];
  hasWon: boolean;
  wonAt: number | null;
  lockedUntil: number | null;
};

export type GameStateResult =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | {
      status: "ok";
      gameStatus: GameStatus;
      player: PlayerState;
      pendingProposals: SwapProposal[];
    };

const POLL_MS = 2000;

export function useGameState(playerId: string | null): GameStateResult {
  const [result, setResult] = useState<GameStateResult>({ status: "loading" });

  const poll = useCallback(async () => {
    if (!playerId) return;
    try {
      const res = await fetch(`/api/state?playerId=${encodeURIComponent(playerId)}`);
      if (res.status === 404) {
        setResult({ status: "not_found" });
        return;
      }
      if (!res.ok) {
        setResult({ status: "error" });
        return;
      }
      const data = await res.json();
      setResult({
        status: "ok",
        gameStatus: data.gameStatus,
        player: data.player,
        pendingProposals: data.pendingProposals,
      });
    } catch {
      setResult({ status: "error" });
    }
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [playerId, poll]);

  return result;
}
