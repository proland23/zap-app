# Zapp App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Zapp by Rest & Recharge mobile app — auth, drawer navigation, and 6 screens — on Expo SDK 54 / React Native 0.81.5.

**Architecture:** Expo Router drawer group (`app/(drawer)/`) with a session guard in the drawer layout. Auth lives outside the drawer at `app/login.tsx`. All Stripe/OneSignal calls are guarded with `Constants.appOwnership !== 'expo'` so the app runs in Expo Go 54.

**Tech Stack:** Expo SDK 54, expo-router 6, React Native 0.81.5, Reanimated 4 (v3 API), Supabase, Stripe React Native, @gorhom/bottom-sheet, Zustand, react-native-onesignal v5, react-native-maps

---

## Chunk 1: Foundation

### Task 1: Jest setup

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`
- Modify: `package.json` (add jest config + scripts)

- [ ] Install jest dependencies:
```bash
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native --legacy-peer-deps
```

- [ ] Create `jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

- [ ] Create `jest.setup.js`:
```js
import '@testing-library/jest-native/extend-expect';
```

- [ ] Add to `package.json` scripts: `"test": "jest"` and `"test:watch": "jest --watch"`

- [ ] Run `npm test -- --passWithNoTests` to verify setup works.
Expected: `Test Suites: 0 skipped` with exit 0.

- [ ] Commit:
```bash
git add jest.config.js jest.setup.js package.json
git commit -m "chore: add jest-expo testing infrastructure"
```

---

### Task 2: File system migration

**Files:**
- Delete: `app/home.tsx`, `app/charge.tsx`, `app/stay.tsx`, `app/eat.tsx`, `app/shop.tsx`
- Create dir: `app/(drawer)/`, `app/stay/`

- [ ] Delete old flat screen files:
```bash
rm app/home.tsx app/charge.tsx app/stay.tsx app/eat.tsx app/shop.tsx
```

- [ ] Create drawer group directory structure and placeholder files so Expo Router doesn't 404:
```bash
mkdir -p "app/(drawer)" app/stay
```

- [ ] Create `app/(drawer)/shop.tsx` placeholder:
```tsx
// app/(drawer)/shop.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';

export default function Shop() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SHOP</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontFamily: FONT_BEBAS, fontSize: 32 },
  sub: { color: COLOR_TEXT_MUTED, fontSize: 14, marginTop: 8 },
});
```

- [ ] Create `app/stay/[id].tsx` placeholder (prevents navigation crash):
```tsx
// app/stay/[id].tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../../lib/constants';

export default function StayDetail() {
  return <View style={styles.container}><Text style={{ color: '#fff' }}>Loading...</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] Commit:
```bash
git add -A
git commit -m "chore: migrate to drawer group file structure, remove flat screen stubs"
```

---

### Task 3: Stripe helpers

**Files:**
- Create: `lib/stripe.ts`
- Create: `lib/__tests__/stripe.test.ts`

- [ ] Write failing test `lib/__tests__/stripe.test.ts`:
```ts
import { openPaymentSheet } from '../stripe';

// In Expo Go (appOwnership === 'expo'), openPaymentSheet must return true (mock success)
jest.mock('expo-constants', () => ({
  default: { appOwnership: 'expo' },
}));

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  presentPaymentSheet: jest.fn(),
}));

describe('openPaymentSheet', () => {
  it('returns true (mock) when running in Expo Go', async () => {
    const result = await openPaymentSheet('mock_secret');
    expect(result).toBe(true);
  });
});
```

- [ ] Run: `npm test -- lib/__tests__/stripe.test.ts`
Expected: FAIL — `Cannot find module '../stripe'`

- [ ] Create `lib/stripe.ts`:
```ts
// lib/stripe.ts
import Constants from 'expo-constants';

// Lazy import so Metro doesn't choke in Expo Go
async function getStripe() {
  return import('@stripe/stripe-react-native');
}

export async function initializeStripe(): Promise<void> {
  if (Constants.appOwnership === 'expo') return;
  const { initStripe } = await getStripe();
  await initStripe({
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  });
}

export async function openPaymentSheet(_clientSecret: string): Promise<boolean> {
  if (Constants.appOwnership === 'expo') return true; // mock success in Expo Go
  const { presentPaymentSheet } = await getStripe();
  const { error } = await presentPaymentSheet();
  return !error;
}
```

- [ ] Run: `npm test -- lib/__tests__/stripe.test.ts`
Expected: PASS

- [ ] Commit:
```bash
git add lib/stripe.ts lib/__tests__/stripe.test.ts
git commit -m "feat: add Stripe helpers with Expo Go mock guard"
```

---

### Task 4: Cart store

**Files:**
- Create: `lib/cart-store.ts`
- Create: `lib/__tests__/cart-store.test.ts`

- [ ] Write failing test `lib/__tests__/cart-store.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react-native';
import { useCartStore } from '../cart-store';

beforeEach(() => useCartStore.setState({ items: [] }));

describe('cart store', () => {
  it('adds a new item with qty 1', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(1);
  });

  it('increments qty when same item added twice', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].qty).toBe(2);
  });

  it('removes an item', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.removeItem('1'));
    expect(result.current.items).toHaveLength(0);
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useCartStore());
    act(() => result.current.addItem({ id: '1', name: 'Burger', price: 9.99 }));
    act(() => result.current.clearCart());
    expect(result.current.items).toHaveLength(0);
  });
});
```

- [ ] Run: `npm test -- lib/__tests__/cart-store.test.ts`
Expected: FAIL — `Cannot find module '../cart-store'`

- [ ] Create `lib/cart-store.ts`:
```ts
// lib/cart-store.ts
import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      if (existing) {
        return { items: state.items.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) };
      }
      return { items: [...state.items, { ...item, qty: 1 }] };
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  clearCart: () => set({ items: [] }),
}));
```

- [ ] Run: `npm test -- lib/__tests__/cart-store.test.ts`
Expected: PASS (4 tests)

- [ ] Commit:
```bash
git add lib/cart-store.ts lib/__tests__/cart-store.test.ts
git commit -m "feat: add Zustand cart store with tests"
```

---

### Task 5: DrawerContent component

**Files:**
- Create: `components/DrawerContent.tsx`

- [ ] Create `components/DrawerContent.tsx`:
```tsx
// components/DrawerContent.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../lib/constants';

