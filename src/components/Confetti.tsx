"use client";
import { useState } from "react";

const COLORS = [
  "#FFD700", "#FF6B6B", "#6BCB77", "#4D96FF",
  "#F9B4E0", "#F4A6B0", "#A8D8C0", "#FFB347",
];

interface Piece {
  id: number;
  left: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
  round: boolean;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 1.2,
    duration: 1.8 + Math.random() * 1.6,
    size: 7 + Math.random() * 8,
    round: Math.random() > 0.5,
  }));
}

export function Confetti({ count = 70 }: { count?: number }) {
  const [pieces] = useState(() => makePieces(count));

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: -p.size - 4,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}
    </div>
  );
}
