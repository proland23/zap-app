// components/DrawerContent.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import {
  COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../lib/constants';

const NAV_ITEMS = [
  { label: 'HOME',    route: '/(drawer)/' as const,        color: COLOR_TEXT_PRIMARY },
  { label: 'CHARGE',  route: '/(drawer)/charge' as const,  color: COLOR_CYAN },
  { label: 'STAY',    route: '/(drawer)/stay' as const,    color: COLOR_TEXT_PRIMARY },
  { label: 'EAT',     route: '/(drawer)/eat' as const,     color: COLOR_TEXT_PRIMARY },
  { label: 'SHOP',    route: '/(drawer)/shop' as const,    color: COLOR_TEXT_PRIMARY },
  { label: 'REWARDS', route: '/(drawer)/rewards' as const, color: COLOR_TEXT_PRIMARY },
  { label: 'PROFILE', route: '/(drawer)/profile' as const, color: COLOR_TEXT_PRIMARY },
];

const SOON_ITEMS = ['RIDE', 'FLY'];

interface Props extends DrawerContentComponentProps {
  userName?: string;
  points?: number;
}

export default function DrawerContent({ navigation, userName, points }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const handleNav = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.closeDrawer();
    router.push(route as any);
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      {/* Logo */}
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>ZAPP</Text>
        <Text style={styles.tagline}>BY REST & RECHARGE</Text>
        <View style={styles.goldLine} />
      </View>

      {/* User info */}
      <View style={styles.userBlock}>
        <Text style={styles.userName}>{userName ?? '—'}</Text>
        <View style={styles.pointsRow}>
          <View style={styles.pointsDot} />
          <Text style={styles.pointsText}>{(points ?? 0).toLocaleString()} PTS</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Nav items */}
      <View style={styles.navList}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.route || (item.route === '/(drawer)/' && pathname === '/');
          return (
            <Pressable key={item.label} style={styles.navItem} onPress={() => handleNav(item.route)}>
              {isActive && <View style={styles.activeBar} />}
              <Text style={[
                styles.navLabel,
                { color: isActive ? COLOR_GOLD : item.color },
                !isActive && item.color === COLOR_TEXT_PRIMARY && { color: COLOR_TEXT_SECONDARY },
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}

        {SOON_ITEMS.map((label) => (
          <View key={label} style={styles.navItem}>
            <Text style={styles.soonLabel}>{label}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>SOON</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.divider} />
      <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLOR_ELEVATED,
    borderRightWidth: 1,
    borderRightColor: 'rgba(245,166,35,0.15)',
    paddingHorizontal: 0,
  },
  logoBlock: { paddingHorizontal: 20, marginBottom: 16 },
  logo: { fontFamily: FONT_BEBAS, fontSize: 32, color: COLOR_GOLD, letterSpacing: 6 },
  tagline: { fontSize: 8, letterSpacing: 2, color: COLOR_TEXT_MUTED, marginTop: 3 },
  goldLine: { width: 24, height: 1, backgroundColor: COLOR_GOLD, marginTop: 8 },
  userBlock: { paddingHorizontal: 20, marginBottom: 16 },
  userName: { color: COLOR_TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pointsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLOR_GOLD },
  pointsText: { color: COLOR_GOLD, fontSize: 11, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  navList: { paddingTop: 4 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 20 },
  activeBar: { width: 3, height: 24, backgroundColor: COLOR_GOLD, borderRadius: 2, marginRight: 12 },
  navLabel: { fontSize: 12, letterSpacing: 1.5, fontWeight: '600' },
  soonLabel: { fontSize: 11, letterSpacing: 1, color: COLOR_TEXT_MUTED, marginLeft: 15 },
  soonBadge: {
    marginLeft: 8, backgroundColor: 'rgba(245,166,35,0.15)',
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  soonBadgeText: { color: COLOR_GOLD, fontSize: 8, letterSpacing: 1 },
  signOutBtn: { paddingHorizontal: 20, paddingVertical: 16 },
  signOutText: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1 },
});
