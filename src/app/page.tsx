"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("ss_pid")) {
      router.replace("/play");
    } else {
      setChecking(false);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      localStorage.setItem("ss_pid", data.playerId);
      localStorage.setItem("ss_name", data.name);
      router.push("/play");
    } catch {
      setError("Connection error — please try again");
    } finally {
      setIsLoading(false);
    }
  }

  if (checking) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-8">
      <svg width="80" height="112" viewBox="0 0 80 112" aria-hidden="true">
        <circle cx="40" cy="20" r="19" fill="#F9B4E0" />
        <circle cx="40" cy="42" r="19" fill="#A8D8C0" />
        <circle cx="40" cy="62" r="19" fill="#F4A6B0" />
        <polygon points="40,108 15,62 65,62" fill="#D4934A" />
        <line x1="40" y1="62" x2="40" y2="108" stroke="#B87333" strokeWidth="1.2" />
        <line x1="27" y1="62" x2="33" y2="108" stroke="#B87333" strokeWidth="0.8" />
        <line x1="53" y1="62" x2="47" y2="108" stroke="#B87333" strokeWidth="0.8" />
      </svg>

      <div className="text-center">
        <h1 className="font-pacifico text-4xl text-amber-600 mb-2">ScoopShare</h1>
        <p className="text-gray-500 text-base">Trade scoops. Make friends. Win ice cream.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What's your name?"
            maxLength={30}
            autoFocus
            autoComplete="off"
            autoCapitalize="words"
            className="w-full text-lg px-4 py-3.5 rounded-2xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none bg-white placeholder:text-gray-300 text-gray-700"
          />
          {error && (
            <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:bg-amber-200 disabled:cursor-not-allowed text-white font-bold text-xl transition-colors"
        >
          {isLoading ? "Joining..." : "Join the Fun!"}
        </button>
      </form>
    </main>
  );
}
