import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { tokens } from '@imposter/shared';
import {
  BrutalBox,
  BrutalButton,
  BrutalCard,
  BrutalInput,
  Chip,
  SegmentedTabs,
  Sheet,
  AvatarTile,
  RoundMeter,
  StatusDot,
  Banner,
  Toast,
  Stripe,
  DotGrid,
  CheckerStrip,
  AccentSquare,
  Mascot,
} from '../src/ui';

export default function DesignGalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Interactive component state for live testing
  const [selectedTab, setSelectedTab] = useState<'safari' | 'native'>('safari');
  const [chipSelected, setChipSelected] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState<'riya' | 'alex' | 'sam'>('riya');
  const [inputText, setInputText] = useState('Secret Word');
  const [showSheet, setShowSheet] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const topInset = Math.max(insets.top, 16);
  const bottomInset = Math.max(insets.bottom, 24) + 40;

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset, paddingBottom: bottomInset },
        ]}
        showsVerticalScrollIndicator={true}
      >
        {/* Top Header Bar */}
        <View style={styles.topNav}>
          <BrutalButton
            variant="neutral"
            icon="arrow-left"
            square={true}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            accessibilityLabel="Back"
          />
          <AccentSquare size={28} />
        </View>

        {/* Page Title with Wordmark & Tagline */}
        <View style={styles.headerSection}>
          <Text style={styles.wordmark}>IMPOSTER</Text>
          <Text style={styles.h1}>DESIGN GALLERY</Text>
          <Text style={styles.bodyMuted}>
            Neo-Brutalist UI Primitives (docs/DESIGN.md)
          </Text>
          <View style={styles.headerDetails}>
            <View style={styles.dotGridWrap}>
              <DotGrid rows={4} cols={8} />
            </View>
            <CheckerStrip height={14} squareSize={7} />
          </View>
        </View>

        {/* SECTION 1: BUTTONS & PRESS ANIMATION */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. BUTTONS & PRESS MOTION</Text>
          <Text style={styles.sectionDesc}>
            Min 56 height, hard offset shadow View (no elevation/shadow* props), translates (4,4) on press (80ms).
          </Text>

          <View style={styles.componentStack}>
            {/* Primary Action Button */}
            <BrutalButton
              title="PRIMARY BUTTON (ORANGE)"
              variant="primary"
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Secondary Action Button */}
            <BrutalButton
              title="SECONDARY BUTTON (YELLOW)"
              variant="secondary"
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Neutral Button */}
            <BrutalButton
              title="NEUTRAL BUTTON (PAPER)"
              variant="neutral"
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Danger Button */}
            <BrutalButton
              title="DANGER ACTION (RED)"
              variant="danger"
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Home Tile Buttons with Icon Squares */}
            <BrutalButton
              title="HOST ROOM"
              variant="tile"
              tileColor="orange"
              icon="rocket"
              onPress={() => setClickCount((c) => c + 1)}
            />

            <BrutalButton
              title="JOIN ROOM"
              variant="tile"
              tileColor="yellow"
              icon="hiking"
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Right-Side Arrow Block Variant */}
            <BrutalButton
              title="SIGN IN WITH CODE"
              variant="primary"
              hasArrow={true}
              onPress={() => setClickCount((c) => c + 1)}
            />

            {/* Disabled State (Dashed Grey, Reason Label) */}
            <BrutalButton
              title="START GAME"
              variant="primary"
              disabled={true}
              disabledText="NEED 1 MORE PLAYER"
            />

            <View style={styles.counterBox}>
              <Text style={styles.label}>
                {`CLICKS REGISTERED: ${clickCount}`}
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 2: BOXES & CARDS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. BRUTAL BOXES & CARDS</Text>
          <Text style={styles.sectionDesc}>
            Paper fill, 3 stroke ink, 0 radius, hard offset shadows (4 for box, 6 for cards).
          </Text>

          <View style={styles.componentStack}>
            {/* Pressable BrutalBox */}
            <BrutalBox
              hasShadow={true}
              pressable={true}
              onPress={() => setClickCount((c) => c + 1)}
              contentStyle={styles.boxPadding}
            >
              <Text style={styles.boxTitle}>INTERACTIVE BRUTAL BOX</Text>
              <Text style={styles.bodyText}>
                Tap me to trigger the signature (4,4) mechanical shadow collapse.
              </Text>
            </BrutalBox>

            {/* Standard BrutalCard */}
            <BrutalCard
              title="LOBBY SETTINGS"
              subtitle="Default paper card with 6px shadow"
              color="paper"
            >
              <Text style={styles.bodyText}>
                Cards can contain headers, subtitles, and child controls with pure 0 radius.
              </Text>
            </BrutalCard>

            {/* Yellow Hero Card */}
            <BrutalCard
              title="SECRET WORD CARD"
              subtitle="YellowSoft hero fill for revealed cards"
              color="yellowSoft"
            >
              <Text style={styles.secretWordText}>ROLLER COASTER</Text>
              <Text style={styles.bodyMuted}>Double-tap to peek anytime</Text>
            </BrutalCard>

            {/* Red Outcome Card */}
            <BrutalCard
              title="IMPOSTER BUSTED!"
              subtitle="Eliminated / Reveal card state"
              color="red"
            >
              <Text style={styles.redCardText}>CIVILIANS WON +1 POINT</Text>
            </BrutalCard>
          </View>
        </View>

        {/* SECTION 3: INPUTS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. BRUTAL INPUTS</Text>
          <Text style={styles.sectionDesc}>
            Uppercase label above, 3 stroke ink, 4pt solid yellow focus bar underneath.
          </Text>

          <View style={styles.componentStack}>
            <BrutalInput
              label="PLAYER NAME"
              value={inputText}
              onChangeText={setInputText}
              placeholder="Enter your name"
            />

            <BrutalInput
              label="HOST IP ADDRESS"
              placeholder="192.168.0.109"
              autoCapitalize="none"
              rightElement={
                <FontAwesome5 name="wifi" size={16} color={tokens.colors.ink} solid />
              }
            />

            <BrutalInput
              label="ROOM CODE"
              value="XYZ"
              error="ROOM NOT FOUND"
            />
          </View>
        </View>

        {/* SECTION 4: CHIPS & TABS */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>4. CHIPS & SEGMENTED TABS</Text>
          <Text style={styles.sectionDesc}>
            Chips: unselected paper vs selected orange with hard shadow. Tabs: joined boxes.
          </Text>

          {/* Chips */}
          <View style={styles.chipsRow}>
            <Chip
              label="5 ROUNDS"
              selected={chipSelected}
              onPress={() => setChipSelected(!chipSelected)}
            />
            <Chip
              label="8 ROUNDS"
              selected={!chipSelected}
              onPress={() => setChipSelected(!chipSelected)}
            />
            <Chip
              label="DISABLED"
              disabled={true}
            />
          </View>

          {/* SegmentedTabs */}
          <View style={{ marginTop: 16 }}>
            <SegmentedTabs
              options={[
                { key: 'safari', label: 'iPhone Safari' },
                { key: 'native', label: 'Native App' },
              ]}
              selectedKey={selectedTab}
              onSelect={(key) => setSelectedTab(key as any)}
            />
          </View>
        </View>

        {/* SECTION 5: AVATAR TILES */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>5. AVATAR TILES</Text>
          <Text style={styles.sectionDesc}>
            Square paper tile, yellow on selected with tag & shadow, diagonal hatch for self.
          </Text>

          <View style={styles.avatarGrid}>
            <AvatarTile
              name="Riya"
              avatar="🦊"
              selected={selectedAvatar === 'riya'}
              tag={selectedAvatar === 'riya' ? 'VOTE' : undefined}
              onPress={() => setSelectedAvatar('riya')}
            />

            <AvatarTile
              name="Alex"
              avatar="🦁"
              tag="HOST"
              selected={selectedAvatar === 'alex'}
              onPress={() => setSelectedAvatar('alex')}
            />

            <AvatarTile
              name="You"
              avatar="🐻"
              isSelf={true}
              onPress={() => setSelectedAvatar('sam')}
            />

            {/* Mini avatar tile */}
            <View style={styles.miniAvatarCol}>
              <AvatarTile
                name="Dan"
                avatar="🚀"
                size="mini"
                tag="HOST"
              />
              <Text style={styles.miniLabel}>MINI</Text>
            </View>
          </View>
        </View>

        {/* SECTION 6: ROUND METER */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>6. ROUND METER</Text>
          <Text style={styles.sectionDesc}>
            Square segments: filled ink, current orange, future paper. No percentages.
          </Text>

          <View style={styles.componentStack}>
            <RoundMeter currentRound={1} totalRounds={5} />
            <RoundMeter currentRound={3} totalRounds={5} />
            <RoundMeter currentRound={5} totalRounds={5} />
          </View>
        </View>

        {/* SECTION 7: STATUS DOTS & PILL */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>7. STATUS DOTS (SQUARE 10x10)</Text>
          <Text style={styles.sectionDesc}>
            10x10 square: green present, yellow diagonal stripe reconnecting, red offline.
          </Text>

          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <StatusDot status="present" />
              <Text style={styles.label}>PRESENT</Text>
            </View>

            <View style={styles.statusItem}>
              <StatusDot status="reconnecting" />
              <Text style={styles.label}>RECONNECT</Text>
            </View>

            <View style={styles.statusItem}>
              <StatusDot status="offline" />
              <Text style={styles.label}>OFFLINE</Text>
            </View>

            <StatusDot
              status="present"
              label="CONNECTED"
              showPill={true}
              rttMs={24}
            />
          </View>
        </View>

        {/* SECTION 8: BANNERS & RECONNECTING TOAST */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>8. BANNERS & TOASTS</Text>
          <Text style={styles.sectionDesc}>
            Yellow marker strip, slight angle 0. Reconnecting toast with hazard stripe.
          </Text>

          <View style={styles.componentStack}>
            <Banner text="ONE-WORD ROUND" color="yellow" />
            <Banner text="SECRET WORD ASSIGNED" color="orange" />

            {/* Static Toast preview */}
            <View style={styles.toastPreviewWrap}>
              <Toast message="RECONNECTING..." visible={true} style={styles.inlineToast} />
            </View>
          </View>
        </View>

        {/* SECTION 9: DECORATIVE PATTERNS & MASCOT */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>9. DECOR PATTERNS & MASCOT</Text>
          <Text style={styles.sectionDesc}>
            Static SVG patterns, pointerEvents="none", original neo-brutalist card mascot.
          </Text>

          <View style={styles.componentStack}>
            {/* Mascot Placeholder */}
            <View style={styles.mascotCard}>
              <Mascot size={140} />
              <Text style={styles.label}>ORIGINAL CARD MASCOT (SECTION 6.1)</Text>
            </View>

            {/* Hazard Stripe */}
            <View style={styles.patternBox}>
              <Text style={styles.label}>HAZARD STRIPE (20PT)</Text>
              <Stripe height={20} />
            </View>

            {/* Checker Strip */}
            <View style={styles.patternBox}>
              <Text style={styles.label}>CHECKER STRIP (16PT)</Text>
              <CheckerStrip height={16} />
            </View>

            {/* Dot Grid */}
            <View style={styles.patternBox}>
              <Text style={styles.label}>DOT GRID (6x6 HALFTONE)</Text>
              <DotGrid rows={6} cols={12} />
            </View>
          </View>
        </View>

        {/* SECTION 10: BOTTOM SHEET MODAL */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>10. BOTTOM SHEET MODAL</Text>
          <Text style={styles.sectionDesc}>
            Cream fill, 4pt grab bar, 50% ink scrim, Abril Fatface title.
          </Text>

          <BrutalButton
            title="OPEN TEST SHEET"
            variant="secondary"
            onPress={() => setShowSheet(true)}
          />

          <Sheet
            visible={showSheet}
            onClose={() => setShowSheet(false)}
            title="SETTINGS SHEET"
            subtitle="Bottom sheet primitive preview"
          >
            <Text style={styles.bodyText}>
              This sheet uses the neo-brutalist cream canvas, 4pt centered ink grab bar, 3pt top/side borders, and full scroll support.
            </Text>

            <View style={{ marginVertical: 16 }}>
              <BrutalInput label="ROOM NAME" value="Friday Party" />
            </View>

            <BrutalButton
              title="APPLY CHANGES"
              variant="primary"
              onPress={() => setShowSheet(false)}
            />
          </Sheet>
        </View>

        {/* SECTION 11: TYPOGRAPHY HIERARCHY */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>11. TYPOGRAPHY SPEC</Text>
          <Text style={styles.sectionDesc}>
            Display serif (Abril Fatface) for titles/wordmark/room code, Archivo for body/buttons/labels.
          </Text>

          <View style={styles.typeStack}>
            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>wordmark (56/58)</Text>
              <Text style={styles.typeWordmark}>IMPOSTER</Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>h1 (36/40)</Text>
              <Text style={styles.typeH1}>WHO'S THE IMPOSTER?</Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>h2 (28/32)</Text>
              <Text style={styles.typeH2}>Round 1 Results</Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>codeBig (72/72)</Text>
              <Text style={styles.typeCodeBig}>QNMG</Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>title (20/24)</Text>
              <Text style={styles.typeTitle}>START GAME NOW</Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>body (16/22)</Text>
              <Text style={styles.typeBody}>
                Clues must be one word spoken out loud around the circle.
              </Text>
            </View>

            <View style={styles.typeRow}>
              <Text style={styles.typeMeta}>label (12/16)</Text>
              <Text style={styles.typeLabel}>ROOM CODE — 4 PLAYERS JOINED</Text>
            </View>
          </View>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            IMPOSTER v1.0.0 • NEO-BRUTALIST DESIGN SYSTEM (PART 1 OF 3)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.cream,
  },
  scrollContent: {
    padding: tokens.shape.space.screen,
    paddingBottom: 60,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 120,
  },
  headerSection: {
    marginBottom: 28,
  },
  wordmark: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.wordmark.fontSize,
    lineHeight: tokens.typography.styles.wordmark.lineHeight,
    letterSpacing: tokens.typography.styles.wordmark.letterSpacing,
    color: tokens.colors.ink,
  },
  h1: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h1.fontSize,
    lineHeight: tokens.typography.styles.h1.lineHeight,
    color: tokens.colors.ink,
    marginTop: 4,
  },
  bodyMuted: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: tokens.typography.styles.body.fontSize,
    color: tokens.colors.ink,
    marginTop: 4,
  },
  headerDetails: {
    marginTop: 14,
    gap: 10,
  },
  dotGridWrap: {
    alignSelf: 'flex-start',
  },
  section: {
    marginBottom: 36,
    paddingBottom: 24,
    borderBottomWidth: tokens.shape.strokeThin,
    borderBottomColor: tokens.colors.ink,
  },
  sectionHeader: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 16,
    letterSpacing: 1,
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  sectionDesc: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 13,
    color: tokens.colors.ink,
    marginBottom: 16,
  },
  componentStack: {
    gap: 16,
  },
  counterBox: {
    backgroundColor: tokens.colors.yellowSoft,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    padding: 10,
    alignItems: 'center',
  },
  boxPadding: {
    padding: 16,
  },
  boxTitle: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 18,
    color: tokens.colors.ink,
    marginBottom: 6,
  },
  bodyText: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: 15,
    lineHeight: 20,
    color: tokens.colors.ink,
  },
  secretWordText: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: 36,
    color: tokens.colors.ink,
    textAlign: 'center',
    marginVertical: 12,
  },
  redCardText: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: 18,
    color: tokens.colors.paper,
    textAlign: 'center',
    marginVertical: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  avatarGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  miniAvatarCol: {
    alignItems: 'center',
    gap: 4,
  },
  miniLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 9,
    color: tokens.colors.ink,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    flexWrap: 'wrap',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastPreviewWrap: {
    height: 70,
    position: 'relative',
    marginTop: 8,
  },
  inlineToast: {
    position: 'relative',
    top: 0,
    left: 0,
    right: 0,
  },
  mascotCard: {
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  patternBox: {
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.strokeThin,
    borderColor: tokens.colors.ink,
    padding: 12,
    gap: 8,
  },
  typeStack: {
    backgroundColor: tokens.colors.paper,
    borderWidth: tokens.shape.stroke,
    borderColor: tokens.colors.ink,
    padding: 16,
    gap: 16,
  },
  typeRow: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.cream,
    paddingBottom: 10,
  },
  typeMeta: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  typeWordmark: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.wordmark.fontSize,
    lineHeight: tokens.typography.styles.wordmark.lineHeight,
    color: tokens.colors.ink,
  },
  typeH1: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h1.fontSize,
    lineHeight: tokens.typography.styles.h1.lineHeight,
    color: tokens.colors.ink,
  },
  typeH2: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.h2.fontSize,
    lineHeight: tokens.typography.styles.h2.lineHeight,
    color: tokens.colors.ink,
  },
  typeCodeBig: {
    fontFamily: tokens.typography.fonts.display,
    fontSize: tokens.typography.styles.codeBig.fontSize,
    lineHeight: tokens.typography.styles.codeBig.lineHeight,
    letterSpacing: tokens.typography.styles.codeBig.letterSpacing,
    color: tokens.colors.ink,
  },
  typeTitle: {
    fontFamily: tokens.typography.fonts.bodyBlack,
    fontSize: tokens.typography.styles.title.fontSize,
    color: tokens.colors.ink,
  },
  typeBody: {
    fontFamily: tokens.typography.fonts.body,
    fontSize: tokens.typography.styles.body.fontSize,
    color: tokens.colors.ink,
  },
  typeLabel: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: tokens.typography.styles.label.fontSize,
    letterSpacing: tokens.typography.styles.label.letterSpacing,
    color: tokens.colors.ink,
  },
  label: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 12,
    color: tokens.colors.ink,
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontFamily: tokens.typography.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1,
    color: tokens.colors.ink,
    textAlign: 'center',
  },
});
