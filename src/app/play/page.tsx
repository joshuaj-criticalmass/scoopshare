"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";
import { IceCreamCone } from "@/components/IceCreamCone";

export default function PlayPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");

  useEffect(() => {
    const pid = localStorage.getItem("ss_pid");
    if (!pid) {
      router.replace("/");
      return;
    }
    setPlayerId(pid);
    const n = localStorage.getItem("ss_name");
    if (n) setPlayerName(n);
  }, [router]);

  const gameState = useGameState(playerId);

  // If the player no longer exists (e.g. after a host reset), go back to join
  useEffect(() => {
    if (gameState.status === "not_found") {
      localStorage.removeItem("ss_pid");
      localStorage.removeItem("ss_name");
      router.replace("/");
    }
  }, [gameState.status, router]);

  // Loading / redirecting
  if (!playerId || gameState.status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <IceCreamCone scoops={["vanilla", "vanilla", "vanilla"]} size={80} className="animate-bounce" />
      </main>
    );
  }

  if (gameState.status === "not_found" || gameState.status === "error") {
    return null;
  }

  const { gameStatus, player } = gameState;

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (gameStatus === "lobby") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-8 text-center">
        <IceCreamCone scoops={["strawberry", "cookies-and-cream", "bubblegum"]} size={90} className="animate-bounce" />

        <div>
          <h1 className="font-pacifico text-3xl text-amber-600 mb-2">
            You&apos;re in, {player.name}! 🎉
          </h1>
          <p className="text-gray-500 text-lg leading-snug">
            Waiting for the host to start the game…
          </p>
        </div>

        {/* Flavor legend preview */}
        <div className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Flavors you might get
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {FLAVOR_IDS.map((id) => {
              const { label, color } = FLAVORS[id];
              return (
                <div key={id} className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ── Active (placeholder until Step 5) ─────────────────────────────────────
  if (gameStatus === "active") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 text-center">
        <IceCreamCone scoops={player.scoops} size={160} />
        <h1 className="font-pacifico text-3xl text-amber-600">Game on!</h1>
        <p className="text-gray-500">Find someone to trade with!</p>
      </main>
    );
  }

  // ── Ended ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 text-center">
      <span className="text-6xl">🎉</span>
      <h1 className="font-pacifico text-3xl text-amber-600">Game Over!</h1>
      <p className="text-gray-500">Thanks for playing ScoopShare!</p>
    </main>
  );
}