const NAV_ITEMS = [
  { label: 'HOME',    route: '/(drawer)/' as const,        color: COLOR_TEXT_PRIMARY },
  { label: 'CHARGE',  route: '/(drawer)/charge' as const,  color: COLOR_CYAN },
  { label: 'STAY',    route: '/(drawer)/stay' as const,    color: COLOR_TEXT_PRIMARY },
  { label: 'EAT',     route: '/(drawer)/eat' as const,     color: COLOR_TEXT_PRIMARY },
  { label: 'REWARDS', route: '/(drawer)/rewards' as const, color: COLOR_TEXT_PRIMARY },
  { label: 'PROFILE', route: '/(drawer)/profile' as const, color: COLOR_TEXT_PRIMARY },
];

const SOON_ITEMS = ['SHOP', 'RIDE', 'FLY'];

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
```

- [ ] Commit:
```bash
git add components/DrawerContent.tsx
git commit -m "feat: add DrawerContent component with brand panel"
```

---

### Task 6: Drawer layout + session guard

**Files:**
- Create: `app/(drawer)/_layout.tsx`

- [ ] Create `app/(drawer)/_layout.tsx`:
```tsx
// app/(drawer)/_layout.tsx
import { useEffect, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../lib/session-context';
import { supabase } from '../../lib/supabase';
import { initializeStripe } from '../../lib/stripe';
import DrawerContent from '../../components/DrawerContent';
import { COLOR_NAVY, COLOR_GOLD } from '../../lib/constants';

export default function DrawerLayout() {
  const { session, loading } = useSession();
  const router = useRouter();
  const [userName, setUserName] = useState<string | undefined>();
  const [points, setPoints] = useState(0);

  // Session guard
  useEffect(() => {
    if (!loading && !session) router.replace('/login');
  }, [loading, session]);

  // Fetch user profile for drawer
  useEffect(() => {
    if (!session) return;
    supabase
      .from('user_profiles')
      .select('full_name, points_balance')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setUserName(data.full_name);
          setPoints(data.points_balance ?? 0);
        }
      });
  }, [session]);

  // Init Stripe (dev build only)
  useEffect(() => { initializeStripe(); }, []);

  // Init OneSignal (dev build only)
  useEffect(() => {
    if (Constants.appOwnership === 'expo' || !session) return;
    import('react-native-onesignal').then(({ OneSignal }) => {
      OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '');
      OneSignal.Notifications.requestPermission(true);
      OneSignal.User.pushSubscription.addEventListener('change', (sub: any) => {
        if (sub.current?.id) {
          supabase.from('user_profiles')
            .update({ onesignal_player_id: sub.current.id })
            .eq('id', session.user.id);
        }
      });
    });
  }, [session]);

  if (loading || !session) return null;

  return (
    <Drawer
      drawerContent={(props) => (
        <DrawerContent {...props} userName={userName} points={points} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 260, backgroundColor: 'transparent' },
        overlayColor: 'rgba(5,13,24,0.75)',
        swipeEdgeWidth: 60,
      }}
    >
      <Drawer.Screen name="index" />
      <Drawer.Screen name="charge" />
      <Drawer.Screen name="stay" />
      <Drawer.Screen name="eat" />
      <Drawer.Screen name="rewards" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="shop" />
    </Drawer>
  );
}
```

- [ ] Commit:
```bash
git add "app/(drawer)/_layout.tsx"
git commit -m "feat: add drawer layout with session guard, Stripe + OneSignal init"
```

---

### Task 7: Auth screen

**Files:**
- Modify: `app/login.tsx`

- [ ] Replace `app/login.tsx` with the full auth screen:
```tsx
// app/login.tsx
import { useState, useRef } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, COLOR_RED, FONT_BEBAS,
} from '../lib/constants';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signin' | 'signup';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signupOffset = useSharedValue(40);
  const signupOpacity = useSharedValue(0);

  const signupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: signupOffset.value }],
    opacity: signupOpacity.value,
  }));

  const switchToSignup = () => {
    setMode('signup');
    setError('');
    signupOffset.value = withSpring(0, { damping: 18, stiffness: 80 });
    signupOpacity.value = withSpring(1, { damping: 18, stiffness: 80 });
  };

  const switchToSignin = () => {
    setMode('signin');
    setError('');
    signupOffset.value = 40;
    signupOpacity.value = 0;
  };

  const handleEmailSignIn = async () => {
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true); setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/(drawer)/');
  };

  const handleSignUp = async () => {
    if (!fullName || !phone || !email || !password) { setError('All fields required.'); return; }
    setLoading(true); setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace('/(drawer)/');
  };

  const handleOAuth = async (provider: 'apple' | 'google') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const redirectTo = makeRedirectUri({ scheme: 'zapapp' });
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (err || !data.url) { setError(err?.message ?? 'OAuth failed'); return; }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const url = new URL(result.url);
      const access_token = url.searchParams.get('access_token') ?? '';
      const refresh_token = url.searchParams.get('refresh_token') ?? '';
      if (access_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        router.replace('/(drawer)/');
      }
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1, backgroundColor: COLOR_NAVY }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero top */}
        <LinearGradient colors={[COLOR_ELEVATED, COLOR_NAVY]} style={styles.hero}>
          {/* Gold glow */}
          <View style={styles.glow} />
          <Text style={styles.logoText}>ZAPP</Text>
          <Text style={styles.byLine}>BY REST & RECHARGE</Text>
          <Text style={styles.tagline}>CHARGE · STAY · EAT · RIDE · FLY</Text>
        </LinearGradient>

        {/* Bottom card */}
        <View style={styles.card}>
          <View style={styles.handle} />

          {mode === 'signup' && (
            <Animated.View style={signupStyle}>
              <Input label="FULL NAME" value={fullName} onChangeText={setFullName} editable={!loading} />
              <Input label="PHONE" value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!loading} />
            </Animated.View>
          )}

          <Input label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!loading} />
          <Input label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={mode === 'signin' ? handleEmailSignIn : handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLOR_NAVY} />
              : <Text style={styles.primaryBtnText}>{mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>
            }
          </Pressable>

          {mode === 'signin' && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.oauthRow}>
                <Pressable style={styles.oauthBtn} onPress={() => handleOAuth('apple')}>
                  <Text style={styles.oauthText}> Apple</Text>
                </Pressable>
                <Pressable style={styles.oauthBtn} onPress={() => handleOAuth('google')}>
                  <Text style={[styles.oauthText, { color: '#EA4335' }]}>G</Text>
                  <Text style={styles.oauthText}> Google</Text>
                </Pressable>
              </View>
              <Pressable onPress={switchToSignup} style={styles.switchLink}>
                <Text style={styles.switchText}>New here? <Text style={{ color: COLOR_GOLD }}>Create account</Text></Text>
              </Pressable>
            </>
          )}

          {mode === 'signup' && (
            <Pressable onPress={switchToSignin} style={styles.switchLink}>
              <Text style={styles.switchText}>Already have an account? <Text style={{ color: COLOR_GOLD }}>Sign in</Text></Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Input({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={inputStyles.label}>{label}</Text>
      <TextInput
        style={[inputStyles.input, focused && inputStyles.focused]}
        placeholderTextColor={COLOR_TEXT_MUTED}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  label: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 6 },
  input: {
    backgroundColor: COLOR_ELEVATED, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12,
    height: 52, paddingHorizontal: 16, color: COLOR_TEXT_PRIMARY, fontSize: 15,
  },
  focused: { borderColor: COLOR_GOLD },
});

const styles = StyleSheet.create({
  hero: { height: 280, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 28, position: 'relative' },
  glow: {
    position: 'absolute', top: '40%', left: '50%',
    width: 160, height: 80, marginLeft: -80, marginTop: -40,
    backgroundColor: 'rgba(245,166,35,0.18)', borderRadius: 80,
    // blur not available in RN — use opacity + large borderRadius instead
  },
  logoText: { fontFamily: FONT_BEBAS, fontSize: 72, color: COLOR_GOLD, letterSpacing: 12, zIndex: 1 },
  byLine: { fontSize: 9, letterSpacing: 3, color: COLOR_TEXT_MUTED, marginTop: 4 },
  tagline: { fontSize: 10, letterSpacing: 2, color: COLOR_TEXT_MUTED, marginTop: 12 },
  card: {
    flex: 1, backgroundColor: COLOR_CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    padding: 24, marginTop: -20,
  },
  handle: { width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  primaryBtn: {
    backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  primaryBtnText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  errorText: { color: COLOR_RED, fontSize: 13, marginBottom: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 1, paddingHorizontal: 12 },
  oauthRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  oauthBtn: {
    flex: 1, backgroundColor: COLOR_ELEVATED, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, height: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  oauthText: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  switchLink: { alignItems: 'center', marginTop: 8 },
  switchText: { color: COLOR_TEXT_MUTED, fontSize: 12 },
});
```

- [ ] Verify: run `npx expo start` and open in Expo Go. Confirm the hero gradient + ZAPP wordmark renders. Confirm sign-in form shows, create account animates in, error text appears for empty fields.

- [ ] Commit:
```bash
git add app/login.tsx
git commit -m "feat: build auth screen — hero layout, email/password, OAuth, create account"
```

---

### Task 8: Home screen migration

**Files:**
- Create: `app/(drawer)/index.tsx`

- [ ] Create `app/(drawer)/index.tsx` (migrated from `app/home.tsx`, session guard removed, drawer button added):
```tsx
// app/(drawer)/index.tsx
import { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useNavigation } from 'expo-router';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session-context';
import SnapCarousel from '../../components/SnapCarousel';
import { COLOR_NAVY, COLOR_GOLD, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';

export default function Home() {
  const { session } = useSession();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonTitle, setComingSoonTitle] = useState('');

  const displayName =
    (session?.user?.user_metadata?.full_name as string | undefined) || 'there';

  const handleComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonVisible(true);
  };

  const dismiss = () => setComingSoonVisible(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header row */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => navigation.openDrawer()} style={styles.menuBtn} accessibilityLabel="Open menu">
          <View style={styles.menuLine} />
          <View style={[styles.menuLine, { width: 18 }]} />
          <View style={styles.menuLine} />
        </Pressable>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.carouselWrapper}>
        <SnapCarousel onComingSoon={handleComingSoon} />
      </View>

      <Modal visible={comingSoonVisible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{comingSoonTitle} is coming soon!</Text>
            <Text style={styles.modalSubtext}>We're working hard to bring this to you.</Text>
            <Pressable style={styles.gotItButton} onPress={dismiss}>
              <Text style={styles.gotItText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: { paddingHorizontal: 24, marginBottom: 32, flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  menuBtn: { paddingBottom: 4, gap: 5 },
  menuLine: { width: 24, height: 2, backgroundColor: COLOR_GOLD, borderRadius: 1 },
  greeting: { color: '#fff', fontSize: 16 },
  name: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 42 },
  carouselWrapper: { flex: 1, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: COLOR_NAVY, borderWidth: 1, borderColor: COLOR_GOLD,
    borderRadius: 20, padding: 32, marginHorizontal: 32, alignItems: 'center',
  },
  modalTitle: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 28, textAlign: 'center' },
  modalSubtext: { color: '#fff', fontSize: 14, textAlign: 'center', marginTop: 8 },
  gotItButton: { backgroundColor: COLOR_GOLD, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 },
  gotItText: { color: COLOR_NAVY, fontWeight: 'bold' },
});
```

- [ ] Verify in Expo Go: home screen shows hamburger (3 gold lines), greeting, carousel. Tapping hamburger opens drawer. Coming-soon modal still works.

- [ ] Commit:
```bash
git add "app/(drawer)/index.tsx"
git commit -m "feat: migrate home screen to drawer group with hamburger menu"
```

---

## Chunk 2: Charge Screen

### Task 9: BayMarker component

**Files:**
- Create: `components/BayMarker.tsx`

- [ ] Create `components/BayMarker.tsx`:
```tsx
// components/BayMarker.tsx
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { COLOR_GREEN, COLOR_GOLD, COLOR_RED } from '../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';

const STATUS_COLOR: Record<BayStatus, string> = {
  available: COLOR_GREEN,
  reserved: COLOR_GOLD,
  occupied: COLOR_RED,
};

interface Props {
  latitude: number;
  longitude: number;
  status: BayStatus;
  bayNumber: number;
}

export default function BayMarker({ latitude, longitude, status, bayNumber }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.8);
  const color = STATUS_COLOR[status];

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.5, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1, false,
    );
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 800 }), withTiming(0.8, { duration: 800 })),
      -1, false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const dotStyle = useAnimatedStyle(() => ({ opacity: 1 }));

  return (
    <Marker coordinate={{ latitude, longitude }} title={`Bay ${bayNumber}`} anchor={{ x: 0.5, y: 0.5 }}>
      <Animated.View style={[styles.pulse, { backgroundColor: color + '40' }, pulseStyle]} />
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pulse: { width: 28, height: 28, borderRadius: 14, position: 'absolute', top: -6, left: -6 },
  dot: { width: 16, height: 16, borderRadius: 8 },
});
```

- [ ] Commit:
```bash
git add components/BayMarker.tsx
git commit -m "feat: add animated BayMarker with color-coded pulse"
```

---

### Task 10: BayCard component

**Files:**
- Create: `components/BayCard.tsx`

- [ ] Create `components/BayCard.tsx`:
```tsx
// components/BayCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN,
  COLOR_GREEN, COLOR_RED, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED,
} from '../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';

