import { describe, it, expect } from 'vitest';
import {
  createRoom,
  reduce,
  resolveVote,
  dealRound,
  viewFor,
  GameState,
} from '../src/engine';
import type { Settings } from '../src/types';

describe('Game Engine', () => {
  const setupThreePlayerRoom = (): GameState => {
    let state = createRoom('ABCD', 'p1');
    state = reduce(state, {
      type: 'JOIN',
      player: { id: 'p1', name: 'Alice', avatar: '🦊' },
    }).state;
    state = reduce(state, {
      type: 'JOIN',
      player: { id: 'p2', name: 'Bob', avatar: '🐼' },
    }).state;
    state = reduce(state, {
      type: 'JOIN',
      player: { id: 'p3', name: 'Charlie', avatar: '🐯' },
    }).state;
    return state;
  };

  describe('resolveVote', () => {
    it('removes player with strictly the most votes', () => {
      const votes = { p1: 'p2', p3: 'p2', p2: 'p1' };
      const result = resolveVote(votes, ['p1', 'p2', 'p3']);
      expect(result.removedId).toBe('p2');
      expect(result.tallies['p2']).toBe(2);
      expect(result.tallies['p1']).toBe(1);
    });

    it('returns removedId: null on a tie (nobody removed, imposter survives)', () => {
      const votes = { p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p2' };
      const result = resolveVote(votes, ['p1', 'p2', 'p3', 'p4']);
      expect(result.removedId).toBeNull();
      expect(result.tallies['p1']).toBe(2);
      expect(result.tallies['p2']).toBe(2);
    });

    it('returns removedId: null if no votes are cast', () => {
      const result = resolveVote({}, ['p1', 'p2']);
      expect(result.removedId).toBeNull();
    });
  });

  describe('dealRound & word swap & no-repeat', () => {
    it('randomly swaps civilian vs imposter word sides across deterministic RNG seeds', () => {
      const state = setupThreePlayerRoom();

      // 3 players: shuffle loop runs for i=2 and i=1 (2 calls), then pairIndex (1 call), then swap (1 call)
      let rngStep = 0;
      const rngNoSwap = () => {
        rngStep++;
        if (rngStep === 1) return 0.0; // candidate shuffle i=2
        if (rngStep === 2) return 0.0; // candidate shuffle i=1
        if (rngStep === 3) return 0.0; // pair index 0
        if (rngStep === 4) return 0.1; // swap < 0.5 (false)
        return 0.9;
      };

      const deal1 = dealRound(state, rngNoSwap);

      rngStep = 0;
      const rngWithSwap = () => {
        rngStep++;
        if (rngStep === 1) return 0.0; // candidate shuffle i=2
        if (rngStep === 2) return 0.0; // candidate shuffle i=1
        if (rngStep === 3) return 0.0; // pair index 0
        if (rngStep === 4) return 0.9; // swap >= 0.5 (true)
        return 0.9;
      };

      const deal2 = dealRound(state, rngWithSwap);

      expect(deal1.secret.civilianWord).not.toBe(deal2.secret.civilianWord);
      expect(deal1.secret.imposterWord).toBe(deal2.secret.civilianWord);
    });

    it('does not repeat word pairs in consecutive rounds until pool is exhausted', () => {
      let state = setupThreePlayerRoom();
      state.settings.packs = ['everyday']; // everyday has 16 pairs

      const pickedPairs: string[] = [];

      for (let i = 0; i < 16; i++) {
        const { usedPairKey } = dealRound(state);
        expect(pickedPairs.includes(usedPairKey)).toBe(false);
        pickedPairs.push(usedPairKey);
        state.usedPairKeys.push(usedPairKey);
      }

      // After 16 pairs are used, pool resets and can pick again
      const { usedPairKey: resetPair } = dealRound(state);
      expect(pickedPairs.includes(resetPair)).toBe(true);
    });

    it('applies soft fairness rule: no player is imposter 3 rounds in a row when players >= 5', () => {
      let state = createRoom('ROOM', 'p1');
      for (let i = 1; i <= 5; i++) {
        state = reduce(state, {
          type: 'JOIN',
          player: { id: `p${i}`, name: `Player ${i}`, avatar: '🦊' },
        }).state;
      }

      // Simulate p1 having been imposter for 2 consecutive rounds
      state.imposterHistory['p1'] = 2;

      // Deal round multiple times with p1 filtered out
      for (let i = 0; i < 20; i++) {
        const { secret } = dealRound(state, Math.random);
        expect(secret.imposterIds.includes('p1')).toBe(false);
      }
    });
  });

  describe('privacy of viewFor', () => {
    it('never leaks other players words or roles during TALKING phase', () => {
      let state = setupThreePlayerRoom();
      state = reduce(state, { type: 'START_GAME' }).state;
      state = reduce(state, { type: 'DEAL' }).state;

      expect(state.phase).toBe('TALKING');
      const imposterId = state.currentSecret!.imposterIds[0];
      const civilianId = state.playerOrder.find((id) => id !== imposterId)!;

      const imposterView = viewFor(state, imposterId);
      const civilianView = viewFor(state, civilianId);

      // Imposter sees only their own word
      expect(imposterView.me.word).toBe(state.currentSecret!.imposterWord);
      // Civilian sees only civilian word
      expect(civilianView.me.word).toBe(state.currentSecret!.civilianWord);

      // Neither view exposes roles or other players words
      for (const p of imposterView.players) {
        expect((p as any).word).toBeUndefined();
        expect((p as any).role).toBeUndefined();
      }

      for (const p of civilianView.players) {
        expect((p as any).word).toBeUndefined();
        expect((p as any).role).toBeUndefined();
      }
    });

    it('gives null word to blank imposter', () => {
      let state = setupThreePlayerRoom();
      state.settings.blankImposter = 'every';
      state = reduce(state, { type: 'START_GAME' }).state;
      state = reduce(state, { type: 'DEAL' }).state;

      const imposterId = state.currentSecret!.imposterIds[0];
      const view = viewFor(state, imposterId);

      expect(view.me.word).toBeNull();
      expect(view.me.hasWord).toBe(true);
    });
  });

  describe('Voting flow & Two imposters', () => {
    it('handles tie in voting: nobody removed, round finishes, imposter scores', () => {
      let state = setupThreePlayerRoom();
      state = reduce(state, { type: 'START_GAME' }).state;
      state = reduce(state, { type: 'DEAL' }).state;
      state = reduce(state, { type: 'OPEN_VOTE' }).state;

      expect(state.phase).toBe('VOTING');

      // 3 players: p1 votes p2, p2 votes p1, Charlie p3 votes p2 -> wait, tie:
      // p1 votes p2, p2 votes p1, p3 votes Charlie (invalid self-vote) -> let's have p3 not vote self:
      // In 4 player:
      state = reduce(state, {
        type: 'JOIN',
        player: { id: 'p4', name: 'Dave', avatar: '🦁' },
      }).state;

      // 2 votes for p1, 2 votes for p2 -> Tie!
      state = reduce(state, {
        type: 'SUBMIT_VOTE',
        playerId: 'p1',
        targetId: 'p2',
        voteIndex: 0,
        cmdId: 'c1',
      }).state;
      state = reduce(state, {
        type: 'SUBMIT_VOTE',
        playerId: 'p2',
        targetId: 'p1',
        voteIndex: 0,
        cmdId: 'c2',
      }).state;
      state = reduce(state, {
        type: 'SUBMIT_VOTE',
        playerId: 'p3',
        targetId: 'p2',
        voteIndex: 0,
        cmdId: 'c3',
      }).state;
      state = reduce(state, {
        type: 'SUBMIT_VOTE',
        playerId: 'p4',
        targetId: 'p1',
        voteIndex: 0,
        cmdId: 'c4',
      }).state;

      expect(state.phase).toBe('REVEAL');
      expect(state.lastVoteResult?.removedId).toBeNull();
      // Imposter should have survived and received 5 points
      const imposterId = state.currentSecret!.imposterIds[0];
      expect(state.scores[imposterId]).toBe(5);
    });

    it('two-imposter game: civilian removed first -> second vote occurs; second imposter removed -> ends round', () => {
      let state = createRoom('TWO_IMP', 'p1', {
        imposterCount: 2,
        rounds: 5,
      });

      // Add 8 players so 2 imposters are enabled
      for (let i = 1; i <= 8; i++) {
        state = reduce(state, {
          type: 'JOIN',
          player: { id: `p${i}`, name: `Player ${i}`, avatar: '🦊' },
        }).state;
      }

      state = reduce(state, { type: 'START_GAME' }).state;

      // Force two specific imposters: p7 and p8
      state = reduce(state, { type: 'DEAL' }).state;
      state.currentSecret!.imposterIds = ['p7', 'p8'];

      state = reduce(state, { type: 'OPEN_VOTE' }).state;
      expect(state.phase).toBe('VOTING');
      expect(state.currentVoteIndex).toBe(0);

      // Vote 1: Civilian p1 receives the most votes and is removed
      for (let i = 1; i <= 8; i++) {
        state = reduce(state, {
          type: 'SUBMIT_VOTE',
          playerId: `p${i}`,
          targetId: i === 1 ? 'p2' : 'p1',
          voteIndex: 0,
          cmdId: `vote1-${i}`,
        }).state;
      }

      // Civilian p1 was removed, imposters remain! Should start Vote 2 (currentVoteIndex = 1)
      expect(state.phase).toBe('VOTING');
      expect(state.currentVoteIndex).toBe(1);
      expect(state.players['p1'].ghost).toBe(true);

      // Vote 2: Imposter p7 receives the most votes (eligible voters are p2..p8)
      for (let i = 2; i <= 8; i++) {
        state = reduce(state, {
          type: 'SUBMIT_VOTE',
          playerId: `p${i}`,
          targetId: i === 7 || i === 8 ? 'p2' : 'p7',
          voteIndex: 1,
          cmdId: `vote2-${i}`,
        }).state;
      }

      // Max votes reached (2 votes for 2 imposters) -> proceeds to REVEAL
      expect(state.phase).toBe('REVEAL');
      expect(state.players['p7'].ghost).toBe(true);

      // Imposter p8 survived -> +5 points
      expect(state.scores['p8']).toBe(5);
      // Imposter p7 was removed -> 0 points
      expect(state.scores['p7']).toBe(0);
      // Voters who voted for p7 in vote 2 get +1 point
      expect(state.scores['p2']).toBe(1);
    });

    it('two-imposter game: both imposters removed in votes 1 and 2 -> early end', () => {
      let state = createRoom('TWO_IMP_EARLY', 'p1', {
        imposterCount: 2,
        rounds: 5,
      });

      for (let i = 1; i <= 8; i++) {
        state = reduce(state, {
          type: 'JOIN',
          player: { id: `p${i}`, name: `Player ${i}`, avatar: '🦊' },
        }).state;
      }

      state = reduce(state, { type: 'START_GAME' }).state;
      state = reduce(state, { type: 'DEAL' }).state;
      state.currentSecret!.imposterIds = ['p7', 'p8'];

      state = reduce(state, { type: 'OPEN_VOTE' }).state;

      // Vote 1: p7 (imposter 1) is voted out
      for (let i = 1; i <= 8; i++) {
        state = reduce(state, {
          type: 'SUBMIT_VOTE',
          playerId: `p${i}`,
          targetId: i === 7 || i === 8 ? 'p2' : 'p7',
          voteIndex: 0,
          cmdId: `v1-${i}`,
        }).state;
      }

      expect(state.phase).toBe('VOTING');
      expect(state.currentVoteIndex).toBe(1);

      // Vote 2: p8 (imposter 2) is voted out
      for (let i = 1; i <= 8; i++) {
        if (i === 7) continue; // ghost cannot vote
        state = reduce(state, {
          type: 'SUBMIT_VOTE',
          playerId: `p${i}`,
          targetId: i === 8 ? 'p2' : 'p8',
          voteIndex: 1,
          cmdId: `v2-${i}`,
        }).state;
      }

      // Both imposters removed -> ends round
      expect(state.phase).toBe('REVEAL');
      expect(state.scores['p7']).toBe(0);
      expect(state.scores['p8']).toBe(0);
    });

    it('ensures no two players in the room have the same avatar on join', () => {
      let state = createRoom('UNIQ_AVATAR', 'p1');
      // Three players all attempt to join with the identical avatar 🦊
      state = reduce(state, {
        type: 'JOIN',
        player: { id: 'p1', name: 'Alice', avatar: '🦊' },
      }).state;
      state = reduce(state, {
        type: 'JOIN',
        player: { id: 'p2', name: 'Bob', avatar: '🦊' },
      }).state;
      state = reduce(state, {
        type: 'JOIN',
        player: { id: 'p3', name: 'Charlie', avatar: '🦊' },
      }).state;

      const p1Avatar = state.players['p1'].avatar;
      const p2Avatar = state.players['p2'].avatar;
      const p3Avatar = state.players['p3'].avatar;

      // Alice keeps 🦊
      expect(p1Avatar).toBe('🦊');
      // Bob and Charlie are assigned distinct unique avatars
      expect(p2Avatar).not.toBe('🦊');
      expect(p3Avatar).not.toBe('🦊');
      expect(p2Avatar).not.toBe(p3Avatar);
    });
  });
});
