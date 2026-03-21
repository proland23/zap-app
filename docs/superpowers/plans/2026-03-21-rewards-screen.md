# Rewards Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Rewards screen with an animated count-up balance, rich reward cards with per-item animated progress bars, and a polished transaction history — all connected to live Supabase data.

**Architecture:** Create a new `RewardCard` component that handles per-card progress bar animation and in-flight redeem state, then fully rewrite `rewards.tsx` to use a Reanimated 4 animated TextInput for the count-up balance. Data flows from Supabase `user_profiles` (balance) and `points_transactions` (history) with full error/loading/empty states.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, react-native-reanimated v4.1, expo-haptics, Supabase JS client, TypeScript strict

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/RewardCard.tsx` | **Create** | Animated progress bar card with icon, status text, and redeem button |
| `app/(drawer)/rewards.tsx` | **Rewrite** | Screen with animated balance hero, catalog, transaction history |
| `components/RewardItem.tsx` | **Delete** | Replaced by RewardCard — no longer used |

---

## Chunk 1: RewardCard Component

### Task 1: Create `components/RewardCard.tsx`

**Files:**
- Create: `components/RewardCard.tsx`

This component is self-contained. It receives `balance` and `cost` as props and handles all progress bar animation internally. The parent does not need to know about animation state.

**Notes for the implementer:**
- `iconLabel` is a short uppercase text string: `"EV"`, `"EAT"`, or `"BED"`. No emoji — CLAUDE.md prohibits emoji in UI.
- Some styles use inline dynamic values (e.g. `{ borderColor: accentColor + '40' }`). This is the accepted exception to the no-inline-styles rule — prop-driven values that vary per instance cannot go in `StyleSheet.create`. Everything static must be in `StyleSheet.create`.
- `cancelAnimation` before setting `progress.value` is required — it aborts any pending `withDelay` timer so the new animation starts immediately rather than stacking.
- `balance` and `cost` are integer point values (e.g. `500`, `1240`). Never pass fractional values — the progress bar and status text assume integers.
- `onLayout` fires before the 200ms `withDelay` elapses on all real devices, so `trackWidth` is set before `progress.value` animates. Do not reduce the delay to 0 without testing on a low-end device first.

- [ ] **Step 1: Create the file with complete implementation**

```tsx
// components/RewardCard.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  COLOR_CARD,
  COLOR_NAVY,
  COLOR_TEXT_SECONDARY,
  COLOR_TEXT_MUTED,
} from '../lib/constants';

interface RewardCardProps {
  label: string;
  cost: number;
  accentColor: string;
  iconLabel: string;
  balance: number;
  redeeming: boolean;
  onRedeem: () => void;
}

