"use client";
import { useEffect, useRef, useState } from "react";
import type { FlavorId } from "@/lib/types";
import { FLAVORS, FLAVOR_IDS } from "@/lib/flavors";

interface PlayerSummary {
  id: string;
  name: string;
  hasWon: boolean;
}

interface ProposeModalProps {
  playerId: string;
  playerScoops: [FlavorId, FlavorId, FlavorId];
  onClose: () => void;
  onNoMatch: (lockedUntil: number) => void;
}

const SCOOP_LABELS = ["Top", "Middle", "Bottom"] as const;

export function ProposeModal({ playerId, playerScoops, onClose, onNoMatch }: ProposeModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSummary | null>(null);
  const [offeredFlavor, setOfferedFlavor] = useState<FlavorId | null>(null);
  const [requestedFlavor, setRequestedFlavor] = useState<FlavorId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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

  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit() {
    if (!selectedPlayer || !offeredFlavor || !requestedFlavor) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromPlayerId: playerId,
          toPlayerId: selectedPlayer.id,
          offeredFlavor,
          requestedFlavor,
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
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Back"
              >
                ←
              </button>
            )}
            <h2 className="font-pacifico text-lg text-amber-600">
              {step === 1 && "Trade with…"}
              {step === 2 && "You're offering…"}
              {step === 3 && "You want back…"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex gap-1.5 px-5 py-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-amber-400" : "bg-gray-100"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">

          {/* ── Step 1: Pick a player ── */}
          {step === 1 && (
            <div className="flex flex-col gap-3 pt-2">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full px-4 py-3 rounded-2xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-gray-700 placeholder:text-gray-300"
              />
              {loadingPlayers ? (
                <p className="text-center text-gray-400 py-6">Loading players…</p>
              ) : filteredPlayers.length === 0 ? (
                <p className="text-center text-gray-400 py-6">No players found</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {filteredPlayers.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setSelectedPlayer(p);
                          setStep(2);
                        }}
                        className="w-full text-left px-4 py-3.5 rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-gray-700">{p.name}</span>
                        {p.hasWon && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Winner 🏆</span>}
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
              <p className="text-sm text-gray-500 text-center">
                Trading with <strong>{selectedPlayer?.name}</strong>
              </p>
              {playerScoops.map((flavor, i) => {
                const { label, color } = FLAVORS[flavor];
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setOfferedFlavor(flavor);
                      setStep(3);
                    }}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                  >
                    <span
                      className="w-10 h-10 rounded-full border-2 border-white shadow flex-shrink-0"
                      style={{ background: color }}
                    />
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{SCOOP_LABELS[i]}</p>
                      <p className="font-semibold text-gray-700">{label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 3: Pick flavor to request ── */}
          {step === 3 && (
            <div className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-gray-500 text-center">
                Giving up <strong>{offeredFlavor ? FLAVORS[offeredFlavor].label : ""}</strong> — what do you want?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {FLAVOR_IDS.map((fid) => {
                  const { label, color } = FLAVORS[fid];
                  const selected = requestedFlavor === fid;
                  return (
                    <button
                      key={fid}
                      onClick={() => setRequestedFlavor(fid)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-2xl border-2 transition-colors ${
                        selected
                          ? "border-amber-400 bg-amber-50"
                          : "border-gray-100 hover:border-amber-200 hover:bg-amber-50"
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-full border-2 border-white shadow flex-shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-sm font-semibold text-gray-700 text-left leading-tight">{label}</span>
                    </button>
                  );
                })}
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={!requestedFlavor || submitting}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors mt-2"
              >
                {submitting ? "Sending…" : "Send Proposal"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
