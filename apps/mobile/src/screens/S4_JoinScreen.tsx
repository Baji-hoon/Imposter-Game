import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { tokens } from '@imposter/shared';
import { useGameStore } from '../store/gameStore';
import { useProfileStore } from '../store/profileStore';
import {
  discover,
  findByCode,
  probeHost,
  getLastSuccessfulHost,
  setLastSuccessfulHost,
  getLatestDebugSummary,
  DiscoveryDebugSummary,
  DiscoveredRoom,
} from '../transport/discovery';
import {
  BrutalButton,
  BrutalCard,
  BrutalInput,
  BrutalBox,
  Sheet,
  AvatarTile,
} from '../ui';

interface S4JoinScreenProps {
  onBack: () => void;
}

import { parseJoinUrl, ParsedJoinTarget } from '@imposter/shared';
export { parseJoinUrl };
export type { ParsedJoinTarget };

export const S4_JoinScreen: React.FC<S4JoinScreenProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const { name, avatar } = useProfileStore();
  const joinGame = useGameStore((s) => s.joinGame);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);

  const [code, setCode] = useState<string>('');
  const [nearbyRooms, setNearbyRooms] = useState<DiscoveredRoom[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [passCount, setPassCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Failure state for 8s code lookup dead-end prevention
  const [codeSearchFailed, setCodeSearchFailed] = useState<string | null>(null);

  // Sheets
  const [showScanQrSheet, setShowScanQrSheet] = useState<boolean>(false);
  const [qrSheetInput, setQrSheetInput] = useState<string>('');
  const [showTroubleSheet, setShowTroubleSheet] = useState<boolean>(false);
  const [manualHostIp, setManualHostIp] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [troublePasteLink, setTroublePasteLink] = useState<string>('');

  // Diagnostics panel
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [debugSummary, setDebugSummary] = useState<DiscoveryDebugSummary>(getLatestDebugSummary());

  const codeInputRef = useRef<TextInput>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const joinAbortRef = useRef<AbortController | null>(null);

  /**
   * Performs progressive LAN discovery:
   * 1. Probes remembered host first alone (< 40ms) for instant zero-typing display.
   * 2. Runs full subnet scan (concurrency 40, connect timeout 400ms).
   * 3. Streams discovered rooms progressively as each answers probe_ok.
   */
  const runScan = useCallback(async (isManual = false) => {
    if (isScanning && !isManual) return;

    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    setIsScanning(true);
    if (isManual) {
      setPassCount(0);
      setStatusNotice('Searching local Wi-Fi for games…');
    }

    try {
      // Step A: Probe remembered last host first alone for instant results (< 40ms)
      const lastHost = getLastSuccessfulHost();
      if (lastHost && !controller.signal.aborted) {
        try {
          const quickRoom = await probeHost(lastHost, 47777, 400, controller.signal);
          if (quickRoom && !controller.signal.aborted) {
            setNearbyRooms((prev) => {
              const existingIdx = prev.findIndex(
                (r) => r.host === quickRoom.host && r.port === quickRoom.port
              );
              if (existingIdx >= 0) {
                const next = [...prev];
                next[existingIdx] = quickRoom;
                return next;
              }
              return [quickRoom, ...prev];
            });
          }
        } catch {}
      }

      // Step B: Full subnet discovery pass with progressive results
      await discover({
        signal: controller.signal,
        onFound: (room) => {
          setNearbyRooms((prev) => {
            const existingIdx = prev.findIndex(
              (r) => r.host === room.host && r.port === room.port
            );
            if (existingIdx >= 0) {
              const next = [...prev];
              next[existingIdx] = room;
              return next;
            }
            return [...prev, room];
          });
        },
      });
    } catch {
      // Aborted or scan error
    } finally {
      if (!controller.signal.aborted) {
        setIsScanning(false);
        setPassCount((prev) => prev + 1);
        if (isManual) {
          setStatusNotice(null);
        }
      }
    }
  }, [isScanning]);

  // Initial scan on mount + re-scan every 8 seconds while screen is focused/mounted
  useEffect(() => {
    runScan();

    const intervalTimer = setInterval(() => {
      runScan();
    }, 8000);

    return () => {
      clearInterval(intervalTimer);
      scanAbortRef.current?.abort();
      joinAbortRef.current?.abort();
    };
  }, []);

  // Direct join from discovered room card
  const handleJoinDirect = async (room: DiscoveredRoom) => {
    if (!room.joinable || isSubmitting) return;

    scanAbortRef.current?.abort();
    setIsSubmitting(true);
    clearError();
    setStatusNotice(`Connecting to room ${room.room}…`);

    try {
      setLastSuccessfulHost(room.host);
      await joinGame({ host: room.host, port: room.port }, room.room, name, avatar);
    } catch (err: any) {
      setStatusNotice(err?.message || 'Could not connect to room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join by 4-letter room code
  const handleJoinByCode = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 4 || isSubmitting) return;

    setIsSubmitting(true);
    clearError();
    setCodeSearchFailed(null);
    setStatusNotice(`Searching local Wi-Fi for room ${cleanCode}…`);

    joinAbortRef.current?.abort();
    const controller = new AbortController();
    joinAbortRef.current = controller;

    try {
      // Check if room is already in nearbyRooms
      const existing = nearbyRooms.find((r) => r.room.toUpperCase() === cleanCode);
      if (existing) {
        if (!existing.joinable) {
          setStatusNotice(`Room "${cleanCode}" has already started.`);
          setIsSubmitting(false);
          return;
        }
        scanAbortRef.current?.abort();
        setLastSuccessfulHost(existing.host);
        await joinGame({ host: existing.host, port: existing.port }, existing.room, name, avatar);
        return;
      }

      // Otherwise search across LAN (timeout 8s)
      const found = await findByCode(cleanCode, controller.signal, { timeoutMs: 8000 });
      if (controller.signal.aborted) return;

      if (found) {
        if (!found.joinable) {
          setStatusNotice(`Room "${cleanCode}" has already started.`);
          return;
        }
        scanAbortRef.current?.abort();
        setLastSuccessfulHost(found.host);
        await joinGame({ host: found.host, port: found.port }, found.room, name, avatar);
      } else {
        // Failed after 8 s -> show CAN'T FIND <CODE> dead-end recovery card
        setCodeSearchFailed(cleanCode);
        setStatusNotice(null);
      }
    } catch (err: any) {
      if (!controller.signal.aborted) {
        setCodeSearchFailed(cleanCode);
        setStatusNotice(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSubmitting(false);
      }
    }
  };

  // Handle QR sheet submit (accepts imposter://, http://, or 4-letter code)
  const handleApplyQrLink = () => {
    const parsed = parseJoinUrl(qrSheetInput);
    if (!parsed) {
      Alert.alert('Invalid Link', 'Please enter a valid QR link (imposter://... or http://...) or 4-letter room code.');
      return;
    }

    setShowScanQrSheet(false);
    setQrSheetInput('');

    if (parsed.code) {
      setCode(parsed.code);
    }

    if (parsed.host && parsed.code) {
      scanAbortRef.current?.abort();
      setIsSubmitting(true);
      clearError();
      setLastSuccessfulHost(parsed.host);
      joinGame({ host: parsed.host, port: parsed.port ?? 47777 }, parsed.code, name, avatar)
        .catch(() => {})
        .finally(() => setIsSubmitting(false));
    }
  };

  // Handle direct connect from Trouble Joining sheet
  const handleDirectConnectFromSheet = () => {
    // If a paste link was entered in trouble sheet, try parsing that first
    if (troublePasteLink.trim()) {
      const parsed = parseJoinUrl(troublePasteLink);
      if (parsed?.host && parsed?.code) {
        setShowTroubleSheet(false);
        setTroublePasteLink('');
        scanAbortRef.current?.abort();
        setIsSubmitting(true);
        clearError();
        setLastSuccessfulHost(parsed.host);
        joinGame({ host: parsed.host, port: parsed.port ?? 47777 }, parsed.code, name, avatar)
          .catch(() => {})
          .finally(() => setIsSubmitting(false));
        return;
      }
    }

    const host = manualHostIp.trim();
    const targetCode = (manualCode.trim() || code.trim()).toUpperCase();

    if (!host) {
      Alert.alert('Missing Host IP', 'Please enter the Host IP address shown on the host phone.');
      return;
    }

    if (targetCode.length !== 4) {
      Alert.alert('Missing Code', 'Please enter the 4-letter room code.');
      return;
    }

    setShowTroubleSheet(false);
    scanAbortRef.current?.abort();
    setIsSubmitting(true);
    clearError();
    setLastSuccessfulHost(host);
    joinGame({ host, port: 47777 }, targetCode, name, avatar)
      .catch(() => {})
      .finally(() => setIsSubmitting(false));
  };

  const isCodeComplete = code.trim().length === 4;
  const canConnect = isCodeComplete && !isSubmitting;
  const letters = [code[0] || '', code[1] || '', code[2] || '', code[3] || ''];

  const topInset = Math.max(insets.top, 16);
  const bottomInset = Math.max(insets.bottom, 24) + 16;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Square Neutral Icon Back Button & Title with Hidden Debug on Long-Press */}
        <View style={styles.topHeader}>
          <BrutalButton
            variant="neutral"
            icon="arrow-left"
            square={true}
            onPress={onBack}
            accessibilityLabel="Back to Home"
          />

          <View style={styles.headerTitleWrap}>
            <Pressable
              onLongPress={() => {
                setDebugSummary(getLatestDebugSummary());
                setShowDebugPanel(true);
              }}
              delayLongPress={500}
              accessibilityLabel="Join Game title. Long press for diagnostics."
            >
              <Text style={styles.titleH1} numberOfLines={1}>
                JOIN GAME
              </Text>
            </Pressable>
          </View>
          <View style={{ width: 56 }} />
        </View>

        {/* Status / Error Notices */}
        {statusNotice && (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{statusNotice}</Text>
          </View>
        )}

        {lastError && (
          <Pressable onPress={clearError} style={styles.errorWrapper}>
            <BrutalCard title="ERROR" subtitle={lastError.code} color="red">
              <Text style={styles.errorText}>
                {lastError.message || 'An error occurred'}
              </Text>
              <Text style={styles.errorDismiss}>TAP TO DISMISS</Text>
            </BrutalCard>
          </Pressable>
        )}

        {/* PRIMARY ACTION: SCAN QR CODE (Item 2: Make SCAN QR primary) */}
        <View style={styles.primaryActionSection}>
          <BrutalButton
            title="SCAN QR CODE"
            variant="primary"
            icon="qrcode"
            onPress={() => setShowScanQrSheet(true)}
            style={styles.primaryActionButton}
          />

          <BrutalButton
            title="ENTER CODE MANUALLY"
            variant="secondary"
            icon="keyboard"
            onPress={() => {
              codeInputRef.current?.focus();
            }}
            style={styles.secondaryActionButton}
          />
        </View>

        {/* SECTION 1: NEARBY ROOMS / PROGRESSIVE SCAN RESULTS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>NEARBY GAMES</Text>
          {isScanning && (
            <View style={styles.scanningBadge}>
              <Text style={styles.scanningBadgeText}>SCANNING…</Text>
            </View>
          )}
        </View>

        {/* Case A: Rooms Discovered */}
        {nearbyRooms.length > 0 && (
          <View style={styles.roomListContainer}>
            {nearbyRooms.map((room) => {
              const isJoinable = room.joinable;
              return (
                <BrutalCard
                  key={`${room.host}:${room.port}`}
                  title={`ROOM ${room.room}`}
                  subtitle={`Host: ${room.hostName}`}
                  color="paper"
                  style={styles.roomCard}
                >
                  <View style={styles.roomContentRow}>
                    <AvatarTile
                      name={room.hostName}
                      avatar={room.hostAvatar}
                      tag="HOST"
                      size="mini"
                      disabled={true}
                    />
                    <View style={styles.roomDetailsCol}>
                      <Text style={styles.roomCodeText}>{room.room}</Text>
                      <Text style={styles.roomPlayerText}>
                        {room.players}/{room.max} PLAYERS
                      </Text>
                      <View style={styles.roomStatusPillRow}>
                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: isJoinable
                                ? tokens.colors.green
                                : tokens.colors.yellow,
                            },
                          ]}
                        >
                          <Text style={styles.statusPillText}>
                            {isJoinable ? 'LOBBY' : 'IN PROGRESS'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.roomActionCol}>
                      <BrutalButton
                        title={isJoinable ? 'JOIN' : 'STARTED'}
                        variant={isJoinable ? 'primary' : 'neutral'}
                        disabled={!isJoinable || isSubmitting}
                        disabledText={!isJoinable ? 'IN PROGRESS' : 'JOINING…'}
                        onPress={() => handleJoinDirect(room)}
                        style={styles.joinRoomButton}
                      />
                    </View>
                  </View>
                </BrutalCard>
              );
            })}

            <View style={styles.searchAgainRow}>
              <BrutalButton
                title={isScanning ? 'SCANNING…' : 'SEARCH AGAIN'}
                variant="neutral"
                disabled={isScanning}
                onPress={() => runScan(true)}
              />
            </View>
          </View>
        )}

        {/* Case B: Scanning first pass, no rooms yet */}
        {nearbyRooms.length === 0 && isScanning && passCount === 0 && (
          <BrutalCard
            title="SEARCHING FOR GAMES…"
            subtitle="Looking for open lobbies on your Wi-Fi"
            color="paper"
            style={styles.cardSpacing}
          >
            <View style={styles.emptyStateBox}>
              <FontAwesome5 name="wifi" size={28} color={tokens.colors.ink} />
              <Text style={styles.searchingHintText}>
                Rooms appear automatically as soon as found.
              </Text>
            </View>
          </BrutalCard>
        )}

        {/* Case C: Found nothing state */}
        {nearbyRooms.length === 0 && (!isScanning || passCount > 0) && (
          <BrutalCard
            title="NO GAMES NEARBY"
            subtitle="Same Wi-Fi? Or try the host's hotspot."
            color="paper"
            style={styles.cardSpacing}
          >
            <View style={styles.emptyStateBox}>
              {/* Mobile data routing hint: shown when scan found zero responses AND zero
                  refused connections — indicates all probes were routed through cellular
                  and never reached the LAN. */}
              {passCount >= 2 &&
                debugSummary.responded === 0 &&
                debugSummary.errors.refused === 0 &&
                Platform.OS === 'android' && (
                  <Text style={[styles.foundNothingHint, { color: tokens.colors.ink, marginBottom: 8 }]}>
                    Turn off mobile data and try again, or scan the host's QR.
                  </Text>
                )}
              <Text style={styles.foundNothingHint}>
                Same Wi-Fi? Or try the host's hotspot.
              </Text>
              <BrutalButton
                title={isScanning ? 'SCANNING…' : 'SEARCH AGAIN'}
                variant="neutral"
                disabled={isScanning}
                onPress={() => runScan(true)}
                style={{ marginTop: 16 }}
              />
            </View>
          </BrutalCard>
        )}

        {/* DEAD-END RECOVERY CARD (Item 1: When enter code fails after 8s, show CAN'T FIND <CODE>) */}
        {codeSearchFailed && (
          <BrutalCard
            title={`CAN'T FIND ${codeSearchFailed}`}
            subtitle="Room not found on local network"
            color="yellowSoft"
            style={styles.cardSpacing}
          >
            <Text style={styles.deadEndBodyText}>
              We checked your local Wi-Fi but couldn't detect room {codeSearchFailed}. Try scanning the host's QR code or entering their IP directly.
            </Text>
            <View style={styles.deadEndButtonsRow}>
              <BrutalButton
                title="SCAN HOST QR"
                variant="primary"
                icon="qrcode"
                onPress={() => setShowScanQrSheet(true)}
                style={styles.deadEndButton}
              />
              <BrutalButton
                title="ENTER HOST IP"
                variant="neutral"
                icon="wifi"
                onPress={() => {
                  setManualCode(codeSearchFailed);
                  setShowTroubleSheet(true);
                }}
                style={styles.deadEndButton}
              />
            </View>
          </BrutalCard>
        )}

        {/* SECTION 2: 4-LETTER CODE SLOTS */}
        <BrutalCard
          title="ENTER 4-LETTER CODE"
          subtitle="Enter 4-letter room code from the host"
          color="paper"
          style={styles.cardSpacing}
        >
          {/* Four Square Code Boxes with Display Serif Letters */}
          <Pressable
            onPress={() => codeInputRef.current?.focus()}
            style={styles.codeSlotsRow}
          >
            {letters.map((char, index) => (
              <BrutalBox
                key={index}
                hasShadow={true}
                contentStyle={styles.codeSlot}
              >
                <Text style={styles.codeSlotText}>{char}</Text>
              </BrutalBox>
            ))}
          </Pressable>

          {/* Invisible TextInput driving the 4 letters */}
          <TextInput
            ref={codeInputRef}
            value={code}
            onChangeText={(val) => {
              const cleaned = val.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4);
              setCode(cleaned);
              if (codeSearchFailed) setCodeSearchFailed(null);
            }}
            maxLength={4}
            autoCapitalize="characters"
            autoCorrect={false}
            keyboardType="ascii-capable"
            style={styles.hiddenInput}
          />

          {/* Connect Action Button */}
          <BrutalButton
            title={isSubmitting ? 'CONNECTING…' : 'CONNECT TO GAME'}
            variant="neutral"
            disabled={!canConnect}
            disabledText={!isCodeComplete ? 'ENTER 4-LETTER CODE' : 'CONNECTING…'}
            onPress={handleJoinByCode}
            style={{ marginTop: 12 }}
          />
        </BrutalCard>

        {/* FALLBACK: "Trouble joining?" Text Link (Item 1: Restore Fallback) */}
        <View style={styles.troubleLinkWrap}>
          <Pressable
            onPress={() => {
              setManualCode(code);
              setShowTroubleSheet(true);
            }}
            style={styles.troubleLink}
            accessibilityRole="button"
            accessibilityLabel="Trouble joining? Connect via IP or paste link"
          >
            <Text style={styles.troubleLinkText}>Trouble joining?</Text>
          </Pressable>
        </View>

        {/* SHEET 1: SCAN QR / PASTE LINK */}
        <Sheet
          visible={showScanQrSheet}
          onClose={() => setShowScanQrSheet(false)}
          title="SCAN OR PASTE QR LINK"
          subtitle="Scan with camera or paste the host's link"
        >
          <Text style={styles.sheetHelpText}>
            You can scan the host's QR code using your phone camera, or paste the link or 4-letter code below:
          </Text>

          <BrutalInput
            label="QR LINK OR ROOM CODE"
            value={qrSheetInput}
            onChangeText={setQrSheetInput}
            placeholder="imposter://... or http://... or SFXB"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <BrutalButton
            title="APPLY & JOIN"
            variant="primary"
            onPress={handleApplyQrLink}
            style={{ marginTop: 12 }}
          />
        </Sheet>

        {/* SHEET 2: TROUBLE JOINING (Item 1: Manual Host IP & Paste Link) */}
        <Sheet
          visible={showTroubleSheet}
          onClose={() => setShowTroubleSheet(false)}
          title="TROUBLE JOINING?"
          subtitle="Connect directly using the Host IP"
        >
          <Text style={styles.sheetHelpText}>
            Ask the host to read the "HOST IP" shown on their lobby screen (e.g. 192.168.0.109 or 192.168.43.1):
          </Text>

          <BrutalInput
            label="HOST IP ADDRESS"
            value={manualHostIp}
            onChangeText={setManualHostIp}
            placeholder="e.g. 192.168.0.109"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="numbers-and-punctuation"
          />

          <View style={{ height: 10 }} />

          <BrutalInput
            label="4-LETTER ROOM CODE"
            value={manualCode}
            onChangeText={(val) => setManualCode(val.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4))}
            placeholder="e.g. SFXB"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={4}
          />

          <View style={{ height: 10 }} />

          <BrutalInput
            label="OR PASTE LINK FROM HOST"
            value={troublePasteLink}
            onChangeText={setTroublePasteLink}
            placeholder="imposter://... or http://..."
            autoCapitalize="none"
            autoCorrect={false}
          />

          <BrutalButton
            title="DIRECT CONNECT"
            variant="primary"
            onPress={handleDirectConnectFromSheet}
            style={{ marginTop: 14 }}
          />
        </Sheet>

        {/* SHEET 3: DISCOVERY DIAGNOSTICS (Item 5: First IPs, first 5 errors with codes, build type) */}
        <Sheet
          visible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
          title="DISCOVERY DIAGNOSTICS"
          subtitle="LAN Scanner Debug Summary"
        >
          <View style={styles.debugCard}>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Build Type:</Text>
              <Text style={styles.debugVal}>{debugSummary.buildType || (typeof __DEV__ !== 'undefined' && __DEV__ ? 'DEBUG' : 'RELEASE')}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Own IP:</Text>
              <Text style={styles.debugVal}>{debugSummary.ownIp || 'Not detected'}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Network Interface:</Text>
              <Text style={styles.debugVal}>{debugSummary.networkType}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Candidates Probed:</Text>
              <Text style={styles.debugVal}>{debugSummary.candidates}</Text>
            </View>
            <View style={[styles.debugRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 6 }]}>
              <Text style={styles.debugLabel}>Host IPs Probed First:</Text>
              <Text style={[styles.debugVal, { fontSize: 12, marginTop: 3 }]}>
                {debugSummary.firstProbedIps && debugSummary.firstProbedIps.length > 0
                  ? debugSummary.firstProbedIps.join(', ')
                  : 'None'}
              </Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Responses (probe_ok):</Text>
              <Text style={styles.debugVal}>{debugSummary.responded}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Errors (Timeouts):</Text>
              <Text style={styles.debugVal}>{debugSummary.errors.timeout}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Errors (Refused):</Text>
              <Text style={styles.debugVal}>{debugSummary.errors.refused}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Errors (Other):</Text>
              <Text style={styles.debugVal}>{debugSummary.errors.other}</Text>
            </View>
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>Total Scan Duration:</Text>
              <Text style={styles.debugVal}>{debugSummary.durationMs} ms</Text>
            </View>

            {/* First 5 Errors (Item 5) */}
            <View style={styles.debugErrorsSection}>
              <Text style={styles.debugSectionTitle}>FIRST 5 ERRORS:</Text>
              {debugSummary.firstErrors && debugSummary.firstErrors.length > 0 ? (
                debugSummary.firstErrors.map((err, i) => (
                  <View key={i} style={styles.debugErrorItem}>
                    <Text style={styles.debugErrorHost}>{err.host}:</Text>
                    <Text style={styles.debugErrorMsg}>
                      {err.error} {err.code ? `[${err.code}]` : ''}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.debugErrorEmpty}>No errors recorded yet.</Text>
              )}
            </View>

            <View style={styles.debugNoticeBox}>
              <Text style={styles.debugNoticeText}>
                LIMITATION: Automatic discovery scans only the device's own /24 subnet. On Android, discovery binds to the 'wifi' interface to avoid routing through mobile data.
              </Text>
            </View>

            <BrutalButton
              title="RUN DIAGNOSTIC SCAN"
              variant="neutral"
              onPress={async () => {
                await discover();
                setDebugSummary(getLatestDebugSummary());
              }}
              style={{ marginTop: 12 }}
            />
          </View>
        </Sheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: tokens.shape.space.screen,
    paddingTop: 36,
    paddingBottom: 28,
    backgroundColor: tokens.colors.cream,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleH1: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h1.fontSize,
    lineHeight: tokens.typography.styles.h1.lineHeight,
    color: tokens.colors.ink,
    textAlign: 'center',
    flexShrink: 0,
  },
  primaryActionSection: {
    marginBottom: 20,
  },
  primaryActionButton: {
    marginBottom: 10,
  },
  secondaryActionButton: {
    marginBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 13,
    letterSpacing: 1.5,
    color: tokens.colors.ink,
  },
  scanningBadge: {
    backgroundColor: tokens.colors.yellowSoft,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  scanningBadgeText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 10,
    letterSpacing: 1,
    color: tokens.colors.ink,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  roomListContainer: {
    marginBottom: 16,
  },
  roomCard: {
    marginBottom: 12,
  },
  roomContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomDetailsCol: {
    flex: 1,
    marginHorizontal: 12,
  },
  roomCodeText: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: tokens.colors.ink,
  },
  roomPlayerText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    color: tokens.colors.ink,
    marginTop: 2,
  },
  roomStatusPillRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusPill: {
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  statusPillText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 9,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
  },
  roomActionCol: {
    width: 100,
  },
  joinRoomButton: {
    width: 100,
  },
  searchAgainRow: {
    marginTop: 4,
    marginBottom: 8,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  searchingHintText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 13,
    color: tokens.colors.ink,
    marginTop: 8,
    textAlign: 'center',
  },
  foundNothingHint: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 14,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  codeSlotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  codeSlot: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.paper,
  },
  codeSlotText: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: 36,
    lineHeight: 40,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  deadEndBodyText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.colors.ink,
    marginBottom: 12,
  },
  deadEndButtonsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  deadEndButton: {
    marginBottom: 4,
  },
  troubleLinkWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  troubleLink: {
    borderBottomWidth: 2,
    borderBottomColor: tokens.colors.ink,
    paddingBottom: 2,
  },
  troubleLinkText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 14,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
  },
  sheetHelpText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: tokens.colors.ink,
    marginBottom: 12,
  },
  noticeBox: {
    backgroundColor: tokens.colors.yellowSoft,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    padding: 10,
    marginBottom: 16,
  },
  noticeText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 12,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  errorWrapper: {
    marginBottom: 16,
  },
  errorText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 14,
    color: tokens.colors.paper,
    marginBottom: 4,
  },
  errorDismiss: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: tokens.colors.cream,
  },
  debugCard: {
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    borderRadius: tokens.shape.radius,
    padding: 14,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.grey,
  },
  debugLabel: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 13,
    color: tokens.colors.ink,
  },
  debugVal: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  debugErrorsSection: {
    marginTop: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.grey,
  },
  debugSectionTitle: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 12,
    letterSpacing: 1,
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  debugErrorItem: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  debugErrorHost: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '700',
    color: tokens.colors.red,
    marginRight: 6,
  },
  debugErrorMsg: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: tokens.colors.ink,
    flex: 1,
  },
  debugErrorEmpty: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 12,
    color: tokens.colors.grey,
    fontStyle: 'italic',
  },
  debugNoticeBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: tokens.colors.cream,
    borderWidth: 1,
    borderColor: tokens.colors.grey,
    borderRadius: tokens.shape.radius,
  },
  debugNoticeText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: tokens.colors.ink,
  },
});
