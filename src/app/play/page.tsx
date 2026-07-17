"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";
import { IceCreamCone } from "@/components/IceCreamCone";
import { ProposeModal } from "@/components/ProposeModal";
import { Confetti } from "@/components/Confetti";
import { Cherry } from "@/components/Cherry";

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
  const [showCherryDrop, setShowCherryDrop] = useState(false);
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
      setShowCherryDrop(true);
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
      <main className="min-h-[100dvh] flex items-center justify-center px-[6vw]">
        <IceCreamCone scoops={["vanilla", "vanilla", "vanilla"]} size="clamp(4.75rem, 22vw, 6.5rem)" className="animate-bounce" />
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
      <main className="min-h-[100dvh] flex flex-col items-center justify-center px-[6vw] py-[4vh] gap-[3vh] text-center overflow-x-hidden">
        <IceCreamCone scoops={["strawberry", "cookies-and-cream", "bubblegum"]} size="clamp(5rem, 23vw, 7rem)" className="animate-bounce" />

        <div className="max-w-[88vw]">
          <h1 className="font-pacifico text-[clamp(1.8rem,7vw,2.6rem)] leading-tight text-amber-600 mb-[1vh]">
            You&apos;re in, {player.name}! 🎉
          </h1>
          <p className="text-gray-500 text-[clamp(1rem,4vw,1.2rem)] leading-snug">
            Waiting for the host to start the game…
          </p>
        </div>

        {/* Flavor legend preview */}
        <div className="bg-white rounded-[min(1.25rem,4vw)] p-[max(0.9rem,2vh)] w-[88vw] max-w-[24rem] shadow-sm">
          <p className="text-[clamp(0.7rem,2.9vw,0.8rem)] font-bold text-gray-400 uppercase tracking-wider mb-[1.2vh]">
            Flavors you might get
          </p>
          <div className="grid grid-cols-2 gap-[1.2vh]">
            {FLAVOR_IDS.map((id) => {
              const { label, color } = FLAVORS[id];
              return (
                <div key={id} className="flex items-center gap-2">
                  <span
                    className="w-[4.8vw] h-[4.8vw] max-w-[1.25rem] max-h-[1.25rem] rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[clamp(0.8rem,3.3vw,0.95rem)] text-gray-600">{label}</span>
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
      <main className="min-h-[100dvh] flex flex-col items-center px-[4vw] py-[3vh] gap-[2.2vh] overflow-x-hidden">

        {/* ── Win banner ── */}
        {player.hasWon && (
          <div className="w-[92vw] max-w-[25rem] bg-amber-400 text-white rounded-[min(1.25rem,4vw)] px-[4vw] py-[1.8vh] text-center shadow">
            <p className="font-pacifico text-[clamp(1.5rem,6vw,2rem)] leading-none">You did it! 🍦</p>
            <p className="text-[clamp(0.85rem,3.4vw,0.95rem)] opacity-90 mt-[0.6vh]">All 3 scoops match — you won!</p>
          </div>
        )}

        {/* ── Incoming proposals ── */}
        {visibleProposals.length > 0 && (
          <section className="w-[92vw] max-w-[25rem] flex flex-col gap-[1.3vh]">
            <p className="text-[clamp(0.7rem,2.8vw,0.8rem)] font-bold text-gray-400 uppercase tracking-wider text-center">
              Incoming Trade{visibleProposals.length > 1 ? "s" : ""}
            </p>
            {visibleProposals.map((proposal) => {
              const isResponding = respondingTo === proposal.id;
              return (
                <div
                  key={proposal.id}
                  className="bg-white rounded-[min(1.2rem,4vw)] p-[max(0.85rem,1.8vh)] shadow-sm border-2 border-amber-200"
                >
                  <p className="text-gray-700 text-[clamp(0.82rem,3.3vw,0.95rem)] leading-snug mb-[1.1vh]">
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
                  <div className="flex gap-[2vw]">
                    <button
                      onClick={() => handleRespond(proposal.id, false)}
                      disabled={isResponding}
                      className="flex-1 min-h-[2.8rem] py-[1.2vh] rounded-[min(0.9rem,3vw)] border-2 border-gray-200 text-gray-600 font-semibold text-[clamp(0.82rem,3.2vw,0.92rem)] hover:bg-gray-50 disabled:opacity-40 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(proposal.id, true)}
                      disabled={isResponding}
                      className="flex-1 min-h-[2.8rem] py-[1.2vh] rounded-[min(0.9rem,3vw)] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[clamp(0.82rem,3.2vw,0.92rem)] disabled:opacity-40 transition-colors"
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
        <div className="flex flex-col items-center gap-[1.2vh] w-full">
          <p className="text-[clamp(0.7rem,2.8vw,0.8rem)] font-bold text-gray-400 uppercase tracking-wider">
            {playerName}&apos;s Cone
          </p>
          <div className="relative flex items-start justify-center pt-[5.5vh]">
            {player.hasWon && (
              <Cherry
                size="clamp(2rem, 9vw, 2.9rem)"
                animateDrop={showCherryDrop}
                className="absolute left-1/2 top-0 z-10 -translate-x-1/2 drop-shadow-md"
              />
            )}
            <IceCreamCone scoops={player.scoops} size="clamp(7.2rem, 34vw, 10.5rem)" />
          </div>
          <div className="flex flex-col gap-[0.8vh] w-[65vw] max-w-[13rem]">
            {player.scoops.map((flavor, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-[4vw] h-[4vw] max-w-[1rem] max-h-[1rem] rounded-full border border-gray-200 flex-shrink-0"
                  style={{ background: FLAVORS[flavor].color }}
                />
                <span className="text-[clamp(0.76rem,3vw,0.85rem)] text-gray-500 font-medium leading-tight">
                  {SCOOP_POSITIONS[i]}:{" "}
                  <span className="text-gray-700 font-semibold">{FLAVORS[flavor].label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Propose button ── */}
        <div className="w-[92vw] max-w-[25rem]">
          <button
            onClick={() => setShowProposeModal(true)}
            disabled={isLocked}
            className="w-full min-h-[3.5rem] py-[1.8vh] rounded-[min(1.25rem,4vw)] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold text-[clamp(1rem,4.2vw,1.35rem)] transition-colors"
          >
            {isLocked ? `Try again in ${countdownSec}s` : "🔄 Propose a Swap"}
          </button>
        </div>

        {/* ── Flavor legend ── */}
        <div className="bg-white rounded-[min(1.2rem,4vw)] p-[max(0.85rem,1.8vh)] w-[92vw] max-w-[25rem] shadow-sm">
          <p className="text-[clamp(0.7rem,2.8vw,0.8rem)] font-bold text-gray-400 uppercase tracking-wider mb-[1vh] text-center">
            Flavor Guide
          </p>
          <div className="grid grid-cols-2 gap-[1vh]">
            {FLAVOR_IDS.map((fid) => {
              const { label, color } = FLAVORS[fid];
              return (
                <div key={fid} className="flex items-center gap-2">
                  <span
                    className="w-[4vw] h-[4vw] max-w-[1rem] max-h-[1rem] rounded-full border border-gray-200 flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[clamp(0.76rem,3vw,0.85rem)] text-gray-600">{label}</span>
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
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-[6vw] py-[4vh] gap-[2.5vh] text-center overflow-x-hidden">
      <div className="relative flex items-start justify-center pt-[5vh]">
        {player.hasWon && (
          <Cherry
            size="clamp(2rem, 8vw, 2.6rem)"
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 drop-shadow-md"
          />
        )}
        <IceCreamCone scoops={player.scoops} size="clamp(6.6rem, 31vw, 9rem)" />
      </div>
      <h1 className="font-pacifico text-[clamp(1.8rem,7vw,2.6rem)] text-amber-600">Game Over!</h1>
      {player.hasWon ? (
        <p className="text-[clamp(0.95rem,3.8vw,1.1rem)] text-gray-600">You won — great trading! 🏆</p>
      ) : (
        <p className="text-[clamp(0.95rem,3.8vw,1.1rem)] text-gray-500">Thanks for playing ScoopShare!</p>
      )}
    </main>
  );
}
