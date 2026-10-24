export type Phase = 'LOBBY' | 'DEALING' | 'TALKING' | 'VOTING' | 'REVEAL' | 'SCORES' | 'GAME_OVER';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  present: boolean;
  ghost: boolean;
  score: number;
}

export interface Settings {
  rounds: 5 | 8 | 10 | 0;              // 0 = endless
  imposterCount: 1 | 2;                // 2 only if players >= 8
  blankImposter: 'off' | 'sometimes' | 'every';
  oneWordRound: 'off' | 'sometimes' | 'every';
  packs: string[];                     // enabled pack ids
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
}

export interface RoundSecret {
  roundId: string;
  civilianWord: string;
  imposterWord: string | null;         // null when blank
  imposterIds: string[];
  blank: boolean;
  oneWord: boolean;
}

export interface WordPair {
  a: string;
  b: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface WordPack {
  id: string;
  title: string;
  pairs: WordPair[];
}

export interface StateSyncMe {
  id: string;
  word: string | null;
  hasWord: boolean;
  voted: boolean[];
}

export interface StateSyncPlayer {
  id: string;
  name: string;
  avatar: string;
  present: boolean;
  ghost: boolean;
}

export interface StateSync {
  seq: number;
  room: string;
  hostId: string;
  phase: Phase;
  round: number;
  totalRounds: number;
  players: StateSyncPlayer[];
  me: StateSyncMe;
  settings: Settings;
  scores: Record<string, number>;
  modifiers: {
    oneWord: boolean;
  };
}

export interface ConnectTarget {
  host: string;
  port: number;
}

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

// Forward declaration will be re-exported with full Zod types
import type { ClientMsg, ServerMsg } from './protocol';

export interface Transport {
  connect(target: ConnectTarget): Promise<void>;
  send(msg: ClientMsg): void;
  onMessage(cb: (msg: ServerMsg) => void): void;
  onStatus(cb: (s: ConnectionStatus) => void): void;
  close(): void;
}
