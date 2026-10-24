import type { RoundSecret } from './types';

export const POINTS_IMPOSTER_SURVIVED = 5;
export const POINTS_BLANK_IMPOSTER_SURVIVED = 7;
export const POINTS_VOTED_OUT_IMPOSTER = 1;

/**
 * Calculates score delta for a completed round:
 * - Each imposter that survived all votes: +5 (+7 if blank)
 * - Any player who voted for an imposter who was removed: +1 per correct vote
 * - Removed civilians / wrong votes: 0
 *
 * @param secret The secret configuration of the round
 * @param votesByIndex Array of votes maps (voterId -> targetId) for each vote index
 * @param removedIds List of player IDs removed during this round
 */
export function scoreRound(
  secret: RoundSecret,
  votesByIndex: Record<string, string>[],
  removedIds: string[]
): Record<string, number> {
  const delta: Record<string, number> = {};

  const addPoints = (playerId: string, pts: number) => {
    delta[playerId] = (delta[playerId] || 0) + pts;
  };

  // 1. Check each imposter: did they survive?
  for (const imposterId of secret.imposterIds) {
    if (!removedIds.includes(imposterId)) {
      const imposterPoints = secret.blank
        ? POINTS_BLANK_IMPOSTER_SURVIVED
        : POINTS_IMPOSTER_SURVIVED;
      addPoints(imposterId, imposterPoints);
    }
  }

  // 2. Award +1 to voters who voted for an imposter that got removed in that specific vote
  for (let i = 0; i < votesByIndex.length; i++) {
    const votes = votesByIndex[i] || {};
    const removedInThisVote = removedIds[i];

    // If an imposter was removed in this vote, anyone who voted for them gets +1
    if (removedInThisVote && secret.imposterIds.includes(removedInThisVote)) {
      for (const [voterId, targetId] of Object.entries(votes)) {
        if (targetId === removedInThisVote) {
          addPoints(voterId, POINTS_VOTED_OUT_IMPOSTER);
        }
      }
    }
  }

  return delta;
}
