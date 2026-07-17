import type { FlavorId, FlavorConfig } from "./types";

export const FLAVORS: Record<FlavorId, FlavorConfig> = {
  vanilla: { label: "Vanilla", color: "#F5E6C8", pattern: "solid" },
  chocolate: { label: "Chocolate", color: "#6B4226", pattern: "solid" },
  strawberry: { label: "Strawberry", color: "#F4A6B0", pattern: "swirl" },
  "mint-choc-chip": { label: "Mint Choc Chip", color: "#A8D8C0", pattern: "chips" },
  "cookies-and-cream": { label: "Cookies & Cream", color: "#EDEDED", pattern: "dots" },
  bubblegum: { label: "Bubblegum", color: "#F9B4E0", pattern: "sprinkles" },
};

export const FLAVOR_IDS = Object.keys(FLAVORS) as FlavorId[];

export function randomFlavor(): FlavorId {
  return FLAVOR_IDS[Math.floor(Math.random() * FLAVOR_IDS.length)];
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
