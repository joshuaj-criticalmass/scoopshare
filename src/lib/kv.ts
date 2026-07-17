/**
 * KV data layer — all Redis read/write logic lives here.
 * API routes should import from this file, never call redis directly.
 */

import { redis } from "./redis";
import { randomScoops } from "./flavors";
import type { Player, SwapProposal, GameState, FlavorId } from "./types";

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const KEY = {
  player: (id: string) => `player:${id}`,
  proposal: (id: string) => `proposal:${id}`,
  gameState: "game:state",
  playerIndex: "game:playerIndex",
  playerProposals: (playerId: string) => `game:proposalsByPlayer:${playerId}`,
} as const;

const PROPOSAL_TTL_MS = 2 * 60 * 1000; // 2 minutes

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

const DEFAULT_GAME_STATE: GameState = {
  status: "lobby",
  startedAt: null,
  endedAt: null,
};

export async function getGameState(): Promise<GameState> {
  const raw = await redis.get<GameState>(KEY.gameState);
  return raw ?? DEFAULT_GAME_STATE;
}

export async function setGameState(state: GameState): Promise<void> {
  await redis.set(KEY.gameState, state);
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function getPlayer(id: string): Promise<Player | null> {
  return redis.get<Player>(KEY.player(id));
}

export async function setPlayer(player: Player): Promise<void> {
  await redis.set(KEY.player(player.id), player);
}

export async function getAllPlayerIds(): Promise<string[]> {
  const members = await redis.smembers(KEY.playerIndex);
  return members as string[];
}

export async function getAllPlayers(): Promise<Player[]> {
  const ids = await getAllPlayerIds();
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(KEY.player(id));
  const results = await pipeline.exec();

  return (results as (Player | null)[]).filter((p): p is Player => p !== null);
}

/** Adds a playerId to the global index (idempotent). */
export async function addPlayerToIndex(playerId: string): Promise<void> {
  await redis.sadd(KEY.playerIndex, playerId);
}

/**
 * Returns a display name that's unique in the current player list.
 * Appends " (2)", " (3)", etc. if the name is already taken.
 */
export async function uniqueDisplayName(name: string): Promise<string> {
  const players = await getAllPlayers();
  const existingNames = new Set(players.map((p) => p.name));

  if (!existingNames.has(name)) return name;

  let n = 2;
  while (existingNames.has(`${name} (${n})`)) n++;
  return `${name} (${n})`;
}

// ---------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------

export async function getProposal(id: string): Promise<SwapProposal | null> {
  const proposal = await redis.get<SwapProposal>(KEY.proposal(id));
  if (!proposal) return null;

  // Lazily expire proposals older than 2 minutes
  if (
    proposal.status === "pending" &&
    Date.now() - proposal.createdAt > PROPOSAL_TTL_MS
  ) {
    const expired: SwapProposal = { ...proposal, status: "expired" };
    await setProposal(expired);
    return expired;
  }

  return proposal;
}

export async function setProposal(proposal: SwapProposal): Promise<void> {
  await redis.set(KEY.proposal(proposal.id), proposal);
}

/** Adds a proposalId to the target player's incoming proposal set. */
export async function addProposalForPlayer(
  playerId: string,
  proposalId: string
): Promise<void> {
  await redis.sadd(KEY.playerProposals(playerId), proposalId);
}

/** Removes a proposalId from the target player's incoming proposal set. */
export async function removeProposalForPlayer(
  playerId: string,
  proposalId: string
): Promise<void> {
  await redis.srem(KEY.playerProposals(playerId), proposalId);
}

/**
 * Returns all pending proposals addressed to a given player,
 * lazily expiring any that are too old.
 */
export async function getPendingProposalsForPlayer(
  playerId: string
): Promise<SwapProposal[]> {
  const ids = (await redis.smembers(KEY.playerProposals(playerId))) as string[];
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(KEY.proposal(id));
  const results = await pipeline.exec();

  const pending: SwapProposal[] = [];

  for (let i = 0; i < results.length; i++) {
    const proposal = results[i] as SwapProposal | null;
    if (!proposal) {
      // Orphaned ID — clean up
      await removeProposalForPlayer(playerId, ids[i]);
      continue;
    }

    if (
      proposal.status === "pending" &&
      Date.now() - proposal.createdAt > PROPOSAL_TTL_MS
    ) {
      const expired: SwapProposal = { ...proposal, status: "expired" };
      await setProposal(expired);
      await removeProposalForPlayer(playerId, proposal.id);
      continue;
    }

    if (proposal.status === "pending") {
      pending.push(proposal);
    } else {
      // No longer pending — clean up the index
      await removeProposalForPlayer(playerId, proposal.id);
    }
  }

  return pending;
}

// ---------------------------------------------------------------------------
// Game lifecycle
// ---------------------------------------------------------------------------

/**
 * Deals 3 random scoops to every player in the lobby and flips game status
 * to "active". Called by /api/host/start.
 */
export async function startGame(): Promise<void> {
  const players = await getAllPlayers();

  const pipeline = redis.pipeline();

  for (const player of players) {
    const updated: Player = {
      ...player,
      scoops: randomScoops(),
      hasWon: false,
      wonAt: null,
      lockedUntil: null,
    };
    pipeline.set(KEY.player(player.id), updated);
  }

  pipeline.set(KEY.gameState, {
    status: "active",
    startedAt: Date.now(),
    endedAt: null,
  } satisfies GameState);

  await pipeline.exec();
}

/**
 * Wipes all players, proposals, and game state back to a clean lobby.
 * Called by /api/host/reset.
 */
export async function resetGame(): Promise<void> {
  const [playerIds, proposalPlayerIds] = await Promise.all([
    getAllPlayerIds(),
    // Scan for all proposalsByPlayer keys
    redis.smembers(KEY.playerIndex),
  ]);

  // Collect all proposal IDs from every player's inbox
  const allProposalIds: string[] = [];
  if (playerIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const pid of playerIds) {
      pipeline.smembers(KEY.playerProposals(pid));
    }
    const results = await pipeline.exec();
    for (const r of results as string[][]) {
      if (Array.isArray(r)) allProposalIds.push(...r);
    }
  }

  // Delete everything in one pipeline
  const pipeline = redis.pipeline();

  for (const id of playerIds) {
    pipeline.del(KEY.player(id));
    pipeline.del(KEY.playerProposals(id));
  }

  const uniqueProposalIds = Array.from(new Set(allProposalIds));
  for (const id of uniqueProposalIds) {
    pipeline.del(KEY.proposal(id));
  }

  pipeline.del(KEY.playerIndex);
  pipeline.del(KEY.gameState);

  await pipeline.exec();
}

