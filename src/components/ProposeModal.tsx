"use client";
import { useEffect, useRef, useState } from "react";
import type { FlavorId } from "@/lib/types";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";
import { FlavorSwatch } from "@/components/IceCreamCone";

interface PlayerSummary {
  id: string;
  name: string;
  hasWon: boolean;
}

interface ProposeModalProps {
  playerId: string;
  playerScoops: [FlavorId, FlavorId, FlavorId];
  initialOfferedFlavor?: FlavorId | null;
  onClose: () => void;
  onNoMatch: (lockedUntil: number) => void;
}

const SCOOP_LABELS = ["Top", "Middle", "Bottom"] as const;

export function ProposeModal({
  playerId,
  playerScoops,
  initialOfferedFlavor = null,
  onClose,
  onNoMatch,
}: ProposeModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);
  const [offeredFlavor, setOfferedFlavor] = useState<FlavorId | null>(initialOfferedFlavor);
  const [requestedFlavor, setRequestedFlavor] = useState<FlavorId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const stepSequence = initialOfferedFlavor ? [1, 3] as const : [1, 2, 3] as const;
  const tappedFlavorLabel = initialOfferedFlavor ? FLAVORS[initialOfferedFlavor].label : null;

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data: PlayerSummary[]) => {
        setPlayers(data.filter((p) => p.id !== playerId));
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoadingPlayers(false));
  }, [playerId]);

  useEffect(() => {
    if (step === 1) searchRef.current?.focus();
  }, [step]);

  function handleBack() {
    if (step === 3 && initialOfferedFlavor) {
      setRequestedFlavor(null);
      setError("");
      setStep(1);
      return;
    }

    setError("");
    setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(nextRequestedFlavor?: FlavorId) {
    const activeRequestedFlavor = nextRequestedFlavor ?? requestedFlavor;
    if (!selectedPlayer || !offeredFlavor || !activeRequestedFlavor) return;
    setSubmitting(true);
    setError("");
    setRequestedFlavor(activeRequestedFlavor);

    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPlayerId: playerId,
          toPlayerId: selectedPlayer.id,
          offeredFlavor,
          requestedFlavor: activeRequestedFlavor,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.lockedUntil) {
          onNoMatch(data.lockedUntil);
          onClose();
          return;
        }
        setError(data.error === "no_offer_scoop" ? "You no longer have that scoop!" : "Couldn't send — try again.");
        return;
      }

      onClose();
    } catch {
      setError("Connection error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-[4vw] pt-[max(env(safe-area-inset-top),2.5rem)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[min(1.5rem,4vw)] w-[92vw] max-w-[26rem] sm:max-w-[34rem] lg:max-w-[42rem] max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-[4vw] pt-[2vh] pb-[1.2vh] border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-gray-600 text-[clamp(1.1rem,4vw,1.3rem)] leading-none"
                aria-label="Back"
              >
                ←
              </button>
            )}
            <h2 className="font-pacifico text-[clamp(1rem,4vw,1.25rem)] brand-heading">
              {step === 1 && (tappedFlavorLabel ? `Trade ${tappedFlavorLabel} with…` : "Trade with…")}
              {step === 2 && "You're offering…"}
              {step === 3 && "You want back…"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-[clamp(1.3rem,5vw,1.6rem)] leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 px-[4vw] py-[1vh]">
          {stepSequence.map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                (s === 1 && step >= 1) || (s === 3 && step === 3) || s < step
                  ? "bg-[#ffc5d9]"
                  : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[4vw] pb-[2vh]">

          {/* ── Step 1: Pick a player ── */}
          {step === 1 && (
            <div className="flex flex-col gap-3 pt-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="brand-input w-full px-[4vw] py-[1.6vh] rounded-[min(1rem,4vw)] border-2 focus:outline-none text-[clamp(0.95rem,3.8vw,1rem)]"
              />
              {loadingPlayers ? (
                <p className="text-center text-gray-400 py-[3vh] text-[clamp(0.85rem,3.4vw,0.95rem)]">Loading players…</p>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-gray-400 py-[3vh] text-[clamp(0.85rem,3.4vw,0.95rem)]">No players found</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filteredPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setSelectedPlayer(p);
                          setRequestedFlavor(null);
                          setError("");
                          setStep(initialOfferedFlavor ? 3 : 2);
                        }}
                        className="w-full text-left px-[4vw] py-[1.6vh] rounded-[min(1rem,4vw)] border-2 border-gray-100 hover:border-[#ffc5d9] hover:bg-[#fdf5c9] transition-colors flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-[clamp(0.9rem,3.7vw,1rem)] text-gray-700">{p.name}</span>
                        {p.hasWon && <span className="text-[clamp(0.68rem,2.8vw,0.75rem)] brand-chip-mint px-[2vw] py-[0.3vh] rounded-full">Winner 🏆</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ── Step 2: Pick scoop to offer ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-[clamp(0.82rem,3.2vw,0.92rem)] brand-text-muted text-center">
                Trading with <strong>{selectedPlayer?.name}</strong>
              </p>
              {playerScoops.map((flavor, i) => {
                const { label } = FLAVORS[flavor];
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setOfferedFlavor(flavor);
                      setStep(3);
                    }}
                    className="w-full flex items-center gap-4 px-[4vw] py-[1.7vh] rounded-[min(1rem,4vw)] border-2 border-gray-100 hover:border-[#ffc5d9] hover:bg-[#fdf5c9] transition-colors"
                  >
                    <FlavorSwatch flavor={flavor} size="clamp(2.1rem, 7vw, 3rem)" className="flex-shrink-0" />
                    <div className="text-left">
                      <p className="text-[clamp(0.68rem,2.7vw,0.75rem)] font-bold text-gray-400 uppercase tracking-wider">{SCOOP_LABELS[i]}</p>
                      <p className="font-semibold text-[clamp(0.92rem,3.7vw,1rem)] text-gray-700">{label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 3: Pick flavor to request ── */}
          {step === 3 && (
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-[clamp(0.82rem,3.2vw,0.92rem)] brand-text-muted text-center leading-snug">
                Giving up <strong>{offeredFlavor ? FLAVORS[offeredFlavor].label : ""}</strong> — tap the flavour you want back.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {FLAVOR_IDS.map((fid) => {
                  const { label } = FLAVORS[fid];
                  const selected = requestedFlavor === fid;
                  return (
                    <button
                      key={fid}
                      onClick={() => {
                        if (!submitting) {
                          void handleSubmit(fid);
                        }
                      }}
                      disabled={submitting}
                      className={`flex flex-col items-center justify-center gap-2 px-[2.4vw] py-[1.5vh] min-h-[7rem] rounded-[min(1rem,4vw)] border-2 text-center transition-colors ${
                        selected
                          ? "border-[#ffc5d9] bg-[#fdf5c9]"
                          : "border-gray-100 hover:border-[#ffc5d9] hover:bg-[#fdf5c9]"
                      } ${submitting ? "opacity-60 cursor-wait" : ""}`}
                    >
                      <FlavorSwatch flavor={fid} size="clamp(2rem, 6vw, 2.7rem)" className="flex-shrink-0" />
                      <span className="text-[clamp(0.8rem,3vw,0.92rem)] font-semibold text-gray-700 leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>

              {error && <p className="brand-heading text-[clamp(0.8rem,3.2vw,0.9rem)] text-center">{error}</p>}
              {submitting && (
                <p className="text-[clamp(0.86rem,3.2vw,0.96rem)] brand-heading text-center font-semibold mt-[1vh]">
                  Sending proposal…
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
