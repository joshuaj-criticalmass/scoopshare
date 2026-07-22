"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IceCreamCone } from "@/components/IceCreamCone";

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem("ss_pid");
    if (!storedPlayerId) {
      setChecking(false);
      return;
    }

    let cancelled = false;

    const validateStoredPlayer = async () => {
      try {
        const res = await fetch(`/api/state?playerId=${encodeURIComponent(storedPlayerId)}`);
        if (cancelled) return;

        if (res.ok) {
          router.replace("/play");
          return;
        }

        if (res.status === 404) {
          localStorage.removeItem("ss_pid");
          localStorage.removeItem("ss_name");
        }
      } catch {
        // If validation fails, stay on the join screen rather than trapping the player in /play.
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    void validateStoredPlayer();

    return () => {
      cancelled = true;
    };
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
    <main className="min-h-[100dvh] flex flex-col items-center justify-center px-[6vw] py-[4vh] gap-[3vh] overflow-x-hidden">
      <IceCreamCone
        scoops={["bubblegum", "mint-choc-chip", "strawberry"]}
        size="clamp(6.6rem, 28vw, 9rem)"
        animationMode="loop"
      />

      <div className="text-center max-w-[88vw]">
        <h1 className="font-pacifico text-[clamp(2.1rem,8.6vw,3.2rem)] leading-[0.95] brand-heading mb-[1vh]">ScoopShare</h1>
        <p className="brand-text-muted text-[clamp(0.95rem,3.8vw,1.125rem)] leading-snug">Trade scoops. Make friends. Win ice cream.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-[88vw] max-w-[24rem] flex flex-col gap-[1.8vh]">
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
            className="brand-input w-full text-[clamp(1rem,4.2vw,1.125rem)] px-[4vw] py-[1.8vh] rounded-[min(1.25rem,4vw)] border-2 focus:outline-none"
          />
          {error && (
            <p className="brand-heading text-[clamp(0.85rem,3.4vw,0.95rem)] mt-[1vh] text-center">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="brand-button-mint w-full py-[2vh] min-h-[3.5rem] rounded-[min(1.25rem,4vw)] disabled:cursor-not-allowed font-bold text-[clamp(1.05rem,4.6vw,1.35rem)] transition-colors"
        >
          {isLoading ? "Joining..." : "Join the Fun!"}
        </button>
      </form>
    </main>
  );
}