// ---------------------------------------------------------------------------
// Win check
// ---------------------------------------------------------------------------

export function checkWin(scoops: [FlavorId, FlavorId, FlavorId]): boolean {
  return scoops[0] === scoops[1] && scoops[1] === scoops[2];
}

// ---------------------------------------------------------------------------
// Propose a swap
// ---------------------------------------------------------------------------

export type ProposeResult =
  | { ok: true; proposalId: string }
  | { ok: false; code: "locked"; lockedUntil: number }
  | { ok: false; code: "no_offer_scoop" | "game_not_active" | "not_found" | "same_player" }
  | { ok: false; code: "no_match"; lockedUntil: number };

export async function proposeSwap(
  fromPlayerId: string,
  toPlayerId: string,
  offeredFlavor: FlavorId,
  requestedFlavor: FlavorId
): Promise<ProposeResult> {
  if (fromPlayerId === toPlayerId) return { ok: false, code: "same_player" };

  const [gameState, fromPlayer, toPlayer] = await Promise.all([
    getGameState(),
    getPlayer(fromPlayerId),
    getPlayer(toPlayerId),
  ]);

  if (gameState.status !== "active") return { ok: false, code: "game_not_active" };
  if (!fromPlayer || !toPlayer) return { ok: false, code: "not_found" };

  // Rule 1 — proposer locked?
  if (fromPlayer.lockedUntil !== null && Date.now() < fromPlayer.lockedUntil) {
    return { ok: false, code: "locked", lockedUntil: fromPlayer.lockedUntil };
  }

  // Rule 2 — proposer holds offeredFlavor?
  if (!fromPlayer.scoops.includes(offeredFlavor)) {
    return { ok: false, code: "no_offer_scoop" };
  }

  // Rule 3 — target holds requestedFlavor? (no-match → lock proposer)
  if (!toPlayer.scoops.includes(requestedFlavor)) {
    const lockedUntil = Date.now() + 5000;
    await setPlayer({ ...fromPlayer, lockedUntil });
    return { ok: false, code: "no_match", lockedUntil };
  }

  const proposal: SwapProposal = {
    id: crypto.randomUUID(),
    fromPlayerId,
    fromPlayerName: fromPlayer.name,
    toPlayerId,
    offeredFlavor,
    requestedFlavor,
    status: "pending",
    createdAt: Date.now(),
  };

  await Promise.all([
    setProposal(proposal),
    addProposalForPlayer(toPlayerId, proposal.id),
  ]);

  return { ok: true, proposalId: proposal.id };
}

