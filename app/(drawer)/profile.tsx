// app/(drawer)/profile.tsx
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, StatusBar,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal, BottomSheetModalProvider, BottomSheetView,
} from '@gorhom/bottom-sheet';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session-context';
import { openPaymentSheet } from '../../lib/stripe'; // used in Task 3 (Payment Tab)
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS, // COLOR_TEXT_SECONDARY used in Tasks 2 & 3
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

  const editSheetRef = useRef<BottomSheetModal>(null);
  const [editName, setEditName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [addingCard, setAddingCard] = useState(false);

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
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGlow} />
            <View style={styles.avatar}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
              <Pressable
                onPress={() => {
                  setEditName(profile?.full_name ?? '');
                  editSheetRef.current?.present();
                }}
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                <Text style={styles.editBtn}>EDIT</Text>
              </Pressable>
            </View>
            <Text style={styles.email}>{session?.user.email}</Text>
            <View
              style={styles.tierBadge}
              accessibilityLabel={`Membership tier: ${profile?.membership_tier ?? 'MEMBER'}`}
            >
              <Text style={styles.tierText}>
                {(profile?.membership_tier ?? 'MEMBER').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.points}>
              {(profile?.points_balance ?? 0).toLocaleString()} PTS
            </Text>
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
        <View style={styles.tabContent}>
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
        </View>

        {/* Sign out */}
        <Pressable
          style={[styles.signOutBtn, { marginBottom: insets.bottom + 16 }]}
          onPress={handleSignOut}
          accessibilityLabel="Sign out of account"
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        {/* Edit profile bottom sheet */}
        <BottomSheetModal
          ref={editSheetRef}
          snapPoints={['60%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <BottomSheetView style={styles.editSheetContent}>
            {/* Avatar with CAM overlay */}
            <Pressable
              style={styles.editAvatarWrapper}
              onPress={() =>
                Alert.alert('Coming Soon', 'Profile photo upload will be available in a future update.')
              }
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
            >
              <View style={styles.editAvatar}>
                <Text style={styles.editInitials}>{initials}</Text>
              </View>
              <View style={styles.camOverlay}>
                <Text style={styles.camText}>CAM</Text>
              </View>
            </Pressable>

            {/* Name input */}
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <TextInput
              style={[
                styles.nameInput,
                { borderColor: nameFocused ? COLOR_GOLD : 'rgba(255,255,255,0.12)' },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={COLOR_TEXT_MUTED}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />

            {/* SAVE button */}
            <Pressable
              style={[
                styles.saveBtn,
                (saving || editName.trim().length === 0) && styles.saveBtnDisabled,
              ]}
              disabled={saving || editName.trim().length === 0}
              accessibilityLabel="Save profile changes"
              accessibilityState={{ disabled: saving || editName.trim().length === 0, busy: saving }}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSaving(true);
                try {
                  const { error } = await supabase
                    .from('user_profiles')
                    .update({ full_name: editName.trim() })
                    .eq('id', session!.user.id);
                  if (error) {
                    Alert.alert('Error', 'Could not save changes.');
                    return;
                  }
                  setProfile((prev) =>
                    prev ? { ...prev, full_name: editName.trim() } : prev
                  );
                  editSheetRef.current?.dismiss();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLOR_NAVY} />
              ) : (
                <Text style={styles.saveBtnText}>SAVE</Text>
              )}
            </Pressable>

            {/* CANCEL */}
            <Pressable
              style={styles.cancelBtn}
              onPress={() => editSheetRef.current?.dismiss()}
              accessibilityLabel="Cancel profile edit"
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR_ELEVATED,
    borderWidth: 2,
    borderColor: 'rgba(245,166,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 26 },
  headerInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 20, fontWeight: '800' },
  editBtn: {
    color: COLOR_GOLD,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 4,
  },
  email: { color: COLOR_TEXT_MUTED, fontSize: 12, marginTop: 2 },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  tierText: {
    color: COLOR_GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  points: { color: COLOR_TEXT_MUTED, fontSize: 11, marginTop: 6 },
  tabContent: { flex: 1 },
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
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: COLOR_ELEVATED,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  signOutText: { color: COLOR_TEXT_MUTED, fontSize: 13, letterSpacing: 2 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  editSheetContent: { padding: 24 },
  editAvatarWrapper: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLOR_ELEVATED,
    borderWidth: 2,
    borderColor: 'rgba(245,166,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInitials: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 30 },
  camOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camText: { color: COLOR_NAVY, fontSize: 7, fontWeight: '800' },
  inputLabel: {
    color: COLOR_TEXT_MUTED,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: COLOR_CARD,
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: COLOR_TEXT_PRIMARY,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: COLOR_GOLD,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: COLOR_TEXT_MUTED, fontSize: 13 },
});
