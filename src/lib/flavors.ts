import type { FlavorId, FlavorConfig } from "./types";

export const FLAVORS: Record<FlavorId, FlavorConfig> = {
  vanilla: { label: "Vanilla", color: "#F5E6C8", pattern: "solid" },
  chocolate: { label: "Chocolate", color: "#6B4226", pattern: "solid" },
  strawberry: { label: "Strawberry", color: "#F4A6B0", pattern: "swirl" },
  ube: { label: "Ube", color: "#B993D6", pattern: "swirl" },
  pistachio: { label: "Pistachio", color: "#B8D59B", pattern: "solid" },
  "mint-choc-chip": { label: "Mint Choc Chip", color: "#A8D8C0", pattern: "chips" },
  "cookies-and-cream": { label: "Cookies & Cream", color: "#EDEDED", pattern: "dots" },
  bubblegum: { label: "Bubblegum", color: "#F9B4E0", pattern: "sprinkles" },
};

export const FLAVOR_IDS = Object.keys(FLAVORS) as FlavorId[];
export const MIN_PLAYERS_TO_START = 3;
export const WINNERS_TO_END_GAME = 3;

export function randomFlavor(): FlavorId {
  return FLAVOR_IDS[Math.floor(Math.random() * FLAVOR_IDS.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function rotateScoops(
  scoops: [FlavorId, FlavorId, FlavorId],
  offset: number
): [FlavorId, FlavorId, FlavorId] {
  return [
    scoops[offset % 3],
    scoops[(offset + 1) % 3],
    scoops[(offset + 2) % 3],
  ];
}

export function randomScoops(): [FlavorId, FlavorId, FlavorId] {
  const pool = [...FLAVOR_IDS];
  const scoops: FlavorId[] = [];

  for (let i = 0; i < 3; i++) {
    const index = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(index, 1);
    scoops.push(picked);
  }

  return scoops as [FlavorId, FlavorId, FlavorId];
}

export function dealOpeningHands(
  playerCount: number
): [FlavorId, FlavorId, FlavorId][] {
  if (playerCount < MIN_PLAYERS_TO_START) {
    throw new Error(`At least ${MIN_PLAYERS_TO_START} players are required to start`);
  }

  const hands: [FlavorId, FlavorId, FlavorId][] = [];
  const shuffledFlavors = shuffle(FLAVOR_IDS);
  const trioA = shuffledFlavors.slice(0, 3) as [FlavorId, FlavorId, FlavorId];
  const trioB = shuffledFlavors.slice(3, 6) as [FlavorId, FlavorId, FlavorId];

  // The first 3 players guarantee 3 copies of 3 flavors, so 3 winners are always possible.
  for (let offset = 0; offset < 3 && hands.length < playerCount; offset++) {
    hands.push(rotateScoops(trioA, offset));
  }

  // If there are 6+ players, guarantee the same for the remaining 3 flavors too.
  if (playerCount >= 6) {
    for (let offset = 0; offset < 3 && hands.length < playerCount; offset++) {
      hands.push(rotateScoops(trioB, offset));
    }
  }

  while (hands.length < playerCount) {
    hands.push(rotateScoops(randomScoops(), hands.length % 3));
  }

  return shuffle(hands);
}
