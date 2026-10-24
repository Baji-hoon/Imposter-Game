import { z } from 'zod';

export const PROTOCOL_VERSION = 1;

export const SettingsSchema = z.object({
  rounds: z.union([z.literal(5), z.literal(8), z.literal(10), z.literal(0)]),
  imposterCount: z.union([z.literal(1), z.literal(2)]),
  blankImposter: z.enum(['off', 'sometimes', 'every']),
  oneWordRound: z.enum(['off', 'sometimes', 'every']),
  packs: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
});

export const PhaseSchema = z.enum([
  'LOBBY',
  'DEALING',
  'TALKING',
  'VOTING',
  'REVEAL',
  'SCORES',
  'GAME_OVER',
]);

// --- Client -> Host Messages ---

export const ClientHelloSchema = z.object({
  v: z.literal(1),
  t: z.literal('hello'),
  room: z.string(),
  playerId: z.string().optional(),
  resume: z.string().optional(),
  name: z.string(),
  avatar: z.string(),
});

export const ClientPingSchema = z.object({
  v: z.literal(1),
  t: z.literal('ping'),
  id: z.string(),
  ts: z.number(),
});

export const ClientSubmitVoteSchema = z.object({
  v: z.literal(1),
  t: z.literal('submit_vote'),
  cmdId: z.string(),
  voteIndex: z.number(),
  targetId: z.string(),
});

export const ClientResyncSchema = z.object({
  v: z.literal(1),
  t: z.literal('resync'),
});

export const ClientLeaveSchema = z.object({
  v: z.literal(1),
  t: z.literal('leave'),
});

// Host-only commands
export const ClientSetSettingsSchema = z.object({
  v: z.literal(1),
  t: z.literal('set_settings'),
  settings: SettingsSchema,
});

export const ClientStartGameSchema = z.object({
  v: z.literal(1),
  t: z.literal('start_game'),
});

export const ClientDealSchema = z.object({
  v: z.literal(1),
  t: z.literal('deal'),
});

export const ClientOpenVoteSchema = z.object({
  v: z.literal(1),
  t: z.literal('open_vote'),
});

export const ClientNextRoundSchema = z.object({
  v: z.literal(1),
  t: z.literal('next_round'),
});

export const ClientKickSchema = z.object({
  v: z.literal(1),
  t: z.literal('kick'),
  playerId: z.string(),
});

export const ClientTransferHostSchema = z.object({
  v: z.literal(1),
  t: z.literal('transfer_host'),
  playerId: z.string(),
});

export const ClientPlayAgainSchema = z.object({
  v: z.literal(1),
  t: z.literal('play_again'),
});

export const ClientProbeSchema = z.object({
  v: z.literal(1),
  t: z.literal('probe'),
});

export const ClientMsgSchema = z.discriminatedUnion('t', [
  ClientHelloSchema,
  ClientPingSchema,
  ClientSubmitVoteSchema,
  ClientResyncSchema,
  ClientLeaveSchema,
  ClientSetSettingsSchema,
  ClientStartGameSchema,
  ClientDealSchema,
  ClientOpenVoteSchema,
  ClientNextRoundSchema,
  ClientKickSchema,
  ClientTransferHostSchema,
  ClientPlayAgainSchema,
  ClientProbeSchema,
]);

export type ClientMsg = z.infer<typeof ClientMsgSchema>;
export type ClientHello = z.infer<typeof ClientHelloSchema>;
export type ClientPing = z.infer<typeof ClientPingSchema>;
export type ClientSubmitVote = z.infer<typeof ClientSubmitVoteSchema>;
export type ClientResync = z.infer<typeof ClientResyncSchema>;
export type ClientLeave = z.infer<typeof ClientLeaveSchema>;
export type ClientSetSettings = z.infer<typeof ClientSetSettingsSchema>;
export type ClientStartGame = z.infer<typeof ClientStartGameSchema>;
export type ClientDeal = z.infer<typeof ClientDealSchema>;
export type ClientOpenVote = z.infer<typeof ClientOpenVoteSchema>;
export type ClientNextRound = z.infer<typeof ClientNextRoundSchema>;
export type ClientKick = z.infer<typeof ClientKickSchema>;
export type ClientTransferHost = z.infer<typeof ClientTransferHostSchema>;
export type ClientPlayAgain = z.infer<typeof ClientPlayAgainSchema>;
export type ClientProbe = z.infer<typeof ClientProbeSchema>;

// --- Host -> Client Messages ---

export const ServerWelcomeSchema = z.object({
  v: z.literal(1),
  t: z.literal('welcome'),
  playerId: z.string(),
  resume: z.string(),
  hostId: z.string(),
  room: z.string(),
});

export const ServerPongSchema = z.object({
  v: z.literal(1),
  t: z.literal('pong'),
  id: z.string(),
  ts: z.number(),
});

