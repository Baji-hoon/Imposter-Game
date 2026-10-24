import type {
  Phase,
  Player,
  Settings,
  RoundSecret,
  StateSync,
  WordPair,
} from './types';
import { scoreRound } from './scoring';
import { getAvailablePairs } from './words';
import { AVATAR_OPTIONS } from './avatars';

export const MODIFIER_SOMETIMES_P = 0.25;

export interface GameState {
  room: string;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: Record<string, Player>;
  playerOrder: string[];
  settings: Settings;
  scores: Record<string, number>;
  usedPairKeys: string[];
  imposterHistory: Record<string, number>; // playerId -> consecutive imposter count
  currentSecret: RoundSecret | null;
  currentVoteIndex: number;
  currentVotes: Record<string, string>; // voterId -> targetId
  roundVotesByIndex: Record<string, string>[];
  roundRemovedIds: string[];
  lastVoteResult: {
    tallies: Record<string, number>;
    removedId: string | null;
    roles: Record<string, 'civilian' | 'imposter'>;
    words: { civilian: string; imposter: string | null };
    scoreDelta: Record<string, number>;
  } | null;
  processedCmdIds: string[];
  awards: { title: string; playerId: string; desc: string }[];
  seq: number;
}

export type GameAction =
  | { type: 'JOIN'; player: { id: string; name: string; avatar: string } }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'SET_PRESENT'; playerId: string; present: boolean }
  | { type: 'KICK'; playerId: string }
  | { type: 'TRANSFER_HOST'; playerId: string }
  | { type: 'SET_SETTINGS'; settings: Settings }
  | { type: 'START_GAME' }
  | { type: 'DEAL' }
  | { type: 'OPEN_VOTE' }
  | { type: 'SUBMIT_VOTE'; playerId: string; targetId: string; voteIndex: number; cmdId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'PLAY_AGAIN' };

export interface ReducerResult {
  state: GameState;
  effects: {
    broadcast?: boolean;
    syncPlayerId?: string;
  }[];
}

export type Rng = () => number;

/**
 * Creates an initial game room.
 */
export function createRoom(
  room: string,
  hostId: string,
  customSettings?: Partial<Settings>
): GameState {
  const settings: Settings = {
    rounds: 5,
    imposterCount: 1,
    blankImposter: 'off',
    oneWordRound: 'off',
    packs: ['everyday', 'animals', 'food', 'places', 'mixed'],
    difficulty: 'mixed',
    ...customSettings,
  };

  return {
    room,
    hostId,
    phase: 'LOBBY',
    round: 0,
    totalRounds: settings.rounds,
    players: {},
    playerOrder: [],
    settings,
    scores: {},
    usedPairKeys: [],
    imposterHistory: {},
    currentSecret: null,
    currentVoteIndex: 0,
    currentVotes: {},
    roundVotesByIndex: [],
    roundRemovedIds: [],
    lastVoteResult: null,
    processedCmdIds: [],
    awards: [],
    seq: 1,
  };
}

/**
 * Resolves votes for a round.
 * Tie for most votes -> nobody removed (removedId: null).
 */
export function resolveVote(
  votes: Record<string, string>,
  eligibleTargetIds: string[]
): { removedId: string | null; tallies: Record<string, number> } {
  const tallies: Record<string, number> = {};
  for (const id of eligibleTargetIds) {
    tallies[id] = 0;
  }

  for (const targetId of Object.values(votes)) {
    if (tallies[targetId] !== undefined) {
      tallies[targetId]++;
    }
  }

  let maxVotes = -1;
  let topCandidates: string[] = [];

  for (const [id, count] of Object.entries(tallies)) {
    if (count > maxVotes) {
      maxVotes = count;
      topCandidates = [id];
    } else if (count === maxVotes && maxVotes > 0) {
      topCandidates.push(id);
    }
  }

  // If no votes or a tie for most votes, nobody is removed
  if (maxVotes <= 0 || topCandidates.length !== 1) {
    return { removedId: null, tallies };
  }

  return { removedId: topCandidates[0], tallies };
}

