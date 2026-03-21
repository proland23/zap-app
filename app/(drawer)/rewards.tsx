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
        .select('id, delta, reason, created_at')
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

  const handleRedeem = useCallback((item: RewardCatalogItem) => {
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
  }, [redeemingId, balance, session, fetchData]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>

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
  scrollContent: { flexGrow: 1 },
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
  errorText: { color: COLOR_RED, fontSize: 13, marginBottom: 8, textAlign: 'center' },
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