// ---------------------------------------------------------------------------
// Respond to an incoming proposal (accept or decline)
// ---------------------------------------------------------------------------

export type RespondResult =
  | { ok: true; accepted: true; newScoops: [FlavorId, FlavorId, FlavorId]; hasWon: boolean }
  | { ok: true; accepted: false }
  | { ok: false; code: "not_found" | "expired" | "wrong_player" | "stale" };

export async function respondToProposal(
  proposalId: string,
  accept: boolean,
  respondingPlayerId: string
): Promise<RespondResult> {
  const proposal = await getProposal(proposalId);

  if (!proposal) return { ok: false, code: "not_found" };
  if (proposal.status !== "pending") return { ok: false, code: "expired" };
  if (proposal.toPlayerId !== respondingPlayerId) return { ok: false, code: "wrong_player" };

  if (!accept) {
    const proposer = await getPlayer(proposal.fromPlayerId);
    await Promise.all([
      setProposal({ ...proposal, status: "declined" }),
      removeProposalForPlayer(respondingPlayerId, proposalId),
      ...(proposer ? [setPlayer({ ...proposer, lockedUntil: Date.now() + 5000 })] : []),
    ]);
    return { ok: true, accepted: false };
  }

  // Accept — re-validate both players still hold the required scoops
  const [fromPlayer, toPlayer] = await Promise.all([
    getPlayer(proposal.fromPlayerId),
    getPlayer(proposal.toPlayerId),
  ]);

  if (!fromPlayer || !toPlayer) {
    await Promise.all([
      setProposal({ ...proposal, status: "expired" }),
      removeProposalForPlayer(respondingPlayerId, proposalId),
    ]);
    return { ok: false, code: "stale" };
  }

  if (
    !fromPlayer.scoops.includes(proposal.offeredFlavor) ||
    !toPlayer.scoops.includes(proposal.requestedFlavor)
  ) {
    await Promise.all([
      setProposal({ ...proposal, status: "expired" }),
      removeProposalForPlayer(respondingPlayerId, proposalId),
    ]);
    return { ok: false, code: "stale" };
  }

  // Swap one occurrence of each flavor
  const newFromScoops = [...fromPlayer.scoops] as [FlavorId, FlavorId, FlavorId];
  const newToScoops = [...toPlayer.scoops] as [FlavorId, FlavorId, FlavorId];
  newFromScoops[newFromScoops.indexOf(proposal.offeredFlavor)] = proposal.requestedFlavor;
  newToScoops[newToScoops.indexOf(proposal.requestedFlavor)] = proposal.offeredFlavor;

  const fromWins = checkWin(newFromScoops);
  const toWins = checkWin(newToScoops);
  const now = Date.now();

  await Promise.all([
    setPlayer({
      ...fromPlayer,
      scoops: newFromScoops,
      hasWon: fromPlayer.hasWon || fromWins,
      wonAt: fromWins && !fromPlayer.hasWon ? now : fromPlayer.wonAt,
    }),
    setPlayer({
      ...toPlayer,
      scoops: newToScoops,
      hasWon: toPlayer.hasWon || toWins,
      wonAt: toWins && !toPlayer.hasWon ? now : toPlayer.wonAt,
    }),
    setProposal({ ...proposal, status: "accepted" }),
    removeProposalForPlayer(respondingPlayerId, proposalId),
  ]);

  return { ok: true, accepted: true, newScoops: newToScoops, hasWon: toPlayer.hasWon || toWins };
}
