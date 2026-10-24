export const AVATAR_OPTIONS = [
  '🦊', '🐼', '🐯', '🦁',
  '🐶', '🐱', '🐵', '🐨',
  '🐸', '🐙', '🦉', '🦄',
  '🐰', '🐻', '🐺', '🦔',
  '🐧', '🐬', '🦩', '🦥',
  '🦖', '🚀', '⚡', '🔥',
];

export const getRandomAvatar = (): string => {
  return AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)];
};
