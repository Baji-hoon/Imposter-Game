import { create } from 'zustand';

export const AVATAR_OPTIONS = [
  '🦊', '🐼', '🐯', '🦁',
  '🐶', '🐱', '🐵', '🐨',
  '🐸', '🐙', '🦉', '🦄',
  '🐰', '🐻', '🐺', '🦔',
];

const ADJECTIVES = [
  'Sneaky', 'Clever', 'Mysterious', 'Silly',
  'Wobbly', 'Brave', 'Quiet', 'Cosmic',
  'Speedy', 'Funky', 'Gentle', 'Lucky',
  'Chill', 'Zesty', 'Fierce', 'Jolly',
  'Shadowy', 'Swift', 'Curious', 'Spicy',
];

const NOUNS = [
  'Mango', 'Panda', 'Fox', 'Otter',
  'Falcon', 'Badger', 'Koala', 'Penguin',
  'Lemur', 'Dolphin', 'Hamster', 'Tiger',
  'Llama', 'Cactus', 'Potato', 'Waffle',
  'Avocado', 'Mushroom', 'Pickle', 'Biscuit',
];

export const generateFunnyName = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

export const getRandomAvatar = (): string => {
  return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
};

export interface ProfileState {
  name: string;
  avatar: string;
  setAvatar: (avatar: string) => void;
  setName: (name: string) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  name: 'Player',
  avatar: AVATAR_OPTIONS[0],
  setAvatar: (avatar: string) => set({ avatar }),
  setName: (name: string) => set({ name }),
}));