/**
 * Deals a round: picks a pair, selects imposters, assigns roles/words.
 */
export function dealRound(
  state: GameState,
  rng: Rng = Math.random
): { secret: RoundSecret; usedPairKey: string } {
  const eligiblePlayers = state.playerOrder.filter((id) => state.players[id]?.present);
  const playerCount = eligiblePlayers.length;

  // Determine imposter count (2 only if allowed and playerCount >= 8)
  const imposterCount =
    state.settings.imposterCount === 2 && playerCount >= 8 ? 2 : 1;

  // Select imposters with soft fairness: no player imposter 3 times in row when >= 5 players
  const candidates = [...eligiblePlayers];
  if (playerCount >= 5) {
    // Filter out players who had 2 consecutive rounds as imposter
    const filtered = candidates.filter((id) => (state.imposterHistory[id] || 0) < 2);
    if (filtered.length >= imposterCount) {
      candidates.length = 0;
      candidates.push(...filtered);
    }
  }

  // Uniform shuffle for candidate selection
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const imposterIds = candidates.slice(0, imposterCount);

  // Pick word pair
  const availablePairs = getAvailablePairs(state.settings);
  let unusedPairs = availablePairs.filter(
    (p) => !state.usedPairKeys.includes(`${p.a}:${p.b}`)
  );

  // If exhausted, reset pool
  if (unusedPairs.length === 0) {
    unusedPairs = [...availablePairs];
  }

  const pairIndex = Math.floor(rng() * unusedPairs.length);
  const pair: WordPair = unusedPairs[pairIndex] || {
    a: 'egg',
    b: 'ball',
    difficulty: 'easy',
  };
  const pairKey = `${pair.a}:${pair.b}`;

  // 50/50 swap word A vs word B
  const swap = rng() < 0.5;
  const civilianWord = swap ? pair.b : pair.a;
  const imposterBaseWord = swap ? pair.a : pair.b;

  // Modifiers
  const shouldBlank =
    state.settings.blankImposter === 'every' ||
    (state.settings.blankImposter === 'sometimes' && rng() < MODIFIER_SOMETIMES_P);

  const shouldOneWord =
    state.settings.oneWordRound === 'every' ||
    (state.settings.oneWordRound === 'sometimes' && rng() < MODIFIER_SOMETIMES_P);

  const imposterWord = shouldBlank ? null : imposterBaseWord;

  const secret: RoundSecret = {
    roundId: `r-${state.round + 1}-${Math.floor(rng() * 10000)}`,
    civilianWord,
    imposterWord,
    imposterIds,
    blank: shouldBlank,
    oneWord: shouldOneWord,
  };

  return { secret, usedPairKey: pairKey };
}

/**
 * Returns the strictly private view for a player (viewFor).
 * Privacy rule: A player NEVER receives another player's word or role until REVEAL.
 */
export function viewFor(state: GameState, playerId: string): StateSync {
  const isPresent = state.players[playerId]?.present ?? false;
  const isGhost = state.players[playerId]?.ghost ?? false;

  let myWord: string | null = null;
  let hasWord = false;

  if (state.currentSecret && isPresent && state.phase !== 'LOBBY' && state.phase !== 'GAME_OVER') {
    const isImposter = state.currentSecret.imposterIds.includes(playerId);
    myWord = isImposter ? state.currentSecret.imposterWord : state.currentSecret.civilianWord;
    hasWord = true;
  }

  // Which votes has this player submitted in current round?
  const voted = state.roundVotesByIndex.map((voteMap) => voteMap[playerId] !== undefined);
  if (state.phase === 'VOTING') {
    voted[state.currentVoteIndex] = state.currentVotes[playerId] !== undefined;
  }

  const playersList = state.playerOrder
    .map((id) => state.players[id])
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      present: p.present,
      ghost: p.ghost,
    }));

  return {
    seq: state.seq,
    room: state.room,
    hostId: state.hostId,
    phase: state.phase,
    round: state.round,
    totalRounds: state.totalRounds,
    players: playersList,
    me: {
      id: playerId,
      word: myWord,
      hasWord,
      voted,
    },
    settings: state.settings,
    scores: { ...state.scores },
    modifiers: {
      oneWord: state.currentSecret?.oneWord ?? false,
    },
  };
}

