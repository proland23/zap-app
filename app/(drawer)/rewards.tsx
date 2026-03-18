// app/(drawer)/rewards.tsx
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session-context';
import { supabase } from '../../lib/supabase';
import RewardItem from '../../components/RewardItem';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN, COLOR_PURPLE, COLOR_RED,
  COLOR_TEXT_MUTED, COLOR_TEXT_PRIMARY, FONT_BEBAS,
} from '../../lib/constants';

interface Transaction { id: string; delta: number; reason: string; created_at: string; }

const CATALOG = [
  { id: 'charge', label: 'Free Charge Session', cost: 500,  color: COLOR_CYAN },
  { id: 'meal',   label: 'Free Meal',            cost: 750,  color: COLOR_GOLD },
  { id: 'stay',   label: "Free Night's Stay",    cost: 2000, color: COLOR_PURPLE },
];

export default function Rewards() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!session) return;
    const [profileRes, txRes] = await Promise.all([
      supabase.from('user_profiles').select('points_balance').eq('id', session.user.id).single(),
      supabase.from('points_transactions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (profileRes.data) setBalance(profileRes.data.points_balance);
    if (txRes.data) setTransactions(txRes.data);
    setLoading(false);
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRedeem = (item: typeof CATALOG[0]) => {
    if (balance === null || balance < item.cost) return;
    Alert.alert(`Redeem ${item.label}?`, `This will deduct ${item.cost} points.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem', onPress: async () => {
          const { error } = await supabase.rpc('redeem_points', { uid: session!.user.id, cost: item.cost, reward: item.id });
          if (error) { Alert.alert('Error', 'Insufficient points or server error.'); return; }
          fetchData();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Balance hero */}
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>YOUR BALANCE</Text>
          {loading ? (
            <View style={styles.skeletonHero} />
          ) : (
            <Text style={styles.heroPoints}>{(balance ?? 0).toLocaleString()}</Text>
          )}
          <Text style={styles.heroPts}>ZAPP POINTS</Text>
        </View>

        {/* Catalog */}
        <Text style={styles.sectionLabel}>REWARDS CATALOG</Text>
        <View style={{ paddingHorizontal: 16 }}>
          {CATALOG.map((item) => (
            <RewardItem
              key={item.id}
              label={item.label}
              cost={item.cost}
              accentColor={item.color}
              canRedeem={!loading && (balance ?? 0) >= item.cost}
              onRedeem={() => handleRedeem(item)}
            />
          ))}
        </View>

        {/* Transaction history */}
        <Text style={styles.sectionLabel}>HISTORY</Text>
        {loading ? (
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonRow} />)}
          </View>
        ) : transactions.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet — start charging to earn points!</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <Text style={styles.txReason}>{tx.reason}</Text>
              <Text style={[styles.txDelta, { color: tx.delta >= 0 ? COLOR_GOLD : COLOR_RED }]}>
                {tx.delta >= 0 ? '+' : ''}{tx.delta}
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
  hero: { alignItems: 'center', paddingVertical: 32, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 24 },
  heroLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 3 },
  heroPoints: { fontFamily: FONT_BEBAS, fontSize: 72, color: COLOR_GOLD, letterSpacing: 4, marginTop: 4 },
  heroPts: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 3 },
  skeletonHero: { width: 160, height: 80, backgroundColor: COLOR_ELEVATED, borderRadius: 12, margin: 8 },
  sectionLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 3, paddingHorizontal: 16, marginBottom: 12 },
  skeletonRow: { height: 52, backgroundColor: COLOR_ELEVATED, borderRadius: 12 },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 13, paddingHorizontal: 16, textAlign: 'center', marginTop: 8 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  txReason: { color: COLOR_TEXT_PRIMARY, fontSize: 13, flex: 1 },
  txDelta: { fontSize: 14, fontWeight: '700' },
});
