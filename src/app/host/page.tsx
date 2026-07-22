"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { MIN_PLAYERS_TO_START, WINNERS_TO_END_GAME } from "@/lib/flavors";
import type { GameResult } from "@/lib/types";

type GameStatus = "lobby" | "active" | "ended";
type Summary = {
  status: GameStatus;
  playerCount: number;
  joinedPlayers: { id: string; name: string; hasWon: boolean }[];
  winners: { name: string; wonAt: number | null }[];
  resultsHistory: GameResult[];
};

export default function HostPage() {
  const [summary, setSummary] = useState<Summary>({
    status: "lobby",
    playerCount: 0,
    joinedPlayers: [],
    winners: [],
    resultsHistory: [],
  });
  const [joinUrl, setJoinUrl] = useState("");
  const [qrSize, setQrSize] = useState(220);
  const [starting, setStarting] = useState(false);
  const [startingNewGame, setStartingNewGame] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingResults, setResettingResults] = useState(false);

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
    if (!confirm("Reset the current game? This clears the current players and round, but keeps the running results.")) return;
    setResetting(true);
    try {
      await fetch("/api/host/reset", { method: "POST" });
    } finally {
      setResetting(false);
    }
  }

  async function handleNewGame() {
    setStartingNewGame(true);
    try {
      await fetch("/api/host/new-game", { method: "POST" });
    } finally {
      setStartingNewGame(false);
    }
  }

  async function handleResetResults() {
    if (!confirm("Reset the running results list for all completed games?")) return;
    setResettingResults(true);
    try {
      await fetch("/api/host/reset-results", { method: "POST" });
    } finally {
      setResettingResults(false);
    }
  }

  const { status, playerCount, joinedPlayers, winners, resultsHistory } = summary;
  const displayUrl = joinUrl.replace(/^https?:\/\//, "");

  const resultsHistorySection = (
    <section className="rounded-[min(1.4rem,3vw)] border border-white/60 bg-white/68 px-[4vw] py-[2vh] shadow-sm backdrop-blur-md mt-[2vh]">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-[1.6vh]">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-pacifico text-[clamp(1.5rem,4vw,2.4rem)] brand-heading leading-tight">
            📋 Running Results
          </h2>
          <span className="text-[clamp(0.95rem,2.6vw,1.25rem)] font-bold text-gray-400">
            {resultsHistory.length} {resultsHistory.length === 1 ? "game" : "games"}
          </span>
        </div>
      </div>

      {resultsHistory.length === 0 ? (
        <p className="text-gray-400 text-[clamp(0.95rem,2.8vw,1.05rem)]">
          Completed game results will stack here.
        </p>
      ) : (
        <div className="flex flex-col gap-[1.5vh]">
          {resultsHistory
            .slice()
            .reverse()
            .map((result) => (
              <div
                key={result.gameNumber}
                className="rounded-[min(1.1rem,3vw)] border border-white/70 bg-white/84 px-[4vw] py-[1.8vh] backdrop-blur-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-[1vh]">
                  <p className="font-black text-[clamp(1rem,2.8vw,1.2rem)] text-gray-800">
                    Game {result.gameNumber}
                  </p>
                  <p className="text-gray-400 font-semibold text-[clamp(0.75rem,2vw,0.9rem)]">
                    {new Date(result.completedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-col gap-[0.7vh]">
                  {result.winners.map((winner) => (
                    <p
                      key={`${result.gameNumber}-${winner.playerId}-${winner.place}`}
                      className="text-[clamp(0.92rem,2.5vw,1rem)] text-gray-700"
                    >
                      <span className="font-black brand-heading">#{winner.place}</span>{" "}
                      <span className="font-semibold">{winner.name}</span>
                    </p>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="mt-[1.8vh] flex justify-end">
        <button
          onClick={handleResetResults}
          disabled={resettingResults}
          className="brand-button-secondary px-[4vw] py-[1.2vh] min-h-[2.8rem] rounded-[min(0.9rem,3vw)] border-2 disabled:opacity-50 font-semibold transition-colors text-[clamp(0.82rem,2.2vw,0.95rem)]"
        >
          {resettingResults ? "Resetting…" : "Reset Results"}
        </button>
      </div>
    </section>
  );

  // ── Pre-game (lobby) ───────────────────────────────────────────────────────
  if (status === "lobby") {
    return (
      <main className="min-h-[100dvh] px-[4vw] py-[4vh] overflow-x-hidden">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-[3vh]">
          <h1 className="font-pacifico text-[clamp(2.4rem,7vw,4rem)] brand-heading text-center leading-none">
            ScoopShare
          </h1>

          <div className="flex w-full flex-col gap-[3vh] xl:flex-row xl:items-start xl:justify-center xl:gap-[2vw]">
          <aside className="w-full xl:max-w-[25rem] xl:flex-shrink-0">
            <div className="rounded-[min(1.5rem,4vw)] border border-white/70 bg-white/80 px-[4vw] py-[2.4vh] shadow-md backdrop-blur-md xl:sticky xl:top-[4vh] xl:h-[calc(100dvh-25vh)] xl:px-[2vw]">
              <div className="flex h-full flex-col items-start">
                <p className="text-[clamp(0.82rem,1.2vw,0.98rem)] font-bold text-gray-400 uppercase tracking-[0.22em] mb-[1.6vh] text-left">
                  How To Play
                </p>
                <ul className="flex w-full flex-col text-[clamp(1rem,1.8vw,1.42rem)] leading-[1.28] brand-text-muted text-left">
                  <li className="py-[15px] border-t border-[rgba(107,62,38,0.16)]">Click the QR code and enter your name.</li>
                  <li className="py-[15px] border-t border-[rgba(107,62,38,0.16)]">Wait for the host to start the game.</li>
                  <li className="py-[15px] border-t border-[rgba(107,62,38,0.16)]">You will get a cone with 3 different scoops of ice cream.</li>
                  <li className="py-[15px] border-t border-[rgba(107,62,38,0.16)]">
                    <div>
                      Trade with other players to make all of your scoops the same flavour.
                      <span className="mt-[0.7vh] block text-[clamp(0.84rem,1.15vw,1rem)] leading-[1.35] brand-text-soft">
                        If you request a flavour someone doesn&apos;t have or they reject your trade, you get a 5 second timeout.
                      </span>
                    </div>
                  </li>
                  <li className="py-[15px] border-y border-[rgba(107,62,38,0.16)]">First, second, and third place are awarded in order.</li>
                </ul>
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col items-center gap-[3vh]">
            <div className="flex flex-col items-center gap-[4vh] w-full">
              <div className="flex flex-col sm:flex-row items-center gap-[4vh] w-full justify-center">
                {joinUrl && (
                  <div className="rounded-[min(1.5rem,4vw)] border border-white/70 bg-white/84 p-[min(1rem,2vh)] shadow-md backdrop-blur-md">
                    <QRCodeSVG
                      value={joinUrl}
                      size={qrSize}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                  </div>
                )}

                <div className="flex flex-col items-center sm:items-start gap-[2vh] w-full max-w-[92vw] sm:max-w-[28rem]">
                  <div className="text-center sm:text-left w-full">
                    <p className="text-[clamp(0.8rem,2vw,0.95rem)] font-bold text-gray-400 uppercase tracking-wider mb-[0.6vh]">
                      Join at
                    </p>
                    <p className="text-[clamp(1rem,3.5vw,1.6rem)] font-bold text-gray-700 font-mono break-all leading-tight">
                      {displayUrl || "loading…"}
                    </p>
                  </div>

                  <div className="rounded-[min(1.25rem,4vw)] border border-white/70 bg-white/78 px-[5vw] py-[2vh] shadow-sm text-center w-full sm:w-auto backdrop-blur-md">
                    <p className="text-[clamp(3rem,12vw,4.5rem)] font-black brand-heading leading-none">
                      {playerCount}
                    </p>
                    <p className="text-gray-500 font-semibold mt-[0.6vh] text-[clamp(0.9rem,2.6vw,1rem)]">
                      {playerCount === 1 ? "player joined" : "players joined"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-[92vw] max-w-[34rem] flex flex-col gap-[1.5vh]">
              <div className="rounded-[min(1.25rem,4vw)] border border-white/70 bg-white/78 px-[4vw] py-[1.8vh] shadow-sm backdrop-blur-md">
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
                    className="brand-chip px-[3vw] py-[0.7vh] rounded-full text-[clamp(0.82rem,2.4vw,0.95rem)] font-semibold"
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
                className="brand-button-primary w-full px-[6vw] py-[2vh] min-h-[3.75rem] rounded-[min(1.25rem,4vw)] disabled:cursor-not-allowed font-black text-[clamp(1.05rem,3.8vw,1.6rem)] transition-colors shadow-lg"
              >
                {starting
                  ? "Starting…"
                  : playerCount < MIN_PLAYERS_TO_START
                  ? `Need ${MIN_PLAYERS_TO_START} players to start`
                  : `Start Game — ${playerCount} ${playerCount === 1 ? "player" : "players"}`}
              </button>

              {resultsHistorySection}
            </div>
          </section>
          </div>
        </div>
      </main>
    );
  }

  // ── In-game / ended ────────────────────────────────────────────────────────
  const isEnded = status === "ended";

  return (
    <main className="min-h-[100dvh] flex flex-col px-[5vw] py-[3vh] gap-[2.5vh] overflow-x-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[1.8vh]">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-pacifico text-[clamp(2rem,5vw,3rem)] brand-heading leading-none">ScoopShare</h1>
          {isEnded && (
            <span className="brand-chip-mint font-bold px-[3vw] py-[0.7vh] rounded-full text-[clamp(0.72rem,2vw,0.9rem)]">
              GAME OVER
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Player count */}
          <div className="rounded-[min(1.1rem,3vw)] border border-white/70 bg-white/78 px-[4vw] py-[1.2vh] shadow-sm text-center min-w-[7rem] backdrop-blur-md">
            <p className="text-[clamp(1.8rem,5vw,2.8rem)] font-black brand-heading leading-none">{playerCount}</p>
            <p className="text-gray-400 font-semibold text-[clamp(0.75rem,2vw,0.9rem)] mt-[0.3vh]">
              {playerCount === 1 ? "player" : "players"}
            </p>
          </div>
          {isEnded && winners.length >= WINNERS_TO_END_GAME && (
            <button
              onClick={handleNewGame}
              disabled={startingNewGame}
              className="brand-button-primary px-[4vw] py-[1.2vh] min-h-[2.8rem] rounded-[min(0.9rem,3vw)] disabled:opacity-50 font-semibold transition-colors text-[clamp(0.82rem,2.2vw,0.95rem)]"
            >
              {startingNewGame ? "Starting…" : "New Game"}
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="brand-button-secondary px-[4vw] py-[1.2vh] min-h-[2.8rem] rounded-[min(0.9rem,3vw)] border-2 disabled:opacity-50 font-semibold transition-colors text-[clamp(0.82rem,2.2vw,0.95rem)]"
          >
            {resetting ? "Resetting…" : "Reset Game"}
          </button>
        </div>
      </div>

      {/* Players and winners */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(34rem,1.2fr)] gap-[2vh] items-start">
        <div className="flex flex-col gap-[2vh] xl:sticky xl:top-[3vh]">
          <section className="rounded-[min(1.4rem,3vw)] border border-white/60 bg-white/68 px-[4vw] py-[2vh] shadow-sm backdrop-blur-md">
            <div className="flex flex-wrap items-baseline gap-3 mb-[1.6vh]">
              <h2 className="font-pacifico text-[clamp(1.5rem,4vw,2.4rem)] brand-heading leading-tight">
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
                        ? "brand-chip-mint"
                        : "bg-white/82 text-gray-700 backdrop-blur-sm"
                    }`}
                  >
                    {player.name}{player.hasWon ? " 🏆" : ""}
                  </span>
                ))}
              </div>
            )}
          </section>

          {resultsHistorySection}
        </div>

        <section className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-3 mb-[2vh]">
          <h2 className="font-pacifico text-[clamp(1.8rem,4.8vw,3rem)] brand-heading leading-tight">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-[1.6vh]">
            {winners.map((w, i) => (
              <div
                key={`${w.name}-${w.wonAt}`}
                className={`grid grid-cols-[auto_1fr] items-center gap-[1.2rem] rounded-[min(1.4rem,3vw)] border-2 bg-white/84 px-[clamp(1rem,2vw,1.6rem)] py-[1.8vh] shadow-sm backdrop-blur-md min-h-[7.5rem] ${
                  i === 0 ? "border-[#ffc5d9]" : "border-transparent"
                }`}
              >
                <span
                  className={`text-[clamp(2rem,4vw,3.25rem)] font-black leading-none w-[4.5rem] text-center ${
                    i === 0 ? "brand-rank-1" : i === 1 ? "brand-rank-2" : "brand-rank-3"
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
