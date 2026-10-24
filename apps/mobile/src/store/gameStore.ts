import { create } from 'zustand';
import { NativeModules } from 'react-native';
import * as Network from 'expo-network';
import * as Crypto from 'expo-crypto';
import TcpSocket from 'react-native-tcp-socket';
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
  HostServer,
  Transport,
  createSniffingServerFactory,
  getSpikePageHtml,
} from '@imposter/shared';
import { getEmbeddedWebAsset } from '@imposter/shared/src/webAssets';
import { TcpTransport, TcpTransportOptions } from '../transport/TcpTransport';
import { LocalTransport } from '../transport/LocalTransport';
import { useProfileStore } from './profileStore';
import { setLastKnownHostIp } from '../transport/discovery';

export const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude easily confused chars like I/O
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

  // Hosting state
  isHosting: boolean;
  isStartingHost: boolean;
  hostServer: HostServer | null;
  hostIp: string | null;
  roomCode: string | null;

  // Identity / credentials
  playerId: string | null;
  resumeToken: string | null;
  isKicked: boolean;
  lastConnectTarget: ConnectTarget | null;
  lastPlayerInfo: { name: string; avatar: string } | null;
  myLastVoteTargetId: string | null;

  // Authoritative synced state
  stateSync: ServerStateSync | null;
  voteProgress: ServerVoteProgress | null;
  lastVoteResult: ServerVoteResult | null;
  lastGameOver: ServerGameOver | null;
  lastError: ServerError | null;

  // Actions
  startHosting: (name: string, avatar: string, port?: number) => Promise<void>;
  setHostIp: (ip: string) => void;
  joinGame: (target: ConnectTarget, roomCode: string, name: string, avatar: string) => Promise<void>;
  connect: (target: ConnectTarget, options: Omit<TcpTransportOptions, 'onRttUpdate' | 'onLog'>) => Promise<void>;
  resumeSession: () => Promise<void>;
  disconnect: () => void;
  leaveGame: () => void;

  submitVote: (voteIndex: number, targetId: string) => void;
  setSettings: (settings: Settings) => void;
  startGame: () => void;
  deal: () => void;
  openVote: () => void;
  nextRound: () => void;
  kick: (playerId: string) => void;
  transferHost: (playerId: string) => void;
  playAgain: () => void;
  leave: () => void;
  resync: () => void;
  clearError: () => void;
}

let cmdCounter = 0;
const nextCmdId = () => `cmd-${Date.now()}-${++cmdCounter}`;

const handleIncomingMsg = (msg: ServerMsg, set: any) => {
  switch (msg.t) {
    case 'welcome':
      set({
        playerId: msg.playerId,
        resumeToken: msg.resume,
        roomCode: msg.room,
      });
      break;

    case 'state_sync':
      set((prev: any) => {
        const me = msg.players.find((p) => p.id === prev.playerId);
        if (me && me.avatar && me.avatar !== useProfileStore.getState().avatar) {
          useProfileStore.getState().setAvatar(me.avatar);
        }
        return {
          stateSync: msg,
          ...(msg.phase === 'LOBBY' || msg.phase === 'DEALING'
            ? { voteProgress: null, myLastVoteTargetId: null }
            : {}),
        };
      });
      break;

    case 'vote_progress':
      set({ voteProgress: msg });
      break;

    case 'vote_result':
      set({ lastVoteResult: msg });
      break;

    case 'game_over':
      set({ lastGameOver: msg });
      break;

    case 'error':
      if (msg.code === 'KICKED') {
        set({ isKicked: true });
      }
      if (msg.code === 'ROOM_CLOSED' || msg.code === 'HOST_DISCONNECTED') {
        set({
          stateSync: null,
          status: 'closed',
          lastError: msg,
          playerId: null,
          resumeToken: null,
          roomCode: null,
        });
      } else {
        set({ lastError: msg });
      }
      break;
  }
};

