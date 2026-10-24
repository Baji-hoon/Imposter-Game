import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Network from 'expo-network';
import QRCode from 'react-native-qrcode-svg';
import TcpSocket from 'react-native-tcp-socket';
import { NdjsonFramer } from '@imposter/shared';

const PORT = 47777;
const PING_INTERVAL_MS = 5000;
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5000;

interface LogEntry {
  id: string;
  time: string;
  type: 'host' | 'client' | 'ping' | 'pong' | 'error' | 'info';
  message: string;
}

export default function SpikeScreen() {
  const [deviceIp, setDeviceIp] = useState<string>('Detecting IP...');
  const [targetIp, setTargetIp] = useState<string>('');

  // Host state
  const [isHosting, setIsHosting] = useState<boolean>(false);
  const serverRef = useRef<any>(null);
  const hostClientsRef = useRef<any[]>([]);

  // Client state
  const [isClientActive, setIsClientActive] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [rtt, setRtt] = useState<number | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [nextReconnectIn, setNextReconnectIn] = useState<number | null>(null);

  const clientSocketRef = useRef<any>(null);
  const pingTimerRef = useRef<any>(null);
  const reconnectTimerRef = useRef<any>(null);
  const backoffRef = useRef<number>(INITIAL_BACKOFF_MS);
  const pingCounterRef = useRef<number>(0);
  const shouldReconnectRef = useRef<boolean>(false);

  // Event logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const addLog = (type: LogEntry['type'], message: string) => {
    const now = new Date();
    const time = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, type, message }]);
  };

  // Detect IP on mount
  useEffect(() => {
    Network.getIpAddressAsync()
      .then((ip) => {
        setDeviceIp(ip);
        if (!targetIp) setTargetIp(ip);
        addLog('info', `Device IP detected: ${ip}`);
      })
      .catch((err) => {
        setDeviceIp('127.0.0.1');
        setTargetIp('127.0.0.1');
        addLog('error', `Failed to get device IP: ${err.message || err}`);
      });

    return () => {
      stopHost();
      stopClient();
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [logs]);

  // --- Host Implementation ---
  const startHost = () => {
    try {
      addLog('host', `Starting TCP server on port ${PORT}...`);
      const server = TcpSocket.createServer((socket) => {
        const clientDesc = `${socket.remoteAddress}:${socket.remotePort}`;
        addLog('host', `Client connected from ${clientDesc}`);
        hostClientsRef.current.push(socket);

        const framer = new NdjsonFramer();

        socket.on('data', (data) => {
          const chunk = typeof data === 'string' ? data : data.toString('utf8');
          const lines = framer.push(chunk);

          for (const line of lines) {
            try {
              const msg = JSON.parse(line);
              if (msg.t === 'ping') {
                addLog('host', `Received ping #${msg.id} from ${clientDesc}`);
                const pongMsg = { v: 1, t: 'pong', id: msg.id, ts: msg.ts };
                socket.write(NdjsonFramer.serialize(pongMsg));
              }
            } catch (err: any) {
              addLog('error', `Host JSON parse error: ${err.message}`);
            }
          }
        });

        socket.on('error', (err) => {
          addLog('error', `Host client socket error (${clientDesc}): ${err.message}`);
        });

        socket.on('close', () => {
          addLog('host', `Client disconnected: ${clientDesc}`);
          hostClientsRef.current = hostClientsRef.current.filter((s) => s !== socket);
        });
      });

      server.listen({ port: PORT, host: '0.0.0.0' }, () => {
        setIsHosting(true);
        addLog('host', `TCP server running on 0.0.0.0:${PORT}`);
      });

      server.on('error', (err) => {
        addLog('error', `Server error: ${err.message}`);
        stopHost();
      });

      serverRef.current = server;
    } catch (err: any) {
      addLog('error', `Failed to start server: ${err.message}`);
    }
  };

  const stopHost = () => {
    if (serverRef.current) {
      addLog('host', 'Stopping TCP server...');
      hostClientsRef.current.forEach((s) => s.destroy());
      hostClientsRef.current = [];
      serverRef.current.close();
      serverRef.current = null;
      setIsHosting(false);
      addLog('host', 'TCP server stopped.');
    }
  };

  // --- Client Implementation ---
  const startClient = () => {
    shouldReconnectRef.current = true;
    backoffRef.current = INITIAL_BACKOFF_MS;
    setReconnectAttempt(0);
    setIsClientActive(true);
    connectSocket();
  };

  const connectSocket = () => {
    if (!shouldReconnectRef.current) return;

    const host = targetIp.trim() || '127.0.0.1';
    addLog('client', `Connecting to ${host}:${PORT}...`);

    try {
      const client = TcpSocket.createConnection({ port: PORT, host }, () => {
        setIsConnected(true);
        backoffRef.current = INITIAL_BACKOFF_MS;
        setReconnectAttempt(0);
        setNextReconnectIn(null);
        addLog('client', `Connected to ${host}:${PORT}!`);

        // Start ping loop every 5s
        startPingLoop();
      });

      const framer = new NdjsonFramer();

      client.on('data', (data) => {
        const chunk = typeof data === 'string' ? data : data.toString('utf8');
        const lines = framer.push(chunk);

        for (const line of lines) {
          try {
            const msg = JSON.parse(line);
            if (msg.t === 'pong') {
              const latency = Date.now() - msg.ts;
              setRtt(latency);
              addLog('pong', `Received pong #${msg.id} (RTT: ${latency} ms)`);
            }
          } catch (err: any) {
            addLog('error', `Client JSON parse error: ${err.message}`);
          }
        }
      });

      client.on('error', (err) => {
        addLog('error', `Client socket error: ${err.message}`);
      });

      client.on('close', () => {
        setIsConnected(false);
        setRtt(null);
        stopPingLoop();
        clientSocketRef.current = null;
        addLog('client', 'Connection closed.');

        if (shouldReconnectRef.current) {
          scheduleReconnect();
        }
      });

      clientSocketRef.current = client;
    } catch (err: any) {
      addLog('error', `Failed to create connection: ${err.message}`);
      if (shouldReconnectRef.current) {
        scheduleReconnect();
      }
    }
  };

  const scheduleReconnect = () => {
    // Exponential backoff with jitter (0.5 s to 5 s)
    const base = backoffRef.current;
    const jitter = Math.floor(Math.random() * 200);
    const delay = Math.min(MAX_BACKOFF_MS, base + jitter);

    // Increase for next round
    backoffRef.current = Math.min(MAX_BACKOFF_MS, Math.floor(base * 1.5));

    setReconnectAttempt((prev) => prev + 1);
    setNextReconnectIn(delay);
    addLog('client', `Auto-reconnecting in ${(delay / 1000).toFixed(2)}s (attempt #${reconnectAttempt + 1})...`);

    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      setNextReconnectIn(null);
      connectSocket();
    }, delay);
  };

  const startPingLoop = () => {
    stopPingLoop();
    sendPing();
    pingTimerRef.current = setInterval(() => {
      sendPing();
    }, PING_INTERVAL_MS);
  };

  const stopPingLoop = () => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  };

  const sendPing = () => {
    if (!clientSocketRef.current) return;
    pingCounterRef.current++;
    const pingId = `p-${pingCounterRef.current}`;
    const pingPayload = {
      v: 1,
      t: 'ping',
      id: pingId,
      ts: Date.now(),
    };
    addLog('ping', `Sent ping #${pingId}`);
    try {
      clientSocketRef.current.write(NdjsonFramer.serialize(pingPayload));
    } catch (err: any) {
      addLog('error', `Failed to write ping: ${err.message}`);
    }
  };

  const killConnection = () => {
    addLog('client', 'Forcibly killing connection ("Kill connection" pressed)...');
    if (clientSocketRef.current) {
      clientSocketRef.current.destroy();
      clientSocketRef.current = null;
    }
  };

  const stopClient = () => {
    shouldReconnectRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    stopPingLoop();
    if (clientSocketRef.current) {
      clientSocketRef.current.destroy();
      clientSocketRef.current = null;
    }
    setIsClientActive(false);
    setIsConnected(false);
    setRtt(null);
    setNextReconnectIn(null);
    addLog('client', 'Client stopped.');
  };

  const qrValue = `imposter://join?h=${deviceIp}&p=${PORT}&c=SPIKE`;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Device IP Info</Text>
          <Text style={styles.ipText}>{deviceIp}:{PORT}</Text>
        </View>

        {/* Host Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TCP Server (Host)</Text>
          <Text style={styles.cardSubtitle}>
            Starts listening on 0.0.0.0:{PORT}
          </Text>

          {isHosting ? (
            <View style={styles.hostActiveContainer}>
              <View style={styles.badgeSuccess}>
                <Text style={styles.badgeText}>Server RUNNING on port {PORT}</Text>
              </View>

              <View style={styles.qrContainer}>
                <QRCode value={qrValue} size={160} backgroundColor="#FFFFFF" color="#000000" />
                <Text style={styles.qrLabel}>{qrValue}</Text>
              </View>

              <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={stopHost}>
                <Text style={styles.buttonText}>Stop TCP Server</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={startHost}>
              <Text style={styles.buttonText}>Start TCP Server (Host)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Client Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>TCP Client (Join)</Text>

          <Text style={styles.inputLabel}>Target Host IP:</Text>
          <TextInput
            style={styles.input}
            value={targetIp}
            onChangeText={setTargetIp}
            placeholder="e.g. 192.168.1.50"
            placeholderTextColor="#64748B"
            autoCapitalize="none"
            keyboardType="numeric"
            editable={!isClientActive}
          />

          {isClientActive ? (
            <View style={styles.clientActiveContainer}>
              <View style={isConnected ? styles.badgeSuccess : styles.badgeWarning}>
                <Text style={styles.badgeText}>
                  {isConnected ? 'Status: CONNECTED' : 'Status: RECONNECTING...'}
                </Text>
              </View>

              {isConnected && rtt !== null && (
                <View style={styles.rttContainer}>
                  <Text style={styles.rttLabel}>Latest Heartbeat RTT:</Text>
                  <Text style={[styles.rttValue, rtt < 150 ? styles.rttGreen : rtt < 500 ? styles.rttYellow : styles.rttRed]}>
                    {rtt} ms
                  </Text>
                </View>
              )}

              {nextReconnectIn !== null && (
                <Text style={styles.reconnectText}>
                  Reconnecting in {(nextReconnectIn / 1000).toFixed(1)}s (backoff active)
                </Text>
              )}

              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.button, styles.buttonWarning, { flex: 1, marginRight: 8 }]}
                  onPress={killConnection}
                >
                  <Text style={styles.buttonText}>Kill connection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger, { flex: 1 }]}
                  onPress={stopClient}
                >
                  <Text style={styles.buttonText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[styles.button, styles.buttonSuccess]} onPress={startClient}>
              <Text style={styles.buttonText}>Connect to Host (Join)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Event Logs */}
        <View style={styles.card}>
          <View style={styles.logHeader}>
            <Text style={styles.cardTitle}>Live Event Log ({logs.length})</Text>
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={styles.clearLogsText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.logBox}
            nestedScrollEnabled
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyLogText}>No events recorded yet. Start host or connect.</Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logLine}>
                  <Text style={styles.logTime}>[{log.time}]</Text>
                  <Text
                    style={[
                      styles.logTag,
                      log.type === 'host' && styles.tagHost,
                      log.type === 'client' && styles.tagClient,
                      log.type === 'ping' && styles.tagPing,
                      log.type === 'pong' && styles.tagPong,
                      log.type === 'error' && styles.tagError,
                    ]}
                  >
                    [{log.type.toUpperCase()}]
                  </Text>
                  <Text style={styles.logMsg}>{log.message}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#151D2F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 12,
  },
  ipText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38BDF8',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#F8FAFC',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  button: {
    minHeight: 56, // min tap target 56 pt
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: '#0284C7',
  },
  buttonSuccess: {
    backgroundColor: '#059669',
  },
  buttonWarning: {
    backgroundColor: '#D97706',
  },
  buttonDanger: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hostActiveContainer: {
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  qrLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#0B0F19',
    fontWeight: '600',
  },
  clientActiveContainer: {
    marginTop: 4,
  },
  badgeSuccess: {
    backgroundColor: '#064E3B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeWarning: {
    backgroundColor: '#78350F',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  rttContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rttLabel: {
    fontSize: 15,
    color: '#94A3B8',
    marginRight: 8,
  },
  rttValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  rttGreen: {
    color: '#34D399',
  },
  rttYellow: {
    color: '#FBBF24',
  },
  rttRed: {
    color: '#F87171',
  },
  reconnectText: {
    fontSize: 13,
    color: '#F59E0B',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clearLogsText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  logBox: {
    height: 220,
    backgroundColor: '#0B0F19',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 10,
  },
  emptyLogText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  logLine: {
    flexDirection: 'row',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  logTime: {
    color: '#64748B',
    fontSize: 11,
    marginRight: 4,
  },
  logTag: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 6,
    color: '#94A3B8',
  },
  tagHost: {
    color: '#38BDF8',
  },
  tagClient: {
    color: '#34D399',
  },
  tagPing: {
    color: '#A78BFA',
  },
  tagPong: {
    color: '#FBBF24',
  },
  tagError: {
    color: '#F87171',
  },
  logMsg: {
    color: '#E2E8F0',
    fontSize: 12,
    flex: 1,
  },
});