export const StateSyncPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  present: z.boolean(),
  ghost: z.boolean(),
});

export const StateSyncMeSchema = z.object({
  id: z.string(),
  word: z.string().nullable(),
  hasWord: z.boolean(),
  voted: z.array(z.boolean()),
});

export const ServerStateSyncSchema = z.object({
  v: z.literal(1),
  t: z.literal('state_sync'),
  seq: z.number(),
  room: z.string(),
  hostId: z.string(),
  phase: PhaseSchema,
  round: z.number(),
  totalRounds: z.number(),
  players: z.array(StateSyncPlayerSchema),
  me: StateSyncMeSchema,
  settings: SettingsSchema,
  scores: z.record(z.number()),
  modifiers: z.object({
    oneWord: z.boolean(),
  }),
});

export const ServerLobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string(),
  present: z.boolean(),
  ghost: z.boolean(),
  score: z.number(),
});

export const ServerLobbySchema = z.object({
  v: z.literal(1),
  t: z.literal('lobby'),
  players: z.array(ServerLobbyPlayerSchema),
  settings: SettingsSchema,
});

export const ServerCardSchema = z.object({
  v: z.literal(1),
  t: z.literal('card'),
  roundId: z.string(),
  word: z.string().nullable(),
  modifiers: z.object({
    oneWord: z.boolean(),
  }),
});

export const ServerPhaseSchema = z.object({
  v: z.literal(1),
  t: z.literal('phase'),
  phase: PhaseSchema,
  round: z.number(),
  totalRounds: z.number(),
});

export const ServerVoteOpenSchema = z.object({
  v: z.literal(1),
  t: z.literal('vote_open'),
  voteIndex: z.number(),
  eligibleTargets: z.array(z.string()),
});

export const ServerVoteProgressSchema = z.object({
  v: z.literal(1),
  t: z.literal('vote_progress'),
  submitted: z.number(),
  total: z.number(),
});

export const ServerVoteResultSchema = z.object({
  v: z.literal(1),
  t: z.literal('vote_result'),
  tallies: z.record(z.number()),
  removedId: z.string().nullable(),
  roles: z.record(z.enum(['civilian', 'imposter'])),
  words: z.object({
    civilian: z.string(),
    imposter: z.string().nullable(),
  }),
  scoreDelta: z.record(z.number()),
});

export const ServerScoresSchema = z.object({
  v: z.literal(1),
  t: z.literal('scores'),
  scores: z.record(z.number()),
});

export const AwardSchema = z.object({
  title: z.string(),
  playerId: z.string(),
  desc: z.string(),
});

export const ServerGameOverSchema = z.object({
  v: z.literal(1),
  t: z.literal('game_over'),
  finalScores: z.record(z.number()),
  awards: z.array(AwardSchema),
});

export const ServerErrorSchema = z.object({
  v: z.literal(1),
  t: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerProbeOkSchema = z.object({
  v: z.literal(1),
  t: z.literal('probe_ok'),
  app: z.literal('imposter'),
  room: z.string(),
  hostName: z.string(),
  hostAvatar: z.string(),
  players: z.number(),
  max: z.number(),
  phase: PhaseSchema,
  joinable: z.boolean(),
});

export const ServerMsgSchema = z.discriminatedUnion('t', [
  ServerWelcomeSchema,
  ServerPongSchema,
  ServerStateSyncSchema,
  ServerLobbySchema,
  ServerCardSchema,
  ServerPhaseSchema,
  ServerVoteOpenSchema,
  ServerVoteProgressSchema,
  ServerVoteResultSchema,
  ServerScoresSchema,
  ServerGameOverSchema,
  ServerErrorSchema,
  ServerProbeOkSchema,
]);

export type ServerMsg = z.infer<typeof ServerMsgSchema>;
export type ServerWelcome = z.infer<typeof ServerWelcomeSchema>;
export type ServerPong = z.infer<typeof ServerPongSchema>;
export type ServerStateSync = z.infer<typeof ServerStateSyncSchema>;
export type ServerLobby = z.infer<typeof ServerLobbySchema>;
export type ServerCard = z.infer<typeof ServerCardSchema>;
export type ServerPhaseMsg = z.infer<typeof ServerPhaseSchema>;
export type ServerVoteOpen = z.infer<typeof ServerVoteOpenSchema>;
export type ServerVoteProgress = z.infer<typeof ServerVoteProgressSchema>;
export type ServerVoteResult = z.infer<typeof ServerVoteResultSchema>;
export type ServerScores = z.infer<typeof ServerScoresSchema>;
export type ServerGameOver = z.infer<typeof ServerGameOverSchema>;
export type ServerError = z.infer<typeof ServerErrorSchema>;
export type ServerProbeOk = z.infer<typeof ServerProbeOkSchema>;
