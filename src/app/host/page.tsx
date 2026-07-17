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
    setJoinUrl(window.location.origin);
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
  const isEnded = status === "ended";

  return (
    <main className="min-h-screen flex flex-col px-8 py-10 bg-amber-50 gap-8">
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-5">
          <h1 className="font-pacifico text-4xl text-amber-600">ScoopShare</h1>
          {isEnded && (
            <span className="bg-amber-500 text-white font-bold px-4 py-1.5 rounded-full text-sm">
              GAME OVER
            </span>
          )}
        </div>
        <div className="flex items-center gap-5">
          {/* Player count */}
          <div className="bg-white rounded-2xl px-6 py-3 shadow-sm text-center">
            <p className="text-4xl font-black text-amber-500 leading-none">{playerCount}</p>
            <p className="text-gray-400 font-semibold text-sm mt-0.5">
              {playerCount === 1 ? "player" : "players"}
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-5 py-2.5 rounded-xl border-2 border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 font-semibold transition-colors text-sm"
          >
            {resetting ? "Resetting…" : "Reset Game"}
          </button>
        </div>
      </div>

      {/* Winners section */}
      <div className="flex-1">
        <div className="flex items-baseline gap-4 mb-6">
          <h2 className="font-pacifico text-4xl text-amber-600">
            {isEnded ? "🎉 Final Results" : winners.length === 0 ? "🍦 Game in progress…" : "🏆 Winners so far"}
          </h2>
          {winners.length > 0 && (
            <span className="text-2xl font-bold text-gray-400">
              {winners.length} / {playerCount}
            </span>
          )}
        </div>

        {winners.length === 0 ? (
          <p className="text-gray-400 text-2xl">
            First to collect 3 matching scoops wins!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {winners.map((w, i) => (
              <div
                key={`${w.name}-${w.wonAt}`}
                className={`flex items-center gap-5 bg-white rounded-3xl px-7 py-5 shadow-sm border-2 ${
                  i === 0 ? "border-amber-400" : "border-transparent"
                }`}
              >
                <span
                  className={`text-5xl font-black leading-none w-14 text-center ${
                    i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-300"
                  }`}
                >
                  #{i + 1}
                </span>
                <div>
                  <p className="font-black text-3xl text-gray-800 leading-tight">{w.name}</p>
                  {w.wonAt && (
                    <p className="text-gray-400 font-semibold text-lg mt-0.5">
                      {new Date(w.wonAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