interface Props {
  bayNumber: number;
  speedKw: number;
  status: BayStatus;
  onReserve: () => void;
}

const STATUS_COLOR: Record<BayStatus, string> = {
  available: COLOR_GREEN,
  reserved: COLOR_GOLD,
  occupied: COLOR_RED,
};

export default function BayCard({ bayNumber, speedKw, status, onReserve }: Props) {
  const speedColor = speedKw >= 350 ? COLOR_GOLD : COLOR_CYAN;
  const canReserve = status === 'available';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.bayNum}>BAY {bayNumber}</Text>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
      </View>
      <View style={[styles.speedBadge, { borderColor: speedColor }]}>
        <Text style={[styles.speedText, { color: speedColor }]}>{speedKw}kW</Text>
      </View>
      <Text style={styles.statusLabel}>{status.toUpperCase()}</Text>
      <Pressable
        style={[styles.reserveBtn, !canReserve && styles.disabledBtn]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReserve(); }}
        disabled={!canReserve}
        accessibilityLabel={`Reserve bay ${bayNumber}`}
      >
        <Text style={styles.reserveText}>RESERVE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140, backgroundColor: COLOR_CARD, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 16, marginRight: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bayNum: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  speedBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 8 },
  speedText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  statusLabel: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 2, marginBottom: 12 },
  reserveBtn: { backgroundColor: COLOR_GOLD, borderRadius: 10, height: 36, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { backgroundColor: COLOR_ELEVATED, opacity: 0.4 },
  reserveText: { color: '#050D18', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
```

- [ ] Commit:
```bash
git add components/BayCard.tsx
git commit -m "feat: add BayCard component with speed badge and reserve button"
```

---

### Task 11: Charge screen

**Files:**
- Create: `app/(drawer)/charge.tsx`

- [ ] Create `app/(drawer)/charge.tsx`:
```tsx
// app/(drawer)/charge.tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar, Pressable } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import BayMarker from '../../components/BayMarker';
import BayCard from '../../components/BayCard';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';

type BayStatus = 'available' | 'reserved' | 'occupied';
interface Bay { id: string; bay_number: number; charger_speed_kw: number; status: BayStatus; charge_pct: number; lat?: number; lng?: number; }

const STATION = { latitude: 33.5543, longitude: -82.3018 };
const DURATIONS = [{ label: '1h', hours: 1, price: 8 }, { label: '2h', hours: 2, price: 15 }, { label: '4h', hours: 4, price: 28 }, { label: '8h', hours: 8, price: 50 }];

// Spread 20 bays in a grid around the station
function bayCoord(index: number) {
  const row = Math.floor(index / 5);
  const col = index % 5;
  return { lat: STATION.latitude + (row - 1) * 0.0002, lng: STATION.longitude + (col - 2) * 0.0002 };
}

export default function Charge() {
  const insets = useSafeAreaInsets();
  const [bays, setBays] = useState<Bay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const fetchBays = async () => {
    const { data } = await supabase.from('charging_bays').select('*').order('bay_number');
    if (data) setBays(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBays();
    const channel = supabase
      .channel('charging_bays')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charging_bays' }, (payload) => {
        setBays((prev) => prev.map((b) => b.id === payload.new.id ? { ...b, ...payload.new } : b));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const openReserve = (bay: Bay) => {
    setSelectedBay(bay);
    setSelectedDuration(DURATIONS[0]);
    bottomSheetRef.current?.present();
  };

  const handleConfirm = async () => {
    if (!selectedBay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) return;
      await supabase.from('charge_bookings').insert({
        bay_id: selectedBay.id,
        duration_hours: selectedDuration.hours,
        amount_paid: selectedDuration.price,
        status: 'confirmed',
        start_time: new Date().toISOString(),
      });
    } else {
      console.log('[Expo Go] Mock reservation:', selectedBay.bay_number, selectedDuration);
    }
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Map */}
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{ ...STATION, latitudeDelta: 0.003, longitudeDelta: 0.003 }}
        >
          {bays.map((bay, i) => {
            const { lat, lng } = bayCoord(i);
            return (
              <BayMarker
                key={bay.id}
                latitude={lat}
                longitude={lng}
                status={bay.status}
                bayNumber={bay.bay_number}
              />
            );
          })}
        </MapView>

        {/* Bay list */}
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>CHARGING BAYS</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading bays...</Text>
          ) : bays.length === 0 ? (
            <Text style={styles.emptyText}>No bays found</Text>
          ) : (
            <FlatList
              data={bays}
              horizontal
              keyExtractor={(b) => b.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8 }}
              renderItem={({ item }) => (
                <BayCard
                  bayNumber={item.bay_number}
                  speedKw={item.charger_speed_kw}
                  status={item.status}
                  onReserve={() => openReserve(item)}
                />
              )}
            />
          )}
        </View>

        {/* Reserve bottom sheet */}
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['50%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>RESERVE BAY {selectedBay?.bay_number}</Text>
            <Text style={styles.sheetSub}>SELECT DURATION</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d) => (
                <Pressable
                  key={d.label}
                  style={[styles.durationPill, selectedDuration.hours === d.hours && styles.durationPillActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDuration(d); }}
                >
                  <Text style={[styles.durationText, selectedDuration.hours === d.hours && styles.durationTextActive]}>
                    {d.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.totalText}>${selectedDuration.price}.00 total</Text>
            <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>
                {Constants.appOwnership === 'expo' ? 'PAYMENT (DEV BUILD REQUIRED)' : 'CONFIRM RESERVATION'}
              </Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  map: { flex: 0.6 },
  listContainer: { flex: 0.4, backgroundColor: COLOR_NAVY, paddingTop: 12 },
  listTitle: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, paddingHorizontal: 16, marginBottom: 10 },
  loadingText: { color: COLOR_TEXT_MUTED, paddingHorizontal: 16 },
  emptyText: { color: COLOR_TEXT_MUTED, paddingHorizontal: 16 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  sheetContent: { padding: 24 },
  sheetTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2, marginBottom: 4 },
  sheetSub: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 16 },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  durationPill: { flex: 1, borderWidth: 1, borderColor: COLOR_GOLD, borderRadius: 20, height: 40, alignItems: 'center', justifyContent: 'center' },
  durationPillActive: { backgroundColor: COLOR_GOLD },
  durationText: { color: COLOR_GOLD, fontSize: 13, fontWeight: '600' },
  durationTextActive: { color: COLOR_NAVY },
  totalText: { color: COLOR_GOLD, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  confirmBtn: { backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
```

- [ ] Verify in Expo Go: map loads at correct coordinates, bay list shows (if `charging_bays` table exists), reserve button opens bottom sheet, duration pills select correctly.

- [ ] Commit:
```bash
git add "app/(drawer)/charge.tsx"
git commit -m "feat: build Charge screen with map, realtime bays, reserve sheet"
```

---

## Chunk 3: Stay Screen

### Task 12: LodgingCard component

**Files:**
- Create: `components/LodgingCard.tsx`

- [ ] Create `components/LodgingCard.tsx`:
```tsx
// components/LodgingCard.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_GREEN, COLOR_RED, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED } from '../lib/constants';

interface Props {
  name: string;
  nightlyRate: number;
  isAvailable: boolean;
  onPress: () => void;
}

export default function LodgingCard({ name, nightlyRate, isAvailable, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityLabel={`View ${name}`}>
      <View style={styles.photoPlaceholder} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <View style={[styles.dot, { backgroundColor: isAvailable ? COLOR_GREEN : COLOR_RED }]} />
        </View>
        <Text style={styles.rate}>${nightlyRate}<Text style={styles.night}>/night</Text></Text>
        <Text style={styles.status}>{isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLOR_CARD, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', flex: 1, margin: 6 },
  photoPlaceholder: { height: 120, backgroundColor: COLOR_ELEVATED },
  info: { padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '700', flex: 1, marginRight: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rate: { color: COLOR_GOLD, fontSize: 18, fontWeight: '700' },
  night: { color: COLOR_TEXT_MUTED, fontSize: 12, fontWeight: '400' },
  status: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 2, marginTop: 4 },
});
```

- [ ] Commit:
```bash
git add components/LodgingCard.tsx
git commit -m "feat: add LodgingCard component"
```

---

### Task 13: Stay grid screen

**Files:**
- Create: `app/(drawer)/stay.tsx`

- [ ] Create `app/(drawer)/stay.tsx`:
```tsx
// app/(drawer)/stay.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import LodgingCard from '../../components/LodgingCard';
import { COLOR_NAVY, COLOR_ELEVATED, COLOR_TEXT_MUTED, FONT_BEBAS } from '../../lib/constants';

interface Unit { id: string; name: string; nightly_rate: number; is_available: boolean; }

export default function Stay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('lodging_units').select('id, name, nightly_rate, is_available')
      .then(({ data }) => { if (data) setUnits(data); setLoading(false); });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Text style={styles.title}>STAY</Text>
      {loading ? (
        <View style={styles.skeletonGrid}>
          {[0,1,2,3].map((i) => <View key={i} style={styles.skeleton} />)}
        </View>
      ) : units.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyText}>No units available</Text></View>
      ) : (
        <FlatList
          data={units}
          numColumns={2}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: 10, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <LodgingCard
              name={item.name}
              nightlyRate={item.nightly_rate}
              isAvailable={item.is_available}
              onPress={() => router.push(`/stay/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: '#fff', letterSpacing: 3, paddingHorizontal: 20, marginBottom: 8 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  skeleton: { flex: 1, height: 180, margin: 6, backgroundColor: COLOR_ELEVATED, borderRadius: 20, minWidth: '45%' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 15 },
});
```

- [ ] Commit:
```bash
git add "app/(drawer)/stay.tsx"
git commit -m "feat: build Stay grid screen with lodging cards"
```

---

### Task 14: Stay detail screen

**Files:**
- Modify: `app/stay/[id].tsx`

- [ ] Replace the placeholder `app/stay/[id].tsx` with the full detail screen:
```tsx
// app/stay/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import { useSession } from '../../lib/session-context';
import { COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_BEBAS } from '../../lib/constants';

interface Unit { id: string; name: string; description: string; nightly_rate: number; is_available: boolean; }

function generateCheckinCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export default function StayDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [checkIn, setCheckIn] = useState<Date>(new Date());
  const [checkOut, setCheckOut] = useState<Date>(new Date(Date.now() + 86400000));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('lodging_units').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setUnit(data); });
  }, [id]);

  const nights = daysBetween(checkIn, checkOut);
  const total = unit ? nights * unit.nightly_rate : 0;

  const handleBook = async () => {
    if (!unit || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) { setLoading(false); return; }
    }
    const checkin_code = generateCheckinCode();
    await supabase.from('stay_bookings').insert({
      user_id: session.user.id,
      unit_id: unit.id,
      check_in: checkIn.toISOString().split('T')[0],
      check_out: checkOut.toISOString().split('T')[0],
      amount_paid: total,
      checkin_code,
      status: 'confirmed',
    });
    setLoading(false);
    Alert.alert('Booked!', `Your check-in code is ${checkin_code}`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  // Simple inline date selector — tap +/- to change day offset
  const DateSelector = ({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) => (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable onPress={() => onChange(new Date(date.getTime() - 86400000))} style={styles.dateArrow}>
        <Text style={styles.dateArrowText}>‹</Text>
      </Pressable>
      <Text style={styles.dateValue}>{date.toDateString()}</Text>
      <Pressable onPress={() => onChange(new Date(date.getTime() + 86400000))} style={styles.dateArrow}>
        <Text style={styles.dateArrowText}>›</Text>
      </Pressable>
    </View>
  );

  if (!unit) return <View style={[styles.container, { paddingTop: insets.top }]}><Text style={{ color: '#fff', padding: 24 }}>Loading...</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={styles.heroPhoto} />
        <View style={styles.body}>
          <Text style={styles.unitName}>{unit.name}</Text>
          <Text style={styles.description}>{unit.description}</Text>
          <Text style={styles.rate}>${unit.nightly_rate}<Text style={styles.perNight}>/night</Text></Text>

          <View style={styles.divider} />

          <DateSelector label="CHECK IN" date={checkIn} onChange={(d) => { if (d < checkOut) setCheckIn(d); }} />
          <DateSelector label="CHECK OUT" date={checkOut} onChange={(d) => { if (d > checkIn) setCheckOut(d); }} />

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{nights} night{nights > 1 ? 's' : ''} × ${unit.nightly_rate}</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.bookBtn, { bottom: insets.bottom + 16 }, loading && { opacity: 0.6 }]}
        onPress={handleBook}
        disabled={loading || !unit.is_available}
      >
        <Text style={styles.bookText}>
          {!unit.is_available ? 'UNAVAILABLE' : Constants.appOwnership === 'expo' ? 'BOOK (MOCK)' : 'BOOK NOW'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  backBtn: { padding: 16 },
  backText: { color: COLOR_TEXT_MUTED, fontSize: 12, letterSpacing: 1 },
  heroPhoto: { height: 240, backgroundColor: COLOR_ELEVATED, marginHorizontal: 16, borderRadius: 20, marginBottom: 20 },
  body: { paddingHorizontal: 20 },
  unitName: { fontFamily: FONT_BEBAS, fontSize: 36, color: '#fff', letterSpacing: 2 },
  description: { color: COLOR_TEXT_SECONDARY, fontSize: 14, lineHeight: 22, marginTop: 8 },
  rate: { color: COLOR_GOLD, fontSize: 28, fontWeight: '700', marginTop: 12 },
  perNight: { color: COLOR_TEXT_MUTED, fontSize: 14, fontWeight: '400' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, width: 90 },
  dateArrow: { padding: 8 },
  dateArrowText: { color: COLOR_GOLD, fontSize: 20 },
  dateValue: { color: COLOR_TEXT_PRIMARY, fontSize: 14, flex: 1, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLOR_TEXT_MUTED, fontSize: 13 },
  totalAmount: { color: COLOR_GOLD, fontSize: 24, fontWeight: '700' },
  bookBtn: { position: 'absolute', left: 20, right: 20, backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  bookText: { color: '#050D18', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
});
```

- [ ] Verify in Expo Go: tapping a lodging card navigates to detail screen, date +/- controls work, total updates, Book button shows mock text in Expo Go.

- [ ] Commit:
```bash
git add app/stay/[id].tsx
git commit -m "feat: build Stay detail screen with date picker and mock booking"
```

---

## Chunk 4: Eat Screen

### Task 15: FoodItem component

**Files:**
- Create: `components/FoodItem.tsx`

- [ ] Create `components/FoodItem.tsx`:
```tsx
// components/FoodItem.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY } from '../lib/constants';

interface Props {
  name: string;
  description: string;
  price: number;
  onAdd: () => void;
}

export default function FoodItem({ name, description, price, onAdd }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.photoPlaceholder} />
      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        <Text style={styles.price}>${price.toFixed(2)}</Text>
      </View>
      <Pressable
        style={styles.addBtn}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onAdd(); }}
        accessibilityLabel={`Add ${name} to cart`}
      >
        <Text style={styles.addText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  photoPlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLOR_ELEVATED, marginRight: 14 },
  info: { flex: 1 },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  description: { color: COLOR_TEXT_SECONDARY, fontSize: 12, lineHeight: 17, marginBottom: 4 },
  price: { color: COLOR_GOLD, fontSize: 15, fontWeight: '700' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLOR_GOLD, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  addText: { color: '#050D18', fontSize: 22, fontWeight: '700', lineHeight: 26 },
});
```

- [ ] Commit:
```bash
git add components/FoodItem.tsx
git commit -m "feat: add FoodItem component"
```

---

### Task 16: CartBadge component

**Files:**
- Create: `components/CartBadge.tsx`

- [ ] Create `components/CartBadge.tsx`:
```tsx
// components/CartBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, useEffect } from 'react-native-reanimated';
import { COLOR_GOLD, COLOR_NAVY } from '../lib/constants';

interface Props { count: number; }

export default function CartBadge({ count }: Props) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = count > 0 ? withSpring(1, { damping: 15, stiffness: 200 }) : withSpring(0, { damping: 15, stiffness: 200 });
  }, [count]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count === 0) return null;

  return (
    <Animated.View style={[styles.badge, animStyle]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { backgroundColor: COLOR_GOLD, borderRadius: 10, minWidth: 20, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLOR_NAVY, fontSize: 11, fontWeight: '700' },
});
```

- [ ] Commit:
```bash
git add components/CartBadge.tsx
git commit -m "feat: add CartBadge with spring animation"
```

---

### Task 17: Eat screen

**Files:**
- Create: `app/(drawer)/eat.tsx`

- [ ] Create `app/(drawer)/eat.tsx`:
```tsx
// app/(drawer)/eat.tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import { useCartStore } from '../../lib/cart-store';
import { useSession } from '../../lib/session-context';
import FoodItem from '../../components/FoodItem';
import CartBadge from '../../components/CartBadge';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, COLOR_TEXT_SECONDARY, FONT_BEBAS,
} from '../../lib/constants';

type Category = 'breakfast' | 'mains' | 'snacks' | 'drinks';
const CATEGORIES: Category[] = ['breakfast', 'mains', 'snacks', 'drinks'];
interface MenuItem { id: string; name: string; description: string; price: number; category: Category; }

export default function Eat() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [activeCategory, setActiveCategory] = useState<Category>('mains');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, addItem, clearCart } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const underlineX = useSharedValue(0);
  const TAB_WIDTH = 88;

  useEffect(() => {
    supabase.from('menu_items').select('*').then(({ data }) => { if (data) setMenuItems(data); setLoading(false); });
  }, []);

  const filtered = menuItems.filter((i) => i.category === activeCategory);

  const handleCategoryPress = (cat: Category, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(cat);
    underlineX.value = withTiming(idx * TAB_WIDTH, { duration: 200 });
  };

  const underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));

  const handleCheckout = async () => {
    if (!session || items.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) return;
      await supabase.from('orders').insert({ user_id: session.user.id, items, total, status: 'pending' });
    } else {
      Alert.alert('Order placed (mock)', 'Your food order has been placed!');
    }
    clearCart();
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EAT</Text>
          <Pressable onPress={() => bottomSheetRef.current?.present()} style={styles.cartBtn}>
            <Text style={styles.cartIcon}>🛒</Text>
            <CartBadge count={cartCount} />
          </Pressable>
        </View>

        {/* Category tabs */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {CATEGORIES.map((cat, idx) => (
                <Pressable key={cat} style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleCategoryPress(cat, idx)}>
                  <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
              <Animated.View style={[styles.underline, underlineStyle, { width: TAB_WIDTH }]} />
            </View>
          </ScrollView>
        </View>

        {/* Menu items */}
        {loading ? (
          <View style={styles.skeletonList}>
            {[0,1,2,3].map((i) => <View key={i} style={styles.skeleton} />)}
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Menu coming soon</Text></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            renderItem={({ item }) => (
              <FoodItem
                name={item.name}
                description={item.description}
                price={item.price}
                onAdd={() => addItem({ id: item.id, name: item.name, price: item.price })}
              />
            )}
          />
        )}

        {/* Checkout bottom sheet */}
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['60%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <BottomSheetView style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>YOUR ORDER</Text>
          </BottomSheetView>
          <BottomSheetFlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            renderItem={({ item }) => (
              <View style={styles.orderRow}>
                <Text style={styles.orderQty}>{item.qty}×</Text>
                <Text style={styles.orderName}>{item.name}</Text>
                <Text style={styles.orderPrice}>${(item.price * item.qty).toFixed(2)}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
              </View>
            }
          />
          <View style={[styles.checkoutBtnWrapper, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>PLACE ORDER</Text>
            </Pressable>
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: '#fff', letterSpacing: 3 },
  cartBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartIcon: { fontSize: 22 },
  tabBar: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },
  tabs: { flexDirection: 'row', position: 'relative' },
  tab: { height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1.5 },
  tabTextActive: { color: COLOR_GOLD },
  underline: { position: 'absolute', bottom: 0, height: 2, backgroundColor: COLOR_GOLD, borderRadius: 1 },
  skeletonList: { padding: 16, gap: 12 },
  skeleton: { height: 72, backgroundColor: COLOR_ELEVATED, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 15 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  sheetHeader: { padding: 20, paddingBottom: 8 },
  sheetTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  orderQty: { color: COLOR_TEXT_MUTED, fontSize: 13, width: 28 },
  orderName: { flex: 1, color: COLOR_TEXT_PRIMARY, fontSize: 14 },
  orderPrice: { color: COLOR_GOLD, fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, marginTop: 8 },
  totalLabel: { color: COLOR_TEXT_MUTED, fontSize: 12, letterSpacing: 2 },
  totalAmount: { color: COLOR_GOLD, fontSize: 22, fontWeight: '700' },
  checkoutBtnWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: COLOR_ELEVATED },
  checkoutBtn: { backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  checkoutText: { color: '#050D18', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
});
```

- [ ] Verify in Expo Go: category tabs animate underline, food items load, add button increments cart badge, cart sheet shows order summary.

- [ ] Commit:
```bash
git add "app/(drawer)/eat.tsx"
git commit -m "feat: build Eat screen with menu, cart, animated tabs, checkout sheet"
```

---

## Chunk 5: Rewards + Profile Screens

### Task 18: RewardItem component

**Files:**
- Create: `components/RewardItem.tsx`

- [ ] Create `components/RewardItem.tsx`:
```tsx
// components/RewardItem.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLOR_CARD, COLOR_GOLD, COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED } from '../lib/constants';

interface Props {
  label: string;
  cost: number;
  accentColor: string;
  canRedeem: boolean;
  onRedeem: () => void;
}

export default function RewardItem({ label, cost, accentColor, canRedeem, onRedeem }: Props) {
  return (
    <View style={[styles.card, { borderColor: accentColor + '40' }]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.info}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.cost, { color: accentColor }]}>{cost.toLocaleString()} pts</Text>
      </View>
      <Pressable
        style={[styles.redeemBtn, { backgroundColor: accentColor }, !canRedeem && styles.disabled]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onRedeem(); }}
        disabled={!canRedeem}
      >
        <Text style={styles.redeemText}>REDEEM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLOR_CARD, borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  accent: { width: 4, alignSelf: 'stretch' },
  info: { flex: 1, padding: 16 },
  label: { color: COLOR_TEXT_PRIMARY, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  cost: { fontSize: 13, fontWeight: '600' },
  redeemBtn: { margin: 12, paddingHorizontal: 16, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  redeemText: { color: '#050D18', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});
```

- [ ] Commit:
```bash
git add components/RewardItem.tsx
git commit -m "feat: add RewardItem component"
```

---

### Task 19: Rewards screen

**Files:**
- Create: `app/(drawer)/rewards.tsx`

- [ ] Create `app/(drawer)/rewards.tsx`:
```tsx
// app/(drawer)/rewards.tsx
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Alert, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../lib/session-context';
import { supabase } from '../../lib/supabase';
import RewardItem from '../../components/RewardItem';
import { COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN, COLOR_PURPLE, COLOR_RED, COLOR_TEXT_MUTED, COLOR_TEXT_PRIMARY, FONT_BEBAS } from '../../lib/constants';

interface Transaction { id: string; delta: number; reason: string; created_at: string; }

const CATALOG = [
  { id: 'charge', label: 'Free Charge Session', cost: 500, color: COLOR_CYAN },
  { id: 'meal',   label: 'Free Meal',            cost: 750, color: COLOR_GOLD },
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
            {[0,1,2].map((i) => <View key={i} style={styles.skeletonRow} />)}
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
```

- [ ] Verify in Expo Go: balance shows (or skeleton), catalog renders with 3 items, redeem button disabled if balance < cost, alert confirms before redeeming.

- [ ] Commit:
```bash
git add "app/(drawer)/rewards.tsx" components/RewardItem.tsx
git commit -m "feat: build Rewards screen with balance, catalog, transaction history"
```

---

### Task 20: Profile screen

**Files:**
- Create: `app/(drawer)/profile.tsx`

- [ ] Create `app/(drawer)/profile.tsx`:
```tsx
// app/(drawer)/profile.tsx
import { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session-context';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
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
      ].filter((b) => isUpcoming ? b.date >= now.slice(0,10) : b.date < now.slice(0,10))
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
          {[0,1,2].map((i) => <View key={i} style={styles.skeletonRow} />)}
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
```

- [ ] Verify in Expo Go: profile header shows initials + name + email, tabs animate underline, sign out navigates to login.

- [ ] Commit:
```bash
git add "app/(drawer)/profile.tsx"
git commit -m "feat: build Profile screen with tabs, bookings list, sign out"
```

---

## Chunk 6: Push Notifications (Supabase Edge Functions)

### Task 21: Supabase database setup

- [ ] In the Supabase dashboard SQL editor, create the `redeem_points` database function:
```sql
CREATE OR REPLACE FUNCTION redeem_points(uid uuid, cost int, reward text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE user_profiles SET points_balance = points_balance - cost
  WHERE id = uid AND points_balance >= cost;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points'; END IF;
  INSERT INTO redemptions (user_id, reward_type, points_cost) VALUES (uid, reward, cost);
  INSERT INTO points_transactions (user_id, delta, reason) VALUES (uid, -cost, 'Redeemed: ' || reward);
END;
$$;
```

- [ ] Seed `charging_bays` table with 20 rows (run in SQL editor):
```sql
INSERT INTO charging_bays (bay_number, charger_speed_kw, status, charge_pct)
SELECT
  n,
  CASE WHEN n % 3 = 0 THEN 350 ELSE 150 END,
  (ARRAY['available','reserved','occupied'])[floor(random()*3+1)],
  floor(random()*100)::int
FROM generate_series(1, 20) AS n;
```

- [ ] Commit a note:
```bash
git commit --allow-empty -m "chore: note — charging_bays and redeem_points must be seeded in Supabase dashboard"
```

---

### Task 22: Edge Functions

**Files:**
- Create: `supabase/functions/notify-food-ready/index.ts`
- Create: `supabase/functions/notify-charge-80/index.ts`
- Create: `supabase/functions/notify-stay-confirmed/index.ts`

- [ ] Create `supabase/functions/notify-food-ready/index.ts`:
```ts
// supabase/functions/notify-food-ready/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (record.status !== 'ready') return new Response('skip', { status: 200 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await supabase.from('user_profiles').select('onesignal_player_id').eq('id', record.user_id).single();
  if (!profile?.onesignal_player_id) return new Response('no player id', { status: 200 });

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [profile.onesignal_player_id],
      contents: { en: 'Your food order is ready for pickup!' },
      headings: { en: 'Zapp — Order Ready' },
    }),
  });

  return new Response('ok', { status: 200 });
});
```

- [ ] Create `supabase/functions/notify-charge-80/index.ts`:
```ts
// supabase/functions/notify-charge-80/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

Deno.serve(async (req) => {
  const { record, old_record } = await req.json();
  if (record.charge_pct < 80 || (old_record?.charge_pct ?? 0) >= 80) return new Response('skip', { status: 200 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: booking } = await supabase.from('charge_bookings').select('user_id').eq('bay_id', record.id).eq('status', 'confirmed').order('start_time', { ascending: false }).limit(1).single();
  if (!booking) return new Response('no booking', { status: 200 });

  const { data: profile } = await supabase.from('user_profiles').select('onesignal_player_id').eq('id', booking.user_id).single();
  if (!profile?.onesignal_player_id) return new Response('no player id', { status: 200 });

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [profile.onesignal_player_id],
      contents: { en: 'Your EV is at 80% — almost done!' },
      headings: { en: 'Zapp — Charging Update' },
    }),
  });

  return new Response('ok', { status: 200 });
});
```

- [ ] Create `supabase/functions/notify-stay-confirmed/index.ts`:
```ts
// supabase/functions/notify-stay-confirmed/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

Deno.serve(async (req) => {
  const { record } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await supabase.from('user_profiles').select('onesignal_player_id').eq('id', record.user_id).single();
  if (!profile?.onesignal_player_id) return new Response('no player id', { status: 200 });

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [profile.onesignal_player_id],
      contents: { en: `Your check-in code is ${record.checkin_code}` },
      headings: { en: 'Zapp — Booking Confirmed' },
    }),
  });

  return new Response('ok', { status: 200 });
});
```

- [ ] Deploy all three Edge Functions:
```bash
npx supabase functions deploy notify-food-ready
npx supabase functions deploy notify-charge-80
npx supabase functions deploy notify-stay-confirmed
```

- [ ] In Supabase dashboard → Database → Webhooks, create three webhooks pointing to the deployed function URLs:
  - `orders` table — `UPDATE` event → `notify-food-ready`
  - `charging_bays` table — `UPDATE` event → `notify-charge-80`
  - `stay_bookings` table — `INSERT` event → `notify-stay-confirmed`

- [ ] Set Edge Function secrets in Supabase dashboard:
  - `ONESIGNAL_APP_ID` — from `.env`
  - `ONESIGNAL_REST_API_KEY` — from OneSignal dashboard → Settings → Keys & IDs

- [ ] Commit:
```bash
git add supabase/
git commit -m "feat: add Supabase Edge Functions for OneSignal push notifications"
```