/**
 * Computes end-of-game awards.
 */
export function computeAwards(
  state: GameState
): { title: string; playerId: string; desc: string }[] {
  const players = Object.values(state.players);
  if (players.length === 0) return [];

  // Sort by scores
  const sorted = [...players].sort((a, b) => (state.scores[b.id] || 0) - (state.scores[a.id] || 0));

  return [
    {
      title: 'Sharpest Detective',
      playerId: sorted[0]?.id || players[0].id,
      desc: 'Top score and eagle eye for deceit',
    },
    {
      title: 'Best Liar',
      playerId: sorted[1]?.id || players[0].id,
      desc: 'Master of staying unnoticed in plain sight',
    },
    {
      title: 'Most Suspicious',
      playerId: sorted[sorted.length - 1]?.id || players[0].id,
      desc: 'Draws the most nervous glances in the circle',
    },
    {
      title: 'Got Caught Every Time',
      playerId: sorted[Math.floor(sorted.length / 2)]?.id || players[0].id,
      desc: 'Better luck next time!',
    },
  ];
}

/**
 * Pure state reducer.
 */
export function reduce(
  state: GameState,
  action: GameAction,
  rng: Rng = Math.random
): ReducerResult {
  const nextSeq = state.seq + 1;

  switch (action.type) {
    case 'JOIN': {
      const { id, name, avatar } = action.player;
      const existing = state.players[id];

      // Ensure no two players in the room have the same avatar
      const otherPlayers = Object.values(state.players).filter((p) => p.id !== id);
      const takenAvatars = new Set(otherPlayers.map((p) => p.avatar));

      let assignedAvatar = avatar || (existing ? existing.avatar : '');
      if (!assignedAvatar || takenAvatars.has(assignedAvatar)) {
        // Pick an unused avatar from AVATAR_OPTIONS
        const available = AVATAR_OPTIONS.filter((opt) => !takenAvatars.has(opt));
        if (available.length > 0) {
          const idx = Math.floor(rng() * available.length);
          assignedAvatar = available[idx];
        } else {
          // Pool exhausted (rare: > 24 players)
          assignedAvatar = AVATAR_OPTIONS[Math.floor(rng() * AVATAR_OPTIONS.length)];
        }
      }

      const updatedPlayers = {
        ...state.players,
        [id]: {
          id,
          name: (name && name.trim()) || (existing ? existing.name : 'Player'),
          avatar: assignedAvatar,
          present: true,
          ghost: existing ? existing.ghost : false,
          score: existing ? existing.score : 0,
        },
      };

      const updatedOrder = state.playerOrder.includes(id)
        ? state.playerOrder
        : [...state.playerOrder, id];

      const updatedScores = {
        ...state.scores,
        [id]: state.scores[id] ?? 0,
      };

      return {
        state: {
          ...state,
          players: updatedPlayers,
          playerOrder: updatedOrder,
          scores: updatedScores,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'LEAVE': {
      const p = state.players[action.playerId];
      if (!p) return { state, effects: [] };

      // In lobby, completely remove; in-game mark not present
      if (state.phase === 'LOBBY') {
        const nextPlayers = { ...state.players };
        delete nextPlayers[action.playerId];
        const nextOrder = state.playerOrder.filter((id) => id !== action.playerId);
        return {
          state: {
            ...state,
            players: nextPlayers,
            playerOrder: nextOrder,
            seq: nextSeq,
          },
          effects: [{ broadcast: true }],
        };
      }

      return {
        state: {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: { ...p, present: false },
          },
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'SET_PRESENT': {
      const p = state.players[action.playerId];
      if (!p) return { state, effects: [] };

      return {
        state: {
          ...state,
          players: {
            ...state.players,
            [action.playerId]: { ...p, present: action.present },
          },
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'KICK': {
      const nextPlayers = { ...state.players };
      delete nextPlayers[action.playerId];
      const nextOrder = state.playerOrder.filter((id) => id !== action.playerId);
      return {
        state: {
          ...state,
          players: nextPlayers,
          playerOrder: nextOrder,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'TRANSFER_HOST': {
      if (!state.players[action.playerId]) return { state, effects: [] };
      return {
        state: {
          ...state,
          hostId: action.playerId,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'SET_SETTINGS': {
      if (state.phase !== 'LOBBY') return { state, effects: [] };
      return {
        state: {
          ...state,
          settings: action.settings,
          totalRounds: action.settings.rounds,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'START_GAME': {
      const presentCount = state.playerOrder.filter((id) => state.players[id]?.present).length;
      if (presentCount < 3) return { state, effects: [] };

      return {
        state: {
          ...state,
          phase: 'DEALING',
          round: 0,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'DEAL': {
      if (state.phase !== 'DEALING' && state.phase !== 'SCORES') return { state, effects: [] };

      const { secret, usedPairKey } = dealRound(state, rng);

      // Reset ghosts for the new round
      const nextPlayers = { ...state.players };
      for (const id of Object.keys(nextPlayers)) {
        nextPlayers[id] = { ...nextPlayers[id], ghost: false };
      }

      // Update imposter consecutive history
      const nextImposterHistory: Record<string, number> = {};
      for (const id of state.playerOrder) {
        if (secret.imposterIds.includes(id)) {
          nextImposterHistory[id] = (state.imposterHistory[id] || 0) + 1;
        } else {
          nextImposterHistory[id] = 0;
        }
      }

      return {
        state: {
          ...state,
          phase: 'TALKING',
          round: state.round + 1,
          players: nextPlayers,
          currentSecret: secret,
          usedPairKeys: [...state.usedPairKeys, usedPairKey],
          imposterHistory: nextImposterHistory,
          currentVoteIndex: 0,
          currentVotes: {},
          roundVotesByIndex: [],
          roundRemovedIds: [],
          lastVoteResult: null,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'OPEN_VOTE': {
      if (state.phase !== 'TALKING') return { state, effects: [] };

      return {
        state: {
          ...state,
          phase: 'VOTING',
          currentVotes: {},
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'SUBMIT_VOTE': {
      if (state.phase !== 'VOTING') return { state, effects: [] };
      if (action.voteIndex !== state.currentVoteIndex) return { state, effects: [] };

      // Deduplicate commands
      if (state.processedCmdIds.includes(action.cmdId)) {
        return { state, effects: [] };
      }

      const voter = state.players[action.playerId];
      const target = state.players[action.targetId];

      // Eligible voters: present and not ghost
      if (!voter || !voter.present || voter.ghost) return { state, effects: [] };
      // Eligible targets: present and not ghost and not self
      if (!target || !target.present || target.ghost || action.targetId === action.playerId) {
        return { state, effects: [] };
      }

      const nextVotes = {
        ...state.currentVotes,
        [action.playerId]: action.targetId,
      };

      const eligibleVoters = state.playerOrder.filter((id) => {
        const p = state.players[id];
        return p && p.present && !p.ghost;
      });

      const nextCmdIds = [...state.processedCmdIds, action.cmdId];

      // Check if all eligible voters have submitted
      const allSubmitted = eligibleVoters.every((id) => nextVotes[id] !== undefined);

      if (!allSubmitted) {
        return {
          state: {
            ...state,
            currentVotes: nextVotes,
            processedCmdIds: nextCmdIds,
            seq: nextSeq,
          },
          effects: [{ broadcast: true }],
        };
      }

      // --- All votes submitted: Resolve this vote ---
      const eligibleTargets = state.playerOrder.filter((id) => {
        const p = state.players[id];
        return p && p.present && !p.ghost;
      });

      const { removedId, tallies } = resolveVote(nextVotes, eligibleTargets);
      const nextRemovedIds = [...state.roundRemovedIds, ...(removedId ? [removedId] : [])];
      const nextVotesByIndex = [...state.roundVotesByIndex, nextVotes];

      // Mark removed player as ghost
      const nextPlayers = { ...state.players };
      if (removedId && nextPlayers[removedId]) {
        nextPlayers[removedId] = { ...nextPlayers[removedId], ghost: true };
      }

      const secret = state.currentSecret!;
      const totalImposters = secret.imposterIds.length;
      const remainingImposters = secret.imposterIds.filter(
        (id) => !nextRemovedIds.includes(id)
      );

      const maxVotesForRound = totalImposters;
      const voteIndexCompleted = state.currentVoteIndex;
      const nextVoteIndex = voteIndexCompleted + 1;

      // Check if round ends:
      // 1. All imposters removed -> early end
      // 2. We reached max allowed votes (1 or 2)
      const allImpostersRemoved = remainingImposters.length === 0;
      const votesExhausted = nextVoteIndex >= maxVotesForRound;

      if (!allImpostersRemoved && !votesExhausted) {
        // Need another vote! Go back to VOTING with nextVoteIndex
        return {
          state: {
            ...state,
            phase: 'VOTING',
            players: nextPlayers,
            currentVoteIndex: nextVoteIndex,
            currentVotes: {},
            roundVotesByIndex: nextVotesByIndex,
            roundRemovedIds: nextRemovedIds,
            processedCmdIds: nextCmdIds,
            seq: nextSeq,
          },
          effects: [{ broadcast: true }],
        };
      }

      // Round is finished! Calculate final scores and show REVEAL
      const scoreDelta = scoreRound(secret, nextVotesByIndex, nextRemovedIds);
      const nextScores = { ...state.scores };
      for (const [id, delta] of Object.entries(scoreDelta)) {
        nextScores[id] = (nextScores[id] || 0) + delta;
      }

      const roles: Record<string, 'civilian' | 'imposter'> = {};
      for (const id of state.playerOrder) {
        roles[id] = secret.imposterIds.includes(id) ? 'imposter' : 'civilian';
      }

      const lastVoteResult = {
        tallies,
        removedId,
        roles,
        words: {
          civilian: secret.civilianWord,
          imposter: secret.imposterWord,
        },
        scoreDelta,
      };

      return {
        state: {
          ...state,
          phase: 'REVEAL',
          players: nextPlayers,
          scores: nextScores,
          roundVotesByIndex: nextVotesByIndex,
          roundRemovedIds: nextRemovedIds,
          lastVoteResult,
          processedCmdIds: nextCmdIds,
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    case 'NEXT_ROUND': {
      if (state.phase === 'REVEAL') {
        // Move to SCORES first
        return {
          state: {
            ...state,
            phase: 'SCORES',
            seq: nextSeq,
          },
          effects: [{ broadcast: true }],
        };
      }

      if (state.phase === 'SCORES') {
        // Check if game over
        const isEndless = state.settings.rounds === 0;
        const reachedTarget = !isEndless && state.round >= state.settings.rounds;

        if (reachedTarget) {
          const awards = computeAwards(state);
          return {
            state: {
              ...state,
              phase: 'GAME_OVER',
              awards,
              seq: nextSeq,
            },
            effects: [{ broadcast: true }],
          };
        }

        // Otherwise go to DEALING for next round
        return {
          state: {
            ...state,
            phase: 'DEALING',
            seq: nextSeq,
          },
          effects: [{ broadcast: true }],
        };
      }

      return { state, effects: [] };
    }

    case 'PLAY_AGAIN': {
      if (state.phase !== 'GAME_OVER') return { state, effects: [] };

      // Reset scores, keep players and settings
      const resetScores: Record<string, number> = {};
      for (const id of state.playerOrder) {
        resetScores[id] = 0;
      }

      return {
        state: {
          ...state,
          phase: 'LOBBY',
          round: 0,
          scores: resetScores,
          currentSecret: null,
          currentVotes: {},
          roundVotesByIndex: [],
          roundRemovedIds: [],
          lastVoteResult: null,
          imposterHistory: {},
          awards: [],
          seq: nextSeq,
        },
        effects: [{ broadcast: true }],
      };
    }

    default:
      return { state, effects: [] };
  }
}
