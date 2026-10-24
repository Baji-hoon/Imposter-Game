import everydayPack from './everyday.json';
import animalsPack from './animals.json';
import foodPack from './food.json';
import placesPack from './places.json';
import mixedPack from './mixed.json';
import type { WordPack, WordPair, Settings } from '../types';

export const allPacks: WordPack[] = [
  everydayPack as WordPack,
  animalsPack as WordPack,
  foodPack as WordPack,
  placesPack as WordPack,
  mixedPack as WordPack,
];

export const packsById: Record<string, WordPack> = {
  everyday: everydayPack as WordPack,
  animals: animalsPack as WordPack,
  food: foodPack as WordPack,
  places: placesPack as WordPack,
  mixed: mixedPack as WordPack,
};

/**
 * Returns available word pairs matching the specified settings.
 */
export function getAvailablePairs(settings: Settings): WordPair[] {
  const selectedPacks =
    settings.packs.length > 0
      ? settings.packs.map((id) => packsById[id]).filter(Boolean)
      : allPacks;

  const pairs: WordPair[] = [];
  for (const pack of selectedPacks) {
    for (const pair of pack.pairs) {
      if (settings.difficulty === 'mixed' || pair.difficulty === settings.difficulty) {
        pairs.push(pair);
      }
    }
  }

  // Fallback if filter leaves empty pool
  if (pairs.length === 0) {
    for (const pack of allPacks) {
      pairs.push(...pack.pairs);
    }
  }

  return pairs;
}