export default function RewardCard({
  label,
  cost,
  accentColor,
  iconLabel,
  balance,
  redeeming,
  onRedeem,
}: RewardCardProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useSharedValue(0);
  const canRedeem = balance >= cost;

  useEffect(() => {
    const target = Math.min(balance / cost, 1);
    // cancelAnimation aborts any in-progress animation (including the 200ms delay)
    // so the new target takes effect immediately rather than stacking animations.
    // progress is a stable shared value ref — safe to omit from deps.
    cancelAnimation(progress);
    progress.value = withDelay(200, withSpring(target, { damping: 20, stiffness: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, cost]);

  const fillStyle = useAnimatedStyle(() => ({
    width: progress.value * trackWidth,
  }));

  // No emoji per CLAUDE.md — plain text labels only
  const statusText = canRedeem
    ? 'REDEEMABLE'
    : `${(cost - balance).toLocaleString()} PTS TO GO`;

  return (
    <View style={[styles.card, { borderColor: accentColor + '40' }]}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: accentColor + '1A' }]}>
        <Text style={[styles.iconLabel, { color: accentColor }]}>{iconLabel}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.rewardLabel}>{label}</Text>
        <View
          style={styles.track}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View
            style={[styles.fill, { backgroundColor: accentColor }, fillStyle]}
          />
        </View>
        <Text style={[styles.status, { color: canRedeem ? accentColor : COLOR_TEXT_MUTED }]}>
          {statusText}
        </Text>
      </View>

      {/* Redeem button */}
      <Pressable
        style={[styles.button, { backgroundColor: accentColor }, !canRedeem && styles.buttonDisabled]}
        disabled={!canRedeem || redeeming}
        accessibilityLabel={canRedeem ? `Redeem ${label}` : `${label} — insufficient points`}
        accessibilityState={{ disabled: !canRedeem || redeeming }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRedeem();
        }}
      >
        {redeeming ? (
          <ActivityIndicator size="small" color={COLOR_NAVY} />
        ) : (
          <Text style={styles.buttonText}>REDEEM</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLOR_CARD,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
  },
  iconLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    paddingVertical: 16,
  },
  rewardLabel: {
    color: COLOR_TEXT_SECONDARY, // CLAUDE.md: use #C8D8EC for body text, not pure white
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: 6,       // explicit height — do NOT add bottom:0 (conflicts with height)
    borderRadius: 3,
  },
  status: {
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 6,
  },
  button: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 10,
    margin: 16,
    marginLeft: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  buttonDisabled: {
    opacity: 0.35,
  },
  buttonText: {
    color: COLOR_NAVY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors about missing types, check that `react-native-reanimated` types are installed (they come with the package).

- [ ] **Step 3: Commit**

```bash
git add components/RewardCard.tsx
git commit -m "feat: add RewardCard component with animated progress bar"
```

---

## Chunk 2: Rewards Screen Rewrite + Cleanup

### Task 2: Rewrite `app/(drawer)/rewards.tsx`

**Files:**
- Modify: `app/(drawer)/rewards.tsx` (full replacement)

Key implementation notes:
- The animated balance uses `createAnimatedComponent(TextInput)` — this is the only Reanimated-supported way to animate text content on the UI thread in RN. `Animated.Text` from Reanimated does NOT support `animatedProps`.
- The `value` animatedProp drives the TextInput's displayed text. We use a worklet-safe number formatter (no `toLocaleString` inside worklets — Hermes worklet runtime may not support it).
- `balanceSV` starts at 0 and is driven to `balance` on first data load and after each redemption.

- [ ] **Step 1: Replace the entire file with this implementation**

```tsx
// app/(drawer)/rewards.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Alert, StyleSheet, StatusBar, ScrollView,
  TextInput, Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  cancelAnimation,
  Easing,
  createAnimatedComponent,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session-context';
import { supabase } from '../../lib/supabase';
import RewardCard from '../../components/RewardCard';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN, COLOR_PURPLE, COLOR_RED,
  COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_BEBAS,
} from '../../lib/constants';

const AnimatedTextInput = createAnimatedComponent(TextInput);

// Worklet-safe comma formatter (toLocaleString not reliable in Hermes worklets)
function formatPoints(n: number): string {
  'worklet';
  const s = Math.round(n).toString();
  let result = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) result += ',';
    result += s[i];
  }
  return result;
}

const CATALOG = [
  { id: 'charge', label: 'Free Charge Session', cost: 500,  accentColor: COLOR_CYAN,   iconLabel: 'EV'  },
  { id: 'meal',   label: 'Free Meal',            cost: 750,  accentColor: COLOR_GOLD,   iconLabel: 'EAT' },
  { id: 'stay',   label: "Free Night's Stay",    cost: 2000, accentColor: COLOR_PURPLE, iconLabel: 'BED' },
] as const;

type RewardCatalogItem = typeof CATALOG[number];

interface Transaction {
  id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export default function Rewards() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  // Animated balance — drives the count-up TextInput
  const balanceSV = useSharedValue(0);
  const animatedProps = useAnimatedProps(() => ({
    value: formatPoints(balanceSV.value),
  }));

  // Trigger count-up whenever balance changes
  useEffect(() => {
    if (balance === null) return;
    cancelAnimation(balanceSV);
    balanceSV.value = withTiming(balance, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance]); // balanceSV is a stable shared value ref — safe to omit from deps

  const fetchData = useCallback(async () => {
    if (!session) return;
    setLoading(true);  // re-show skeletons on retry too
    setFetchError(null);

    const [profileRes, txRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('points_balance')
        .eq('id', session.user.id)
        .single(),
      supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (profileRes.error || !profileRes.data) {
      setFetchError('Could not load your balance.');
      setLoading(false);
      return;
    }

    setBalance(profileRes.data.points_balance);
    setTransactions(txRes.data ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRedeem = (item: RewardCatalogItem) => {
    if (redeemingId !== null) return; // block concurrent redemptions
    if (balance === null || balance < item.cost) return;

    Alert.alert(
      `Redeem ${item.label}?`,
      `This will deduct ${item.cost.toLocaleString()} points from your balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            setRedeemingId(item.id);
            const { error } = await supabase.rpc('redeem_points', {
              uid: session!.user.id,
              cost: item.cost,
              reward: item.id,
            });
            setRedeemingId(null);
            if (error) {
              Alert.alert('Error', 'Could not redeem — please try again.');
              return;
            }
            fetchData();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>

        {/* Balance hero */}
        <View style={styles.hero}>
          <View style={styles.glow} />
          <Text style={styles.heroLabel}>YOUR BALANCE</Text>
          {loading ? (
            <View style={styles.skeletonHero} />
          ) : (
            <AnimatedTextInput
              style={styles.heroPoints}
              animatedProps={animatedProps}
              defaultValue="0"
              editable={false}
              caretHidden={true}
            />
          )}
          <Text style={styles.heroPts}>ZAPP POINTS</Text>
        </View>

        {/* Error state */}
        {fetchError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable onPress={fetchData} accessibilityLabel="Retry loading rewards">
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Rewards catalog */}
        {!fetchError && (
          <>
            <Text style={styles.sectionLabel}>REWARDS CATALOG</Text>
            <View style={styles.catalogPadding}>
              {CATALOG.map((item) => (
                <RewardCard
                  key={item.id}
                  label={item.label}
                  cost={item.cost}
                  accentColor={item.accentColor}
                  iconLabel={item.iconLabel}
                  balance={balance ?? 0}
                  redeeming={redeemingId === item.id}
                  onRedeem={() => handleRedeem(item)}
                />
              ))}
            </View>
          </>
        )}

        {/* Transaction history */}
        <Text style={styles.sectionLabel}>HISTORY</Text>
        {loading ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonRow} />)}
          </View>
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>Start charging to earn points!</Text>
        ) : (
          transactions.map((tx, i) => (
            <View
              key={tx.id}
              style={[styles.txRow, i === transactions.length - 1 && styles.txRowLast]}
            >
              <View style={styles.txLeft}>
                <Text style={styles.txReason}>{tx.reason}</Text>
                <Text style={styles.txDate}>
                  {new Date(tx.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={[styles.txDelta, { color: tx.delta >= 0 ? COLOR_GOLD : COLOR_RED }]}>
                {tx.delta >= 0 ? '+' : ''}{tx.delta.toLocaleString()}
              </Text>
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  hero: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 240,
    height: 120,
    borderRadius: 120,
    backgroundColor: 'rgba(245,166,35,0.15)',
    top: '40%',
  },
  heroLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 3 },
  heroPoints: {
    fontFamily: FONT_BEBAS,
    fontSize: 72,
    color: COLOR_GOLD,
    letterSpacing: 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlign: 'center',
    marginTop: 4,
    minWidth: 160,
    padding: 0,
  },
  heroPts: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 3 },
  skeletonHero: {
    width: 160,
    height: 72,
    backgroundColor: COLOR_ELEVATED,
    borderRadius: 12,
    margin: 8,
  },
  errorContainer: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  errorText: { color: COLOR_TEXT_MUTED, fontSize: 13, marginBottom: 8, textAlign: 'center' },
  retryText: { color: COLOR_GOLD, fontSize: 13, fontWeight: '600' },
  sectionLabel: {
    color: COLOR_TEXT_MUTED,
    fontSize: 10,
    letterSpacing: 3,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  catalogPadding: { paddingHorizontal: 16, marginBottom: 24 },
  skeletonContainer: { paddingHorizontal: 16, gap: 10 },
  skeletonRow: { height: 52, backgroundColor: COLOR_ELEVATED, borderRadius: 12 },
  emptyText: {
    color: COLOR_TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  txRowLast: { borderBottomWidth: 0 },
  txLeft: { flex: 1 },
  txReason: { color: COLOR_TEXT_SECONDARY, fontSize: 13 },
  txDate: { color: COLOR_TEXT_MUTED, fontSize: 10, marginTop: 2 },
  txDelta: { fontSize: 14, fontWeight: '700' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(drawer)/rewards.tsx
git commit -m "feat: rebuild rewards screen with animated balance and rich reward cards"
```

---

### Task 3: Delete `RewardItem.tsx`

**Files:**
- Delete: `components/RewardItem.tsx`

- [ ] **Step 1: Confirm nothing imports RewardItem**

```bash
grep -r "RewardItem" --include="*.tsx" --include="*.ts" .
```

Expected: zero matches. If any file still imports it, update that file to use `RewardCard` instead before deleting.

- [ ] **Step 2: Delete the file**

```bash
rm components/RewardItem.tsx
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove RewardItem (replaced by RewardCard)"
```

---

## Verification Checklist

After all tasks, manually verify on device:

- [ ] Rewards screen opens without crash
- [ ] Balance number counts up from 0 to actual balance with smooth animation
- [ ] Each reward card shows correct icon label (EV / EAT / BED) in accent color
- [ ] Progress bars animate in on screen load
- [ ] "✓ REDEEMABLE" shown in accent color when balance is sufficient
- [ ] "X pts to go" shown in muted color when balance is insufficient
- [ ] Tapping a redeemable card shows Alert confirmation
- [ ] After confirmation, tapped card shows spinner; other cards stay interactive
- [ ] After redemption, balance re-animates to new (lower) value
- [ ] Transaction history shows reason + date + colored delta
- [ ] Empty state shows when no transactions exist
- [ ] Loading skeletons show before data arrives
