"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";
import { IceCreamCone } from "@/components/IceCreamCone";
import { ProposeModal } from "@/components/ProposeModal";
import { Confetti } from "@/components/Confetti";

export default function PlayPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [localLockedUntil, setLocalLockedUntil] = useState<number | null>(null);
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set());
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const hasWonRef = useRef(false);

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

  // Effective lockout = max of server value and optimistic local value
  const serverLockedUntil =
    gameState.status === "ok" ? (gameState.player.lockedUntil ?? 0) : 0;
  const effectiveLockedUntil = Math.max(localLockedUntil ?? 0, serverLockedUntil);

  // Fire confetti exactly once the moment hasWon flips to true
  const currentHasWon = gameState.status === "ok" ? gameState.player.hasWon : false;
  useEffect(() => {
    if (currentHasWon && !hasWonRef.current) {
      hasWonRef.current = true;
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 4500);
      return () => clearTimeout(t);
    }
  }, [currentHasWon]);

  useEffect(() => {
    if (effectiveLockedUntil <= Date.now()) {
      setCountdownSec(0);
      return;
    }
    const tick = () =>
      setCountdownSec(Math.max(0, Math.ceil((effectiveLockedUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [effectiveLockedUntil]);

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

  const { gameStatus, player, pendingProposals } = gameState;

  async function handleRespond(proposalId: string, accept: boolean) {
    setRespondingTo(proposalId);
    setDismissedProposals((prev) => new Set(Array.from(prev).concat(proposalId)));
    try {
      await fetch("/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, accept, playerId }),
      });
    } catch {
      // On network error, un-dismiss so it reappears on next poll
      setDismissedProposals((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(proposalId);
        return next;
      });
    } finally {
      setRespondingTo(null);
    }
  }

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

  // ── Active ─────────────────────────────────────────────────────────────────
  if (gameStatus === "active") {
    const isLocked = countdownSec > 0;
    const visibleProposals = pendingProposals.filter(
      (p) => !dismissedProposals.has(p.id)
    );
    const SCOOP_POSITIONS = ["Top", "Middle", "Bottom"] as const;

    return (
      <main className="min-h-screen flex flex-col items-center px-4 py-8 gap-5">

        {/* ── Win banner ── */}
        {player.hasWon && (
          <div className="w-full max-w-xs bg-amber-400 text-white rounded-2xl px-5 py-4 text-center shadow">
            <p className="font-pacifico text-2xl">You did it! 🍦</p>
            <p className="text-sm opacity-90 mt-1">All 3 scoops match — you won!</p>
          </div>
        )}

        {/* ── Incoming proposals ── */}
        {visibleProposals.length > 0 && (
          <section className="w-full max-w-xs flex flex-col gap-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
              Incoming Trade{visibleProposals.length > 1 ? "s" : ""}
            </p>
            {visibleProposals.map((proposal) => {
              const isResponding = respondingTo === proposal.id;
              return (
                <div
                  key={proposal.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border-2 border-amber-200"
                >
                  <p className="text-gray-700 text-sm leading-snug mb-3">
                    <strong>{proposal.fromPlayerName}</strong> offers{" "}
                    <span
                      className="inline-block w-3 h-3 rounded-full align-middle mx-0.5 border border-gray-200"
                      style={{ background: FLAVORS[proposal.offeredFlavor].color }}
                    />
                    <strong> {FLAVORS[proposal.offeredFlavor].label}</strong> for your{" "}
                    <span
                      className="inline-block w-3 h-3 rounded-full align-middle mx-0.5 border border-gray-200"
                      style={{ background: FLAVORS[proposal.requestedFlavor].color }}
                    />
                    <strong> {FLAVORS[proposal.requestedFlavor].label}</strong>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(proposal.id, false)}
                      disabled={isResponding}
                      className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(proposal.id, true)}
                      disabled={isResponding}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm disabled:opacity-40 transition-colors"
                    >
                      Accept ✓
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Cone + scoop labels ── */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            {playerName}&apos;s Cone
          </p>
          <IceCreamCone scoops={player.scoops} size={160} />
          <div className="flex flex-col gap-1.5 w-full max-w-[200px]">
            {player.scoops.map((flavor, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                  style={{ background: FLAVORS[flavor].color }}
                />
                <span className="text-xs text-gray-500 font-medium">
                  {SCOOP_POSITIONS[i]}:{" "}
                  <span className="text-gray-700 font-semibold">{FLAVORS[flavor].label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Propose button ── */}
        <div className="w-full max-w-xs">
          <button
            onClick={() => setShowProposeModal(true)}
            disabled={isLocked}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold text-xl transition-colors"
          >
            {isLocked ? `Try again in ${countdownSec}s` : "🔄 Propose a Swap"}
          </button>
        </div>

        {/* ── Flavor legend ── */}
        <div className="bg-white rounded-2xl p-4 w-full max-w-xs shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">
            Flavor Guide
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FLAVOR_IDS.map((fid) => {
              const { label, color } = FLAVORS[fid];
              return (
                <div key={fid} className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Propose modal ── */}
        {showProposeModal && (
          <ProposeModal
            playerId={playerId as string}
            playerScoops={player.scoops}
            onClose={() => setShowProposeModal(false)}
            onNoMatch={(lu) => setLocalLockedUntil(lu)}
          />
        )}

        {/* ── Confetti burst on win ── */}
        {showConfetti && <Confetti />}
      </main>
    );
  }

  // ── Ended ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6 text-center">
      <IceCreamCone scoops={player.scoops} size={140} />
      <h1 className="font-pacifico text-3xl text-amber-600">Game Over!</h1>
      {player.hasWon ? (
        <p className="text-gray-600">You won — great trading! 🏆</p>
      ) : (
        <p className="text-gray-500">Thanks for playing ScoopShare!</p>
      )}
    </main>
  );
}