let activeHostServer: HostServer | null = null;
let activeStopPromise: Promise<void> | null = null;

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

  stateSync: null,
  voteProgress: null,
  lastVoteResult: null,
  lastGameOver: null,
  lastError: null,

  setHostIp: (hostIp: string) => set({ hostIp }),

  startHosting: async (name: string, avatar: string, port = 47777) => {
    if (get().isStartingHost) {
      console.log('[startHosting] Already starting host, ignoring duplicate press');
      return;
    }
    if (!NativeModules || !NativeModules.TcpSockets) {
      console.warn('[startHosting] NativeModules.TcpSockets is missing. Running in Expo Go instead of standalone/dev APK.');
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'NATIVE_MODULE_REQUIRED',
          message:
            'Native TCP is not available in Expo Go.\n\nPlease open the "Imposter" app on your device/emulator (not Expo Go), or run "npm run android".',
        },
        isHosting: false,
        hostServer: null,
        isStartingHost: false,
      });
      return;
    }

    set({ isStartingHost: true, lastError: null });

    // 1. Properly await cleanup of any previous server to prevent EADDRINUSE port collisions
    if (activeStopPromise) {
      console.log('[startHosting] Waiting for previous server to finish closing...');
      try {
        await activeStopPromise;
      } catch {}
      activeStopPromise = null;
    }

    const prevServer = get().hostServer || activeHostServer;
    if (prevServer) {
      try {
        await prevServer.stop();
      } catch {}
      activeHostServer = null;
    }
    const prevTransport = get().transport;
    if (prevTransport) {
      try {
        prevTransport.close();
      } catch {}
    }
    // Give native Android TCP stack 300ms to release port
    await new Promise((resolve) => setTimeout(resolve, 300));

    const roomCode = generateRoomCode();
    let hostIp = '127.0.0.1';
    try {
      const ip = await Promise.race([
        Network.getIpAddressAsync(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('IP timeout')), 1500)),
      ]);
      if (ip && ip.includes('.') && ip !== '127.0.0.1') {
        hostIp = ip;
      } else {
        // If device IP is 127.0.0.1 or undefined, check network state
        try {
          const netState = await Network.getNetworkStateAsync();
          if (!netState.isConnected || netState.type !== Network.NetworkStateType.WIFI) {
            // Very common: phone is hotspot AP
            hostIp = '192.168.43.1';
          }
        } catch {}
      }
      console.log(`[Network Host] Host IP selected: "${hostIp}"`);
    } catch (err: any) {
      console.log(`[Network Host] Fallback IP used: 127.0.0.1 (${err?.message})`);
    }

    const hostId = `h-${Date.now().toString(36)}`;
    const server = new HostServer({
      roomCode,
      hostId,
      port,
      createServer: createSniffingServerFactory(
        (connectionListener) => TcpSocket.createServer(connectionListener),
        {
          sha1Base64: async (input: string) => {
            return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, input, {
              encoding: Crypto.CryptoEncoding.BASE64,
            });
          },
          getAsset: getEmbeddedWebAsset,
          getSpikeHtml: () => getSpikePageHtml(),
          onLog: (msg) => {
            set((s) => ({ logs: [...s.logs.slice(-49), msg] }));
          },
        }
      ),
      onLog: (msg) => {
        set((s) => ({ logs: [...s.logs.slice(-49), msg] }));
      },
    });

    try {
      await server.start();
      activeHostServer = server;
    } catch (err: any) {
      console.error('[startHosting] Failed to start server:', err);
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'HOST_START_FAILED',
          message: `Could not start host server on port ${port}: ${err.message || 'Port in use'}. Please try again.`,
        },
        isHosting: false,
        hostServer: null,
        isStartingHost: false,
      });
      return;
    }

    try {
      // The host device's LocalTransport carries the EXACT same hostId
      // generated here and passed to HostServer/createRoom.
      const clientSocket = server.connectLocalClient();
      const transport = new LocalTransport(clientSocket, {
        room: roomCode,
        name,
        avatar,
        playerId: hostId,
        onRttUpdate: (rtt) => set({ rtt }),
        onLog: (msg) =>
          set((s) => ({
            logs: [...s.logs.slice(-49), msg],
          })),
      });

      transport.onStatus((status) => {
        set({ status });
      });

      transport.onMessage((msg: ServerMsg) => {
        handleIncomingMsg(msg, set);
      });

      set({
        isHosting: true,
        hostServer: server,
        hostIp,
        roomCode,
        isKicked: false,
        transport,
        playerId: hostId,
      });

      await transport.connect();
    } catch (err: any) {
      console.error('[startHosting] Transport connect error:', err);
      try {
        await server.stop();
      } catch {}
      activeHostServer = null;
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'HOST_START_FAILED',
          message: `Host connection error: ${err.message}. Please try again.`,
        },
        isHosting: false,
        hostServer: null,
      });
    } finally {
      set({ isStartingHost: false });
    }
  },

  joinGame: async (target: ConnectTarget, roomCode: string, name: string, avatar: string) => {
    if (!NativeModules || !NativeModules.TcpSockets) {
      console.warn('[joinGame] NativeModules.TcpSockets is missing. Running in Expo Go instead of standalone/dev APK.');
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'NATIVE_MODULE_REQUIRED',
          message:
            'Native TCP is not available in Expo Go.\n\nPlease open the "Imposter" app on your device/emulator (not Expo Go), or run "npm run android".',
        },
        status: 'closed',
      });
      return;
    }

    get().leaveGame();
    // Clear any previous credentials for a clean new join
    set({
      isHosting: false,
      roomCode,
      isKicked: false,
      lastError: null,
      playerId: null,
      resumeToken: null,
      lastConnectTarget: target,
      lastPlayerInfo: { name, avatar },
    });
    try {
      await get().connect(target, {
        room: roomCode,
        name,
        avatar,
      });
      setLastKnownHostIp(target.host);
    } catch (err: any) {
      set({
        lastError: {
          v: 1,
          t: 'error',
          code: 'CONNECTION_FAILED',
          message: `Cannot reach host at ${target.host}:${target.port}. Check that the host started the lobby and both devices are on the same Wi-Fi or hotspot.`,
        },
        status: 'closed',
      });
      throw err;
    }
  },

  connect: async (target: ConnectTarget, options) => {
    const existingTransport = get().transport;
    if (existingTransport) {
      existingTransport.close();
    }

    const transport = new TcpTransport({
      ...options,
      playerId: options.playerId || get().playerId || undefined,
      resumeToken: options.resumeToken || get().resumeToken || undefined,
      onRttUpdate: (rtt) => set({ rtt }),
      onLog: (msg) =>
        set((s) => ({
          logs: [...s.logs.slice(-49), msg],
        })),
    });

    transport.onStatus((status) => {
      set({ status });
    });

    transport.onMessage((msg: ServerMsg) => {
      handleIncomingMsg(msg, set);
    });

    set({
      transport,
      lastConnectTarget: target,
      lastPlayerInfo: { name: options.name, avatar: options.avatar },
    });
    await transport.connect(target);
  },

  resumeSession: async () => {
    const { lastConnectTarget, roomCode, playerId, resumeToken, lastPlayerInfo } = get();
    if (!lastConnectTarget || !roomCode || !resumeToken || !lastPlayerInfo) {
      throw new Error('No session resume credentials stored');
    }
    console.log(`[gameStore] Resuming session with token for room ${roomCode}...`);
    await get().connect(lastConnectTarget, {
      room: roomCode,
      name: lastPlayerInfo.name,
      avatar: lastPlayerInfo.avatar,
      playerId: playerId || undefined,
      resumeToken: resumeToken || undefined,
    });
  },

  disconnect: () => {
    const { transport } = get();
    if (transport) {
      transport.close();
      set({ transport: null, status: 'closed' });
    }
  },

  leaveGame: () => {
    const { transport, hostServer } = get();
    const serverToStop = hostServer || activeHostServer;
    activeHostServer = null;
    if (serverToStop) {
      activeStopPromise = (async () => {
        try {
          serverToStop.closeRoom();
          await serverToStop.stop();
        } catch {}
      })();
    }
    if (transport) {
      try {
        transport.send({ v: 1, t: 'leave' });
        transport.close();
      } catch {}
    }
    set({
      transport: null,
      hostServer: null,
      isHosting: false,
      isStartingHost: false,
      status: 'closed',
      stateSync: null,
      voteProgress: null,
      lastVoteResult: null,
      lastGameOver: null,
      lastError: null,
      isKicked: false,
      playerId: null,
      resumeToken: null,
      roomCode: null,
      lastConnectTarget: null,
      lastPlayerInfo: null,
      myLastVoteTargetId: null,
    });
  },

  submitVote: (voteIndex: number, targetId: string) => {
    set({ myLastVoteTargetId: targetId });
    const { transport } = get();
    if (transport) {
      transport.send({
        v: 1,
        t: 'submit_vote',
        cmdId: nextCmdId(),
        voteIndex,
        targetId,
      });
    }
  },

  setSettings: (settings: Settings) => {
    const { transport } = get();
    if (transport) {
      transport.send({
        v: 1,
        t: 'set_settings',
        settings,
      });
    }
  },

  startGame: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'start_game' });
    }
  },

  deal: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'deal' });
    }
  },

  openVote: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'open_vote' });
    }
  },

  nextRound: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'next_round' });
    }
  },

  kick: (playerId: string) => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'kick', playerId });
    }
  },

  transferHost: (playerId: string) => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'transfer_host', playerId });
    }
  },

  playAgain: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'play_again' });
    }
  },

  leave: () => {
    get().leaveGame();
  },

  resync: () => {
    const { transport } = get();
    if (transport) {
      transport.send({ v: 1, t: 'resync' });
    }
  },

  clearError: () => set({ lastError: null }),
}));
