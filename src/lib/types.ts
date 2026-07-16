export type FlavorId =
  | "vanilla"
  | "chocolate"
  | "strawberry"
  | "mint-choc-chip"
  | "cookies-and-cream"
  | "bubblegum";

export type FlavorPattern = "solid" | "dots" | "swirl" | "chips" | "sprinkles";

export type FlavorConfig = {
  label: string;
  color: string;
  pattern: FlavorPattern;
};

export type Player = {
  id: string;
  name: string;
  scoops: [FlavorId, FlavorId, FlavorId];
  joinedAt: number;
  hasWon: boolean;
  wonAt: number | null;
  lockedUntil: number | null;
};

export type SwapProposal = {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredFlavor: FlavorId;
  requestedFlavor: FlavorId;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: number;
};

export type GameStatus = "lobby" | "active" | "ended";

export type GameState = {
  status: GameStatus;
  startedAt: number | null;
  endedAt: number | null;
};
