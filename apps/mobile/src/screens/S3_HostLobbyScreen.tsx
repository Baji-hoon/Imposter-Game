import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Network from 'expo-network';
import { tokens, StateSyncPlayer } from '@imposter/shared';
import { useGameStore } from '../store/gameStore';
import {
  BrutalButton,
  BrutalCard,
  BrutalBox,
  SegmentedTabs,
  AvatarTile,
  StatusDot,
  Chip,
  Sheet,
} from '../ui';

interface S3HostLobbyScreenProps {
  onOpenSettings: () => void;
  onLeave: () => void;
}

export const S3_HostLobbyScreen: React.FC<S3HostLobbyScreenProps> = ({
  onOpenSettings,
  onLeave,
}) => {
  const insets = useSafeAreaInsets();
  const stateSync = useGameStore((s) => s.stateSync);
  const hostIp = useGameStore((s) => s.hostIp);
  const lastConnectTarget = useGameStore((s) => s.lastConnectTarget);
  const roomCode = useGameStore((s) => s.roomCode) || stateSync?.room || '????';
  const playerId = useGameStore((s) => s.playerId);
  const startGame = useGameStore((s) => s.startGame);
  const kick = useGameStore((s) => s.kick);
  const transferHost = useGameStore((s) => s.transferHost);
  const lastError = useGameStore((s) => s.lastError);
  const clearError = useGameStore((s) => s.clearError);
  const setHostIp = useGameStore((s) => s.setHostIp);

  const players: StateSyncPlayer[] = stateSync?.players || [];
  const isHost = stateSync?.hostId === playerId;
  const awayPlayers = players.filter((p) => !p.present);
  const hasMinPlayers = players.length >= 3;
  const allPresent = awayPlayers.length === 0;
  const canStart = hasMinPlayers && allPresent;
  const displayIp = hostIp || lastConnectTarget?.host || '127.0.0.1';

  const [selectedPlayer, setSelectedPlayer] = useState<StateSyncPlayer | null>(null);
  const [qrTab, setQrTab] = useState<'safari' | 'native'>('safari');
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  const nativeQrValue = `imposter://${displayIp}:47777/${roomCode}`;
  const webSpikeUrl = `http://${displayIp}:47777/?room=${roomCode}`;

  const topInset = Math.max(insets.top, 16);
  const bottomBarPadding = Math.max(insets.bottom, 16) + 12;
  const scrollBottomPadding = 120 + bottomBarPadding;

  const handleRedetectIp = async () => {
    try {
      const ip = await Network.getIpAddressAsync();
      if (ip && ip.includes('.') && ip !== '127.0.0.1') {
        setHostIp(ip);
        Alert.alert('IP Updated', `Detected Host IP: ${ip}`);
      } else {
        Alert.alert('Network Detection', `Detected IP: ${ip || 'unknown'}. If hosting via Hotspot, switch to 192.168.43.1.`);
      }
    } catch {
      Alert.alert('Network Detection', 'Could not detect IP address.');
    }
  };

  const handleKickConfirm = () => {
    if (selectedPlayer) {
      kick(selectedPlayer.id);
      setSelectedPlayer(null);
    }
  };

  const handleTransferHostConfirm = () => {
    if (selectedPlayer) {
      transferHost(selectedPlayer.id);
      setSelectedPlayer(null);
    }
  };

  // Disabled text exact reason calculation
  const getDisabledReason = () => {
    if (!hasMinPlayers) {
      const needed = 3 - players.length;
      return `NEED ${needed} MORE PLAYER${needed > 1 ? 'S' : ''}`;
    }
    if (!allPresent && awayPlayers.length > 0) {
      return `WAITING FOR ${awayPlayers[0].name.toUpperCase()} TO RECONNECT`;
    }
    return 'CANNOT START';
  };

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: topInset, paddingBottom: scrollBottomPadding },
        ]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar: Exit (Neutral) Left, Settings (Secondary) Right as square icon buttons */}
        <View style={styles.topBar}>
          <BrutalButton
            variant="neutral"
            icon="times"
            square={true}
            onPress={() => {
              Alert.alert('Leave Lobby', 'Are you sure you want to end or leave this lobby?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: onLeave },
              ]);
            }}
            accessibilityLabel="Leave Lobby"
          />

          {isHost && (
            <BrutalButton
              variant="secondary"
              icon="cog"
              square={true}
              onPress={onOpenSettings}
              accessibilityLabel="Game Settings"
            />
          )}
        </View>

        {/* Room Code Card with Yellow Marker Strip */}
        <View style={styles.codeSection}>
          <Text style={styles.label}>ROOM CODE</Text>
          <View style={styles.codeMarkerStrip}>
            <Text style={styles.codeBigText}>{roomCode}</Text>
          </View>

          {/* Host IP Chip & Hotspot Controls */}
          <View style={styles.ipBadgeRow}>
            <Chip
              label={`HOST IP: ${displayIp}`}
              selected={false}
              onPress={handleRedetectIp}
            />

            {isHost && (
              <Chip
                label={hostIp === '192.168.43.1' ? 'HOTSPOT ACTIVE' : 'HOTSPOT? 192.168.43.1'}
                selected={hostIp === '192.168.43.1'}
                onPress={() => {
                  if (hostIp === '192.168.43.1') {
                    handleRedetectIp();
                  } else {
                    setHostIp('192.168.43.1');
                  }
                }}
              />
            )}
          </View>
        </View>

        {/* SegmentedTabs: iPhone Safari | Native App */}
        <View style={styles.qrSection}>
          <SegmentedTabs
            options={[
              { key: 'safari', label: 'iPhone Safari' },
              { key: 'native', label: 'Native App' },
            ]}
            selectedKey={qrTab}
            onSelect={(k) => setQrTab(k as any)}
            style={styles.tabBar}
          />

          {/* QR Code in paper BrutalCard with 6 shadow */}
          <BrutalCard
            color="paper"
            shadowOffset={tokens.shape.shadowLarge}
            contentStyle={styles.qrCardContent}
          >
            <View style={styles.qrCodeBox}>
              <QRCode
                value={qrTab === 'safari' ? webSpikeUrl : nativeQrValue}
                size={160}
                backgroundColor="transparent"
                color={tokens.colors.ink}
              />
            </View>

            <Text style={styles.qrCaptionText}>
              {qrTab === 'safari'
                ? 'SCAN WITH IPHONE CAMERA TO PLAY IN SAFARI'
                : 'SCAN WITH ANOTHER PHONE RUNNING IMPOSTER APP'}
            </Text>

            {qrTab === 'safari' && (
              <View style={styles.manualLinkBox}>
                <Text style={styles.manualLinkLabel}>LINK (HOLD TO COPY):</Text>
                <Text selectable={true} numberOfLines={1} style={styles.manualLinkText}>
                  {webSpikeUrl}
                </Text>
              </View>
            )}
          </BrutalCard>
        </View>

        {/* Error Banner */}
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

        {/* Players List Section */}
        <View style={styles.playersSection}>
          <Text style={styles.sectionHeaderLabel}>
            {`PLAYERS (${players.length}/10)`}
          </Text>

          <View style={styles.playerRowsStack}>
            {players.map((p) => {
              const isThisHost = p.id === stateSync?.hostId;
              const isMe = p.id === playerId;

              return (
                <BrutalBox
                  key={p.id}
                  hasShadow={false}
                  borderColor={tokens.colors.ink}
                  contentStyle={styles.playerRow}
                >
                  <View style={styles.playerRowLeft}>
                    <AvatarTile
                      avatar={p.avatar}
                      name=""
                      size="mini"
                      isSelf={isMe}
                    />

                    <View style={styles.nameContainer}>
                      <Text style={styles.playerNameText} numberOfLines={1}>
                        {p.name.toUpperCase()}
                      </Text>
                      {isMe && <Text style={styles.youIndicator}> (YOU)</Text>}
                    </View>

                    {isThisHost && (
                      <View style={styles.hostTagBadge}>
                        <Text style={styles.hostTagText}>HOST</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.playerRowRight}>
                    <StatusDot
                      status={p.present ? 'present' : 'reconnecting'}
                      label={p.present ? undefined : 'AWAY'}
                    />

                    {isHost && !isMe && (
                      <Pressable
                        onPress={() => setSelectedPlayer(p)}
                        style={styles.manageButton}
                        accessibilityLabel={`Manage ${p.name}`}
                      >
                        <Text style={styles.manageButtonText}>MANAGE</Text>
                      </Pressable>
                    )}
                  </View>
                </BrutalBox>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar for Start Action */}
      <View style={[styles.stickyBottomBar, { paddingBottom: bottomBarPadding }]}>
        {/* Full-width hint line above the button, never truncated */}
        {!canStart && isHost && (
          <View style={styles.hintLineContainer}>
            <Text style={styles.hintLineText}>
              {!hasMinPlayers
                ? `MINIMUM 3 PLAYERS REQUIRED TO START (CURRENT: ${players.length}/10)`
                : `WAITING FOR ${awayPlayers.map((p) => p.name.toUpperCase()).join(', ')} TO RECONNECT`}
            </Text>
          </View>
        )}

        {isHost ? (
          <BrutalButton
            title="START GAME"
            variant="primary"
            disabled={!canStart}
            disabledText={getDisabledReason()}
            onPress={startGame}
          />
        ) : (
          <BrutalBox contentStyle={styles.waitingGuestBox}>
            <Text style={styles.waitingGuestText}>
              WAITING FOR HOST TO START THE GAME…
            </Text>
          </BrutalBox>
        )}
      </View>

      {/* Player Management Sheet */}
      {selectedPlayer && (
        <Sheet
          visible={!!selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          title="MANAGE PLAYER"
          subtitle={`${selectedPlayer.name} (${selectedPlayer.avatar})`}
        >
          <View style={styles.managementActions}>
            <BrutalButton
              title={`KICK ${selectedPlayer.name.toUpperCase()}`}
              variant="danger"
              onPress={handleKickConfirm}
            />

            <BrutalButton
              title={`TRANSFER HOST TO ${selectedPlayer.name.toUpperCase()}`}
              variant="secondary"
              onPress={handleTransferHostConfirm}
            />

            <BrutalButton
              title="CANCEL"
              variant="neutral"
              onPress={() => setSelectedPlayer(null)}
            />
          </View>
        </Sheet>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: tokens.colors.cream,
  },
  scrollContainer: {
    paddingHorizontal: tokens.shape.space.screen,
    paddingTop: 36,
    paddingBottom: 120, // Room for sticky bottom bar
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  label: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    lineHeight: tokens.typography.styles.label.lineHeight,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
    marginBottom: 6,
  },
  codeMarkerStrip: {
    backgroundColor: tokens.colors.yellow,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBigText: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: 54,
    lineHeight: 58,
    letterSpacing: tokens.typography.styles.codeBig.letterSpacing,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  ipBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  qrSection: {
    marginVertical: 16,
  },
  tabBar: {
    marginBottom: 12,
  },
  qrCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  qrCodeBox: {
    padding: 8,
    backgroundColor: tokens.colors.paper,
  },
  qrCaptionText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
    textAlign: 'center',
    marginTop: 12,
  },
  manualLinkBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: tokens.colors.cream,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    width: '100%',
    alignItems: 'center',
  },
  manualLinkLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
  },
  manualLinkText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 12,
    color: tokens.colors.ink,
    marginTop: 2,
  },
  playersSection: {
    marginTop: 8,
  },
  sectionHeaderLabel: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: 1,
    color: tokens.colors.ink,
    marginBottom: 10,
  },
  playerRowsStack: {
    gap: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: tokens.colors.paper,
  },
  playerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerNameText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 14,
    color: tokens.colors.ink,
  },
  youIndicator: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    color: tokens.colors.ink,
  },
  hostTagBadge: {
    backgroundColor: tokens.colors.orange,
    borderWidth: 1.5,
    borderColor: tokens.colors.ink,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  hostTagText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 9,
    color: tokens.colors.cream,
    letterSpacing: 0.5,
  },
  playerRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manageButton: {
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    backgroundColor: tokens.colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  manageButtonText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 10,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: tokens.colors.cream,
    borderTopWidth: tokens.shape.stroke,
    borderTopColor: tokens.colors.ink,
    paddingHorizontal: tokens.shape.space.screen,
    paddingTop: 10,
    paddingBottom: 24,
  },
  hintLineContainer: {
    marginBottom: 8,
    width: '100%',
  },
  hintLineText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  waitingGuestBox: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: tokens.colors.paper,
  },
  waitingGuestText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 13,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
  },
  errorWrapper: {
    marginVertical: 12,
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
  managementActions: {
    gap: 12,
    paddingVertical: 8,
  },
});
