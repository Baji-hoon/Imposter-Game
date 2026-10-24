import { create } from 'zustand';
import {
  ConnectionStatus,
  ConnectTarget,
  ServerMsg,
  ServerStateSync,
  ServerVoteResult,
  ServerGameOver,
  ServerError,
  ServerVoteProgress,
  Settings,
  Transport,
  PROTOCOL_VERSION,
} from '@imposter/shared';
import { TcpTransport } from '../transport/TcpTransport.web';
import { useProfileStore } from './profileStore';

export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export interface GameState {
  // Connection state
  transport: Transport | null;
  status: ConnectionStatus;
  rtt: number;
  logs: string[];

  // Hosting state (disabled on web)
  isHosting: boolean;
  isStartingHost: boolean;
  hostServer: any | null;
  hostIp: string | null;
  roomCode: string | null;

  // Identity / credentials
  playerId: string | null;
  resumeToken: string | null;
  isKicked: boolean;
  lastConnectTarget: ConnectTarget | null;
  lastPlayerInfo: { name: string; avatar: string } | null;
  myLastVoteTargetId: string | null;

  // Protocol version check
  protocolMismatch: boolean;

  // Authoritative synced state
  stateSync: ServerStateSync | null;
  voteProgress: ServerVoteProgress | null;
  lastVoteResult: ServerVoteResult | null;
  lastGameOver: ServerGameOver | null;
  lastError: ServerError | null;

  // Actions
  joinGame: (target: ConnectTarget, roomCode: string, name: string, avatar: string) => Promise<void>;
  resumeSession: () => Promise<void>;
  startHosting: (name: string, avatar: string, port?: number) => Promise<void>;
  leaveGame: () => void;
  clearError: () => void;
  clearLogs: () => void;
  clearKicked: () => void;
  setHostIp: (ip: string) => void;

  // In-Game Commands
  setSettings: (settings: Settings) => void;
  startGame: () => void;
  deal: () => void;
  openVote: () => void;
  submitVote: (voteIndex: number, targetId: string) => void;
  nextRound: () => void;
  kick: (playerId: string) => void;
  transferHost: (playerId: string) => void;
  playAgain: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  transport: null,
  status: 'closed',
  rtt: 0,
  logs: [],

  isHosting: false,
  isStartingHost: false,
  hostServer: null,
  hostIp: null,
  roomCode: null,

  playerId: null,
  resumeToken: null,
  isKicked: false,
  lastConnectTarget: null,
  lastPlayerInfo: null,
  myLastVoteTargetId: null,

  protocolMismatch: false,

  stateSync: null,
  voteProgress: null,
  lastVoteResult: null,
  lastGameOver: null,
  lastError: null,

  setHostIp: (ip: string) => set({ hostIp: ip }),

  clearError: () => set({ lastError: null }),
  clearLogs: () => set({ logs: [] }),
  clearKicked: () => set({ isKicked: false }),

  startHosting: async () => {
    // Browsers cannot host games per spec
    set({
      lastError: {
        v: 1,
        t: 'error',
        code: 'HOSTING_NOT_SUPPORTED',
        message: 'Hosting from web browsers is not supported. Please host using the Android app!',
      },
    });
  },

  joinGame: async (target: ConnectTarget, roomCode: string, name: string, avatar: string) => {
    const prevTransport = get().transport;
    if (prevTransport) {
      try {
        prevTransport.close();
      } catch {}
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();

    // Check localStorage for saved session for this room
    let storedPlayerId: string | undefined;
    let storedResume: string | undefined;

    if (typeof window !== 'undefined' && window.localStorage) {
      storedPlayerId = localStorage.getItem(`imposter_player_${cleanRoomCode}`) || undefined;
      storedResume = localStorage.getItem(`imposter_resume_${cleanRoomCode}`) || undefined;
    }

    set({
      roomCode: cleanRoomCode,
      lastConnectTarget: target,
      lastPlayerInfo: { name, avatar },
      status: 'connecting',
      lastError: null,
      isKicked: false,
      protocolMismatch: false,
      playerId: storedPlayerId || null,
      resumeToken: storedResume || null,
    });

    const transport = new TcpTransport({
      room: cleanRoomCode,
      name,
      avatar,
      playerId: storedPlayerId,
      resumeToken: storedResume,
      onRttUpdate: (rtt: number) => {
        set({ rtt });
      },
      onLog: (msg: string) => {
        set((s) => ({ logs: [...s.logs.slice(-49), msg] }));
      },
    });

    transport.onStatusChange((status: ConnectionStatus) => {
      set({ status });
      if (status === 'closed') {
        set({ rtt: 0 });
      }
    });

    transport.onMessage((msg: ServerMsg) => {
      // Protocol version check
      if (msg.v !== PROTOCOL_VERSION) {
        set({
          protocolMismatch: true,
          lastError: {
            v: 1,
            t: 'error',
            code: 'PROTOCOL_MISMATCH',
            message: 'Ask the host to update the app',
          },
        });
      }

      switch (msg.t) {
        case 'welcome': {
          set({
            playerId: msg.playerId,
            resumeToken: msg.resume,
            roomCode: msg.room,
            lastError: null,
          });

          // Save credentials in localStorage
          if (typeof window !== 'undefined' && window.localStorage) {
            try {
              localStorage.setItem(`imposter_player_${msg.room}`, msg.playerId);
              localStorage.setItem(`imposter_resume_${msg.room}`, msg.resume);
            } catch {}
          }
          break;
        }

        case 'state_sync': {
          set({
            stateSync: msg,
            roomCode: msg.room,
          });
          break;
        }

        case 'vote_progress': {
          set({ voteProgress: msg });
          break;
        }

        case 'vote_result': {
          set({ lastVoteResult: msg });
          break;
        }

        case 'game_over': {
          set({ lastGameOver: msg });
          break;
        }

        case 'error': {
          if (msg.code === 'KICKED') {
            set({ isKicked: true, stateSync: null });
            get().leaveGame();
          } else if (msg.code === 'ROOM_NOT_FOUND') {
            // Check if server indicated the active room code on this host
            const match = msg.message.match(/expected\s+([A-Z]{4})/i);
            const expectedRoom = match ? match[1].toUpperCase() : null;

            if (expectedRoom && expectedRoom !== get().roomCode) {
              console.log(`[gameStore.web] Host active room changed to ${expectedRoom}. Switching from ${get().roomCode}...`);
              // Clear previous game state completely
              set({
                stateSync: null,
                lastError: null,
                playerId: null,
                resumeToken: null,
                roomCode: expectedRoom,
                voteProgress: null,
                lastVoteResult: null,
                lastGameOver: null,
              });

              // Update browser URL query param seamlessly
              if (typeof window !== 'undefined' && window.history) {
                try {
                  const url = new URL(window.location.href);
                  url.searchParams.set('room', expectedRoom);
                  window.history.replaceState(null, '', url.toString());
                } catch {}
              }

              // Auto-rejoin the host's active room
              const target = get().lastConnectTarget;
              const playerInfo = get().lastPlayerInfo;
              if (target && playerInfo) {
                get().leaveGame();
                get().joinGame(target, expectedRoom, playerInfo.name, playerInfo.avatar);
                break;
              }
            }

            set({
              stateSync: null,
              lastError: msg,
              playerId: null,
              resumeToken: null,
              voteProgress: null,
              lastVoteResult: null,
              lastGameOver: null,
            });
            get().leaveGame();
          } else if (msg.code === 'ROOM_CLOSED') {
            set({
              stateSync: null,
              lastError: msg,
              playerId: null,
              resumeToken: null,
              voteProgress: null,
              lastVoteResult: null,
              lastGameOver: null,
            });
            get().leaveGame();
          } else if (msg.code === 'PROTOCOL_MISMATCH') {
            set({
              protocolMismatch: true,
              lastError: {
                v: 1,
                t: 'error',
                code: 'PROTOCOL_MISMATCH',
                message: 'Ask the host to update the app',
              },
            });
          } else {
            set({ lastError: msg });
          }
          break;
        }
      }
    });

    set({ transport });

    try {
      await transport.connect(target);
    } catch (err: any) {
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'CONNECTION_FAILED',
          message: `Could not connect to host at ${target.host}:${target.port}. Ensure you are on the same Wi-Fi/Hotspot!`,
        },
        status: 'closed',
      });
    }
  },

  resumeSession: async () => {
    const { roomCode, lastConnectTarget, lastPlayerInfo } = get();
    if (!roomCode || !lastConnectTarget || !lastPlayerInfo) return;

    await get().joinGame(
      lastConnectTarget,
      roomCode,
      lastPlayerInfo.name,
      lastPlayerInfo.avatar
    );
  },

  leaveGame: () => {
    const transport = get().transport;
    if (transport) {
      try {
        transport.send({ v: 1, t: 'leave' });
        transport.close();
      } catch {}
    }

    set({
      transport: null,
      status: 'closed',
      stateSync: null,
      voteProgress: null,
      lastVoteResult: null,
      lastGameOver: null,
      rtt: 0,
      myLastVoteTargetId: null,
    });
  },

  // Game action dispatches
  setSettings: (settings: Settings) => {
    get().transport?.send({ v: 1, t: 'set_settings', settings });
  },

  startGame: () => {
    get().transport?.send({ v: 1, t: 'start_game' });
  },

  deal: () => {
    get().transport?.send({ v: 1, t: 'deal' });
  },

  openVote: () => {
    get().transport?.send({ v: 1, t: 'open_vote' });
  },

  submitVote: (voteIndex: number, targetId: string) => {
    set({ myLastVoteTargetId: targetId });
    const { transport } = get();
    if (transport) {
      transport.send({
        v: 1,
        t: 'submit_vote',
        cmdId: `vote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        voteIndex,
        targetId,
      });
    }
  },

  nextRound: () => {
    get().transport?.send({ v: 1, t: 'next_round' });
  },

  kick: (playerId: string) => {
    get().transport?.send({ v: 1, t: 'kick', playerId });
  },

  transferHost: (playerId: string) => {
    get().transport?.send({ v: 1, t: 'transfer_host', playerId });
  },

  playAgain: () => {
    get().transport?.send({ v: 1, t: 'play_again' });
  },
}));
