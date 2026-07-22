"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameState } from "@/hooks/useGameState";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";
import { FlavorSwatch, IceCreamCone } from "@/components/IceCreamCone";
import { ProposeModal } from "@/components/ProposeModal";
import { Confetti } from "@/components/Confetti";
import { Cherry } from "@/components/Cherry";

const WIN_CHERRY_DELAY_MS = 920;
const WIN_LOOP_START_DELAY_MS = WIN_CHERRY_DELAY_MS + 1320;

export default function PlayPage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("Player");
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [selectedOfferedFlavor, setSelectedOfferedFlavor] = useState<(typeof FLAVOR_IDS)[number] | null>(null);
  const [localLockedUntil, setLocalLockedUntil] = useState<number | null>(null);
  const [dismissedProposals, setDismissedProposals] = useState<Set<string>>(new Set());
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [countdownSec, setCountdownSec] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [cherryAnimationMode, setCherryAnimationMode] = useState<"off" | "drop" | "loop">("off");
  const [showWinLoopAnimation, setShowWinLoopAnimation] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const hasWonRef = useRef(false);

  function ordinal(place: number | null) {
    if (!place) return "";
    const mod100 = place % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
    const mod10 = place % 10;
    if (mod10 === 1) return `${place}st`;
    if (mod10 === 2) return `${place}nd`;
    if (mod10 === 3) return `${place}rd`;
    return `${place}th`;
  }

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
      setCherryAnimationMode("off");
      setShowWinLoopAnimation(false);
      setShowWinModal(false);
      setShowProposeModal(false);
      setSelectedOfferedFlavor(null);
      const cherryTimer = setTimeout(() => setCherryAnimationMode("drop"), WIN_CHERRY_DELAY_MS);
      const loopTimer = setTimeout(() => {
        setShowWinLoopAnimation(true);
        setCherryAnimationMode("loop");
      }, WIN_LOOP_START_DELAY_MS);
      const modalTimer = setTimeout(() => setShowWinModal(true), 60);
      const t = setTimeout(() => setShowConfetti(false), 4500);
      return () => {
        clearTimeout(cherryTimer);
        clearTimeout(loopTimer);
        clearTimeout(modalTimer);
        clearTimeout(t);
      };
    }

    if (currentHasWon) {
      setShowWinModal(true);
      return;
    }

    hasWonRef.current = false;
    setShowWinModal(false);
    setCherryAnimationMode("off");
    setShowWinLoopAnimation(false);
  }, [currentHasWon]);

  useEffect(() => {
    if (gameState.status !== "ok" || gameState.gameStatus !== "active") return;
    setDismissedProposals(new Set());
    setLocalLockedUntil(null);
  }, [gameState]);

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
        <IceCreamCone
          scoops={["vanilla", "vanilla", "vanilla"]}
          size="clamp(4.75rem, 22vw, 6.5rem)"
          animationMode="loop"
        />
      </main>
    );
  }

  if (gameState.status === "not_found" || gameState.status === "error") {
    return null;
  }

  const { gameStatus, player, pendingProposals } = gameState;

  async function handleRespond(proposalId: string, accept: boolean) {
    if (player.hasWon) return;

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

  function openProposeModal(offeredFlavor: (typeof FLAVOR_IDS)[number] | null = null) {
    setSelectedOfferedFlavor(offeredFlavor);
    setShowProposeModal(true);
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (gameStatus === "lobby") {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center px-[6vw] py-[4vh] gap-[3vh] text-center overflow-x-hidden">
        <IceCreamCone
          scoops={["strawberry", "cookies-and-cream", "bubblegum"]}
          size="clamp(5rem, 23vw, 7rem)"
          animationMode="loop"
        />

        <div className="max-w-[88vw]">
          <h1 className="font-pacifico text-[clamp(1.8rem,7vw,2.6rem)] leading-tight brand-heading mb-[1vh]">
            You&apos;re in, {player.name}! 🎉
          </h1>
          <p className="brand-text-muted text-[clamp(1rem,4vw,1.2rem)] leading-snug">
            Waiting for the host to start the game…
          </p>
        </div>

        {/* Flavor legend preview */}
        <div className="bg-white/82 rounded-[min(1.25rem,4vw)] p-[max(0.9rem,2vh)] w-[88vw] max-w-[24rem] shadow-sm backdrop-blur-sm">
          <p className="text-[clamp(0.7rem,2.9vw,0.8rem)] font-bold brand-text-soft uppercase tracking-wider mb-[1.2vh]">
            Flavours you might get
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
                  <span className="text-[clamp(0.8rem,3.3vw,0.95rem)] brand-text-muted">{label}</span>
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
    const canTrade = !player.hasWon;
    const visibleProposals = canTrade
      ? pendingProposals.filter(
      (p) => !dismissedProposals.has(p.id)
        )
      : [];
    return (
      <main className="min-h-[100dvh] flex flex-col items-center px-[4vw] py-[3vh] gap-[2.2vh] overflow-x-hidden">

        {/* ── Incoming proposals ── */}
        {visibleProposals.length > 0 && (
          <section className="w-[92vw] max-w-[25rem] flex flex-col gap-[1.3vh]">
            <p className="text-[clamp(0.7rem,2.8vw,0.8rem)] font-bold brand-text-soft uppercase tracking-wider text-center">
              Incoming Trade{visibleProposals.length > 1 ? "s" : ""}
            </p>
            {visibleProposals.map((proposal) => {
              const isResponding = respondingTo === proposal.id;
              return (
                <div
                  key={proposal.id}
                  className="bg-white/88 rounded-[min(1.2rem,4vw)] p-[max(0.85rem,1.8vh)] shadow-sm border-2 brand-card-border backdrop-blur-sm"
                >
                  <p className="brand-text-muted text-[clamp(0.82rem,3.3vw,0.95rem)] leading-snug mb-[1.1vh]">
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
                      className="brand-button-secondary flex-1 min-h-[2.8rem] py-[1.2vh] rounded-[min(0.9rem,3vw)] border-2 font-semibold text-[clamp(0.82rem,3.2vw,0.92rem)] disabled:opacity-40 transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleRespond(proposal.id, true)}
                      disabled={isResponding}
                      className="brand-button-primary flex-1 min-h-[2.8rem] py-[1.2vh] rounded-[min(0.9rem,3vw)] font-semibold text-[clamp(0.82rem,3.2vw,0.92rem)] disabled:opacity-40 transition-colors"
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
          <p className="font-pacifico text-[clamp(1.35rem,5vw,1.9rem)] brand-heading leading-none text-center">
            {playerName}&apos;s Cone
          </p>
          {player.hasWon ? (
            <p className="text-[clamp(0.86rem,3.3vw,0.98rem)] brand-text-muted text-center max-w-[82vw] font-medium">
              All 3 scoops match.
            </p>
          ) : (
            <p className="text-[clamp(0.86rem,3.3vw,0.98rem)] brand-text-muted text-center max-w-[82vw] font-medium">
              Tap a scoop to propose a swap.
            </p>
          )}
          <div className="relative flex items-start justify-center pt-[5.5vh]">
            {player.hasWon && (
              <Cherry
                size="clamp(2rem, 9vw, 2.9rem)"
                animationMode={cherryAnimationMode}
                className="absolute left-1/2 top-0 z-10 -translate-x-1/2 drop-shadow-md"
              />
            )}
            <IceCreamCone
              scoops={player.scoops}
              size="clamp(7.2rem, 34vw, 10.5rem)"
              animationMode={player.hasWon && showWinLoopAnimation ? "loop" : "off"}
              onScoopClick={(flavor) => {
                if (!isLocked && canTrade) openProposeModal(flavor);
              }}
              scoopClickable={!isLocked && canTrade}
            />
          </div>
        </div>

        {player.hasWon && (
          <div
            className={`fixed left-1/2 top-1/2 z-30 w-[82vw] max-w-[23rem] -translate-x-1/2 -translate-y-1/2 rounded-[min(1.3rem,4vw)] border border-white/60 bg-white/84 px-[5vw] py-[2vh] text-center shadow-2xl backdrop-blur-md transition-all duration-500 pointer-events-none ${
              showWinModal ? "opacity-100 scale-100" : "opacity-0 scale-95"
            }`}
          >
            <p className="font-pacifico text-[clamp(1.4rem,5.2vw,2rem)] leading-none brand-heading">
              You won {ordinal(player.winPlace)} place!
            </p>
            <p className="mt-[0.8vh] text-[clamp(0.85rem,3.1vw,1rem)] brand-text-muted">
              Hang tight while the host resets or starts the next round.
            </p>
          </div>
        )}

        {isLocked && canTrade && (
          <div className="brand-soft-surface w-[92vw] max-w-[25rem] rounded-[min(1rem,4vw)] px-[4vw] py-[1.4vh] text-center border">
            <p className="text-[clamp(0.86rem,3.4vw,0.96rem)] font-semibold">
              You can propose another swap in {countdownSec}s.
            </p>
          </div>
        )}

        {/* ── Flavor legend ── */}
        <div className="bg-white/84 rounded-[min(1.2rem,4vw)] p-[max(0.85rem,1.8vh)] w-[92vw] max-w-[25rem] shadow-sm backdrop-blur-sm">
          <p className="text-[clamp(0.7rem,2.8vw,0.8rem)] font-bold brand-text-soft uppercase tracking-wider mb-[1vh] text-center">
            Flavour Guide
          </p>
          <div className="grid grid-cols-2 gap-[1vh]">
            {FLAVOR_IDS.map((fid) => {
              const { label } = FLAVORS[fid];
              return (
                <div key={fid} className="flex items-center gap-2">
                  <FlavorSwatch flavor={fid} size="clamp(1.5rem, 8vw, 2rem)" className="flex-shrink-0" />
                  <span className="text-[clamp(0.76rem,3vw,0.85rem)] brand-text-muted">{label}</span>
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
            initialOfferedFlavor={selectedOfferedFlavor}
            onClose={() => {
              setShowProposeModal(false);
              setSelectedOfferedFlavor(null);
            }}
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
            animationMode="loop"
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 drop-shadow-md"
          />
        )}
        <IceCreamCone
          scoops={player.scoops}
          size="clamp(6.6rem, 31vw, 9rem)"
          animationMode={player.hasWon ? "loop" : "off"}
        />
      </div>
      <h1 className="font-pacifico text-[clamp(1.8rem,7vw,2.6rem)] brand-heading">Game Over!</h1>
      {player.hasWon ? (
        <p className="text-[clamp(0.95rem,3.8vw,1.1rem)] brand-text-muted">You won — great trading! 🏆</p>
      ) : (
        <p className="text-[clamp(0.95rem,3.8vw,1.1rem)] brand-text-soft">Thanks for playing ScoopShare!</p>
      )}
    </main>
  );
}
