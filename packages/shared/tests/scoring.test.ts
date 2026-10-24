import { describe, it, expect } from 'vitest';
import {
  scoreRound,
  POINTS_IMPOSTER_SURVIVED,
  POINTS_BLANK_IMPOSTER_SURVIVED,
  POINTS_VOTED_OUT_IMPOSTER,
} from '../src/scoring';
import type { RoundSecret } from '../src/types';

describe('scoreRound', () => {
  const baseSecret: RoundSecret = {
    roundId: 'r-1',
    civilianWord: 'egg',
    imposterWord: 'ball',
    imposterIds: ['p-imposter'],
    blank: false,
    oneWord: false,
  };

  it('awards +5 points to imposter if imposter survives all votes', () => {
    // Votes for a civilian who was removed
    const votesByIndex = [{ 'p1': 'p2', 'p-imposter': 'p2', 'p2': 'p1' }];
    const removedIds = ['p2'];

    const delta = scoreRound(baseSecret, votesByIndex, removedIds);
    expect(delta['p-imposter']).toBe(POINTS_IMPOSTER_SURVIVED);
    expect(delta['p1']).toBeUndefined();
    expect(delta['p2']).toBeUndefined();
  });

  it('awards +7 points to blank imposter if they survive', () => {
    const blankSecret: RoundSecret = {
      ...baseSecret,
      blank: true,
      imposterWord: null,
    };
    const votesByIndex = [{ 'p1': 'p2', 'p-imposter': 'p2', 'p2': 'p1' }];
    const removedIds = ['p2'];

    const delta = scoreRound(blankSecret, votesByIndex, removedIds);
    expect(delta['p-imposter']).toBe(POINTS_BLANK_IMPOSTER_SURVIVED);
  });

  it('awards +1 to voters who voted for removed imposter and 0 to imposter', () => {
    // p1 and p2 voted for imposter; imposter voted for p1
    const votesByIndex = [{ 'p1': 'p-imposter', 'p2': 'p-imposter', 'p-imposter': 'p1' }];
    const removedIds = ['p-imposter'];

    const delta = scoreRound(baseSecret, votesByIndex, removedIds);
    expect(delta['p-imposter']).toBeUndefined();
    expect(delta['p1']).toBe(POINTS_VOTED_OUT_IMPOSTER);
    expect(delta['p2']).toBe(POINTS_VOTED_OUT_IMPOSTER);
  });

  it('awards 0 points on a tie where nobody is removed', () => {
    const votesByIndex = [{ 'p1': 'p2', 'p2': 'p1' }];
    const removedIds: string[] = []; // nobody removed

    const delta = scoreRound(baseSecret, votesByIndex, removedIds);
    expect(delta['p-imposter']).toBe(POINTS_IMPOSTER_SURVIVED); // imposter survived
    expect(delta['p1']).toBeUndefined();
    expect(delta['p2']).toBeUndefined();
  });

  it('scores two imposters separately across multiple votes', () => {
    const twoImpostersSecret: RoundSecret = {
      roundId: 'r-2',
      civilianWord: 'pizza',
      imposterWord: 'flatbread',
      imposterIds: ['imp1', 'imp2'],
      blank: false,
      oneWord: false,
    };

    // Vote 1: imp1 gets removed (p1, p2 voted for imp1)
    // Vote 2: civilian civ1 gets removed (imp2 survived!)
    const votesByIndex: Record<string, string>[] = [
      { p1: 'imp1', p2: 'imp1', imp1: 'civ1', imp2: 'civ1', civ1: 'imp1' },
      { p1: 'civ1', p2: 'civ1', imp2: 'civ1', civ1: 'p1' },
    ];
    const removedIds = ['imp1', 'civ1'];

    const delta = scoreRound(twoImpostersSecret, votesByIndex, removedIds);

    // imp2 survived all votes -> +5
    expect(delta['imp2']).toBe(POINTS_IMPOSTER_SURVIVED);
    // imp1 was removed in vote 1 -> voters p1, p2, civ1 get +1
    expect(delta['p1']).toBe(1);
    expect(delta['p2']).toBe(1);
    expect(delta['civ1']).toBe(1);
    // imp1 gets 0
    expect(delta['imp1']).toBeUndefined();
  });
});
