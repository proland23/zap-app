// app/(drawer)/profile.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session-context';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';

type TabId = 'upcoming' | 'past' | 'payment';
const TABS: { id: TabId; label: string }[] = [
  { id: 'upcoming', label: 'UPCOMING' },
  { id: 'past', label: 'PAST' },
  { id: 'payment', label: 'PAYMENT' },
];

interface Booking { id: string; type: string; date: string; detail: string; amount: number; }

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useSession();
  const [profile, setProfile] = useState<{ full_name: string; points_balance: number; membership_tier: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const TAB_WIDTH = 110;
  const underlineX = useSharedValue(0);

  useEffect(() => {
    if (!session) return;
    supabase.from('user_profiles').select('full_name, points_balance, membership_tier').eq('id', session.user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    const now = new Date().toISOString();
    const isUpcoming = activeTab === 'upcoming';
    if (activeTab === 'payment') { setBookings([]); setLoading(false); return; }

    Promise.all([
      supabase.from('charge_bookings').select('id, start_time, amount_paid, status').eq('user_id', session.user.id),
      supabase.from('stay_bookings').select('id, check_in, amount_paid, status').eq('user_id', session.user.id),
    ]).then(([chargeRes, stayRes]) => {
      const combined: Booking[] = [
        ...(chargeRes.data ?? []).map((b: any) => ({ id: b.id, type: 'Charge', date: b.start_time, detail: 'EV Charging', amount: b.amount_paid })),
        ...(stayRes.data ?? []).map((b: any) => ({ id: b.id, type: 'Stay', date: b.check_in, detail: 'Lodging', amount: b.amount_paid })),
      ].filter((b) => isUpcoming ? b.date >= now.slice(0, 10) : b.date < now.slice(0, 10))
        .sort((a, z) => isUpcoming ? a.date.localeCompare(z.date) : z.date.localeCompare(a.date));
      setBookings(combined);
      setLoading(false);
    });
  }, [activeTab, session]);

  const handleTabPress = (tab: TabId, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    underlineX.value = withTiming(idx * TAB_WIDTH, { duration: 200 });
  };

  const underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));

  const initials = profile?.full_name?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <View style={styles.tierRow}>
            <Text style={styles.tier}>{(profile?.membership_tier ?? 'MEMBER').toUpperCase()}</Text>
            <Text style={styles.points}>{(profile?.points_balance ?? 0).toLocaleString()} PTS</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab, idx) => (
          <Pressable key={tab.id} style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleTabPress(tab.id, idx)}>
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
        <Animated.View style={[styles.underline, underlineStyle, { width: TAB_WIDTH }]} />
      </View>

      {/* Tab content */}
      {activeTab === 'payment' ? (
        <View style={styles.paymentPlaceholder}>
          <Text style={styles.emptyText}>Payment methods available after account setup</Text>
        </View>
      ) : loading ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonRow} />)}
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{activeTab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings yet'}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          renderItem={({ item }) => (
            <View style={styles.bookingCard}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingType}>{item.type.toUpperCase()}</Text>
                <Text style={styles.bookingDetail}>{item.detail}</Text>
                <Text style={styles.bookingDate}>{item.date?.slice(0, 10)}</Text>
              </View>
              <Text style={styles.bookingAmount}>${item.amount?.toFixed(2)}</Text>
            </View>
          )}
        />
      )}

      {/* Sign out */}
      <Pressable style={[styles.signOutBtn, { bottom: insets.bottom + 16 }]} onPress={handleSignOut}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: { flexDirection: 'row', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLOR_ELEVATED, borderWidth: 1, borderColor: 'rgba(245,166,35,0.3)', alignItems: 'center', justifyContent: 'center' },
  initials: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 22 },
  headerInfo: { flex: 1, justifyContent: 'center' },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 18, fontWeight: '700' },
  email: { color: COLOR_TEXT_MUTED, fontSize: 12, marginTop: 2 },
  tierRow: { flexDirection: 'row', gap: 10, marginTop: 6, alignItems: 'center' },
  tier: { color: COLOR_GOLD, fontSize: 10, letterSpacing: 2, backgroundColor: 'rgba(245,166,35,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  points: { color: COLOR_TEXT_MUTED, fontSize: 11 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', position: 'relative' },
  tab: { height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1.5 },
  tabTextActive: { color: COLOR_GOLD },
  underline: { position: 'absolute', bottom: 0, height: 2, backgroundColor: COLOR_GOLD, borderRadius: 1 },
  skeletonRow: { height: 70, backgroundColor: COLOR_ELEVATED, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 14, textAlign: 'center', padding: 20 },
  paymentPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bookingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLOR_CARD, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  bookingLeft: { gap: 3 },
  bookingType: { color: COLOR_GOLD, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  bookingDetail: { color: COLOR_TEXT_PRIMARY, fontSize: 14 },
  bookingDate: { color: COLOR_TEXT_MUTED, fontSize: 12 },
  bookingAmount: { color: COLOR_GOLD, fontSize: 18, fontWeight: '700' },
  signOutBtn: { position: 'absolute', left: 20, right: 20, backgroundColor: COLOR_ELEVATED, borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  signOutText: { color: COLOR_TEXT_MUTED, fontSize: 13, letterSpacing: 2 },
});
