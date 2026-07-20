"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { MIN_PLAYERS_TO_START } from "@/lib/flavors";

type GameStatus = "lobby" | "active" | "ended";
type Summary = {
  status: GameStatus;
  playerCount: number;
  joinedPlayers: { id: string; name: string; hasWon: boolean }[];
  winners: { name: string; wonAt: number | null }[];
};

export default function HostPage() {
  const [summary, setSummary] = useState<Summary>({
    status: "lobby",
    playerCount: 0,
    joinedPlayers: [],
    winners: [],
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [qrSize, setQrSize] = useState(220);
  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    setJoinUrl(window.location.origin);

    const updateQrSize = () => {
      setQrSize(Math.max(150, Math.min(window.innerWidth * 0.52, window.innerHeight * 0.32, 260)));
    };

    updateQrSize();
    window.addEventListener("resize", updateQrSize);
    return () => window.removeEventListener("resize", updateQrSize);
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

  const { status, playerCount, joinedPlayers, winners } = summary;
  const displayUrl = joinUrl.replace(/^https?:\/\//, "");

  // ── Pre-game (lobby) ───────────────────────────────────────────────────────
  if (status === "lobby") {
    return (
      <main className="min-h-[100dvh] flex flex-col items-center justify-center gap-[4vh] px-[6vw] py-[4vh] bg-amber-50 overflow-x-hidden">
        <h1 className="font-pacifico text-[clamp(2.4rem,7vw,4rem)] text-amber-600 text-center leading-none">ScoopShare</h1>

        <div className="flex flex-col sm:flex-row items-center gap-[4vh] w-full justify-center">
          {/* QR code */}
          {joinUrl && (
            <div className="bg-white p-[min(1rem,2vh)] rounded-[min(1.5rem,4vw)] shadow-md">
              <QRCodeSVG
                value={joinUrl}
                size={qrSize}
                bgColor="#ffffff"
                fgColor="#1a1a1a"
              />
            </div>
          )}

          {/* Info */}
          <div className="flex flex-col items-center sm:items-start gap-[2vh] w-full max-w-[92vw] sm:max-w-[28rem]">
            <div className="text-center sm:text-left w-full">
              <p className="text-[clamp(0.8rem,2vw,0.95rem)] font-bold text-gray-400 uppercase tracking-wider mb-[0.6vh]">
                Join at
              </p>
              <p className="text-[clamp(1rem,3.5vw,1.6rem)] font-bold text-gray-700 font-mono break-all leading-tight">
                {displayUrl || "loading…"}
              </p>
            </div>

            <div className="bg-white rounded-[min(1.25rem,4vw)] px-[5vw] py-[2vh] shadow-sm text-center w-full sm:w-auto">
              <p className="text-[clamp(3rem,12vw,4.5rem)] font-black text-amber-500 leading-none">
                {playerCount}
              </p>
              <p className="text-gray-500 font-semibold mt-[0.6vh] text-[clamp(0.9rem,2.6vw,1rem)]">
                {playerCount === 1 ? "player joined" : "players joined"}
              </p>
            </div>
          </div>
        </div>

        <div className="w-[92vw] max-w-[34rem] flex flex-col gap-[1.5vh]">
          <div className="bg-white rounded-[min(1.25rem,4vw)] px-[4vw] py-[1.8vh] shadow-sm">
            <p className="text-[clamp(0.8rem,2vw,0.95rem)] font-bold text-gray-400 uppercase tracking-wider mb-[1vh] text-center">
              Joined Players
            </p>
            {joinedPlayers.length === 0 ? (
              <p className="text-center text-gray-400 text-[clamp(0.9rem,2.8vw,1rem)]">
                Waiting for players to join…
              </p>
            ) : (
              <div className="flex flex-wrap justify-center gap-[1vh]">
                {joinedPlayers.map((player) => (
                  <span
                    key={player.id}
                    className="bg-amber-100 text-amber-800 px-[3vw] py-[0.7vh] rounded-full text-[clamp(0.82rem,2.4vw,0.95rem)] font-semibold"
                  >
                    {player.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={starting || playerCount < MIN_PLAYERS_TO_START}
            className="w-full px-[6vw] py-[2vh] min-h-[3.75rem] rounded-[min(1.25rem,4vw)] bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-black text-[clamp(1.05rem,3.8vw,1.6rem)] transition-colors shadow-lg"
          >
            {starting
              ? "Starting…"
              : playerCount < MIN_PLAYERS_TO_START
              ? `Need ${MIN_PLAYERS_TO_START} players to start`
              : `Start Game — ${playerCount} ${playerCount === 1 ? "player" : "players"}`}
          </button>
        </div>
      </main>
    );
  }

  // ── In-game / ended ────────────────────────────────────────────────────────
  const isEnded = status === "ended";

  return (
    <main className="min-h-[100dvh] flex flex-col px-[5vw] py-[3vh] bg-amber-50 gap-[2.5vh] overflow-x-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[1.8vh]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-pacifico text-[clamp(2rem,5vw,3rem)] text-amber-600 leading-none">ScoopShare</h1>
          {isEnded && (
            <span className="bg-amber-500 text-white font-bold px-[3vw] py-[0.7vh] rounded-full text-[clamp(0.72rem,2vw,0.9rem)]">
              GAME OVER
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Player count */}
          <div className="bg-white rounded-[min(1.1rem,3vw)] px-[4vw] py-[1.2vh] shadow-sm text-center min-w-[7rem]">
            <p className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-amber-500 leading-none">{playerCount}</p>
            <p className="text-gray-400 font-semibold text-[clamp(0.75rem,2vw,0.9rem)] mt-[0.3vh]">
              {playerCount === 1 ? "player" : "players"}
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="px-[4vw] py-[1.2vh] min-h-[2.8rem] rounded-[min(0.9rem,3vw)] border-2 border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 font-semibold transition-colors text-[clamp(0.82rem,2.2vw,0.95rem)]"
          >
            {resetting ? "Resetting…" : "Reset Game"}
          </button>
        </div>
      </div>

      {/* Players and winners */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-[2vh]">
        <section className="bg-white/70 rounded-[min(1.4rem,3vw)] px-[4vw] py-[2vh] shadow-sm">
          <div className="flex flex-wrap items-baseline gap-3 mb-[1.6vh]">
            <h2 className="font-pacifico text-[clamp(1.5rem,4vw,2.4rem)] text-amber-600 leading-tight">
              👥 Joined Players
            </h2>
            <span className="text-[clamp(0.95rem,2.6vw,1.25rem)] font-bold text-gray-400">
              {joinedPlayers.length}
            </span>
          </div>

          {joinedPlayers.length === 0 ? (
            <p className="text-gray-400 text-[clamp(1rem,3vw,1.25rem)]">No players joined.</p>
          ) : (
            <div className="flex flex-wrap gap-[1vh]">
              {joinedPlayers.map((player) => (
                <span
                  key={player.id}
                  className={`px-[3vw] py-[0.8vh] rounded-full text-[clamp(0.82rem,2.2vw,1rem)] font-semibold ${
                    player.hasWon
                      ? "bg-amber-200 text-amber-900"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {player.name}{player.hasWon ? " 🏆" : ""}
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
        <div className="flex flex-wrap items-baseline gap-3 mb-[2vh]">
          <h2 className="font-pacifico text-[clamp(1.8rem,4.8vw,3rem)] text-amber-600 leading-tight">
            {isEnded ? "🎉 Final Results" : winners.length === 0 ? "🍦 Game in progress…" : "🏆 Winners so far"}
          </h2>
          {winners.length > 0 && (
            <span className="text-[clamp(1rem,3vw,1.5rem)] font-bold text-gray-400">
              {winners.length} / {playerCount}
            </span>
          )}
        </div>

        {winners.length === 0 ? (
          <p className="text-gray-400 text-[clamp(1rem,3.4vw,1.5rem)]">
            First to collect 3 matching scoops wins!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1.6vh]">
            {winners.map((w, i) => (
              <div
                key={`${w.name}-${w.wonAt}`}
                className={`flex items-center gap-[3vw] bg-white rounded-[min(1.4rem,3vw)] px-[4vw] py-[1.8vh] shadow-sm border-2 ${
                  i === 0 ? "border-amber-400" : "border-transparent"
                }`}
              >
                <span
                  className={`text-[clamp(1.8rem,5vw,3rem)] font-black leading-none w-[14vw] max-w-[3.5rem] text-center ${
                    i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-300"
                  }`}
                >
                  #{i + 1}
                </span>
                <div>
                  <p className="font-black text-[clamp(1.15rem,3.6vw,1.9rem)] text-gray-800 leading-tight break-words">{w.name}</p>
                  {w.wonAt && (
                    <p className="text-gray-400 font-semibold text-[clamp(0.85rem,2.4vw,1.1rem)] mt-[0.4vh]">
                      {new Date(w.wonAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </section>
      </div>
    </main>
  );
}
