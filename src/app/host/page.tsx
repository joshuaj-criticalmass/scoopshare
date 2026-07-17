"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type GameStatus = "lobby" | "active" | "ended";
type Summary = {
  status: GameStatus;
  playerCount: number;
  winners: { name: string; wonAt: number | null }[];
};

export default function HostPage() {
  const [summary, setSummary] = useState<Summary>({
    status: "lobby",
    playerCount: 0,
    winners: [],
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setJoinUrl(process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/host/summary");
        if (res.ok) setSummary(await res.json());
      } catch {
        // network hiccup — keep showing last state
      }
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  async function handleStart() {
    setStarting(true);
    try {
      await fetch("/api/host/start", { method: "POST" });
    } finally {
      setStarting(false);
    }
  }

  async function handleReset() {
    if (!confirm("Reset the game? This removes all players and scores.")) return;
    setResetting(true);
    try {
      await fetch("/api/host/reset", { method: "POST" });
    } finally {
      setResetting(false);
    }
  }

  const { status, playerCount, winners } = summary;
  const displayUrl = joinUrl.replace(/^https?:\/\//, "");

  // ── Pre-game (lobby) ───────────────────────────────────────────────────────
  if (status === "lobby") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-10 px-8 py-12 bg-amber-50">
        <h1 className="font-pacifico text-5xl text-amber-600">ScoopShare</h1>

        <div className="flex flex-col sm:flex-row items-center gap-10">
          {/* QR code */}
          {joinUrl && (
            <div className="bg-white p-5 rounded-3xl shadow-md">
              <QRCodeSVG
                value={joinUrl}
                size={260}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col items-center sm:items-start gap-5">
            <div className="text-center sm:text-left">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                Join at
              </p>
              <p className="text-2xl font-bold text-gray-700 font-mono break-all">
                {displayUrl || "loading…"}
              </p>
            </div>

            <div className="bg-white rounded-2xl px-8 py-5 shadow-sm text-center">
              <p className="text-7xl font-black text-amber-500 leading-none">
                {playerCount}
              </p>
              <p className="text-gray-500 font-semibold mt-1">
                {playerCount === 1 ? "player joined" : "players joined"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={starting || playerCount === 0}
          className="px-12 py-5 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-black text-2xl transition-colors shadow-lg"
        >
          {starting
            ? "Starting…"
            : playerCount === 0
            ? "Waiting for players…"
            : `Start Game — ${playerCount} ${playerCount === 1 ? "player" : "players"}`}
        </button>
      </main>
    );
  }

  // ── In-game / ended ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col px-8 py-10 bg-amber-50 gap-8">
      <div className="flex justify-between items-center">
        <h1 className="font-pacifico text-4xl text-amber-600">ScoopShare</h1>
        <div className="flex items-center gap-5">
          <span className="text-gray-600 font-semibold text-lg">
            👥 {playerCount} {playerCount === 1 ? "player" : "players"}
          </span>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-5 py-2.5 rounded-xl border-2 border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 font-semibold transition-colors text-sm"
          >
            {resetting ? "Resetting…" : "Reset Game"}
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-pacifico text-3xl text-amber-600 mb-6">
          {winners.length === 0 ? "🍦 Game in progress…" : "🏆 Winners"}
        </h2>

        {winners.length === 0 ? (
          <p className="text-gray-400 text-xl">
            First to collect 3 matching scoops wins…
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-w-sm">
            {winners.map((w, i) => (
              <div
                key={`${w.name}-${w.wonAt}`}
                className="flex items-center gap-4 bg-white rounded-2xl px-6 py-4 shadow-sm"
              >
                <span className="text-3xl font-black text-amber-500 w-10">
                  #{i + 1}
                </span>
                <div>
                  <p className="font-bold text-lg text-gray-800">{w.name}</p>
                  {w.wonAt && (
                    <p className="text-sm text-gray-400">
                      {new Date(w.wonAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
