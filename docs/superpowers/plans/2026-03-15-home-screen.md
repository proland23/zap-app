# Home Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the ZAP app home screen — a deep navy background with a gold greeting and a 3D glassmorphism snap carousel of six service cards.

**Architecture:** Migrate the blank Expo scaffold to expo-router file-based routing, wire a Supabase session context through the root layout, build a `SnapCarousel` backed by `Animated.FlatList` + Reanimated 3 scroll interpolation, and style each `ServiceCard` as a frosted-glass animated panel with iOS shadow and Android border-color gold glow.

**Tech Stack:** Expo SDK 55, expo-router, React Native Reanimated 3, expo-blur, expo-haptics, @supabase/supabase-js, @expo-google-fonts/bebas-neue, react-native-safe-area-context

---

## Chunk 1: Foundation — Constants, Supabase, Session Context

### Task 1: Install remaining dependencies

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install font and blur packages**

```bash
cd C:/Users/prola/zap-app
npx expo install @expo-google-fonts/bebas-neue expo-font expo-blur expo-splash-screen react-native-safe-area-context
```

Expected: packages added, no errors.

- [ ] **Step 2: Verify installed**

```bash
cat package.json | grep -E "bebas|expo-blur|expo-splash|safe-area"
```

Expected: all four packages appear in dependencies.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install font, blur, splash-screen, safe-area deps"
```

---

### Task 2: app.json — add expo-router scheme and plugin

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Read current app.json**

```bash
cat app.json
```

- [ ] **Step 2: Add scheme and plugin**

Open `app.json` and add `"scheme": "zapapp"` and `"expo-router"` to the plugins array inside the `"expo"` object. Result:

```json
{
  "expo": {
    "name": "zap-app",
    "slug": "zap-app",
    "version": "1.0.0",
    "scheme": "zapapp",
    "plugins": ["expo-router"],
    ...
  }
}
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (json changes don't affect TS, but confirms baseline is clean).

- [ ] **Step 4: Commit**

```bash
git add app.json
git commit -m "chore: add expo-router scheme and plugin to app.json"
```

---

### Task 3: Entry point — set expo-router as main

**Files:**
- Modify: `package.json`
- Modify: `App.tsx`

- [ ] **Step 1: Update package.json main field**

In `package.json`, change `"main"` from `"index.ts"` (or whatever it currently is) to:

```json
"main": "expo-router/entry"
```

- [ ] **Step 2: Empty App.tsx**

Replace the contents of `App.tsx` with:

```ts
// Entry point delegated to expo-router/entry via package.json "main" field.
export {};
```

- [ ] **Step 3: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json App.tsx
git commit -m "chore: delegate entry point to expo-router"
```

---

### Task 4: Shared constants

**Files:**
- Create: `lib/constants.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/constants.ts
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 380;
export const CARD_GAP = 20;
// SNAP_INTERVAL must equal CARD_WIDTH + CARD_GAP. Update both if dimensions change.
export const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP; // 300

// Font key must match the key used in useFonts({}) in _layout.tsx
export const FONT_BEBAS = 'BebasNeue';

export const COLOR_NAVY = '#050D18';
export const COLOR_GOLD = '#FFD700';
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/constants.ts
git commit -m "feat: add shared layout constants and color tokens"
```

---

### Task 5: Supabase client

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local` (gitignored placeholder)

- [ ] **Step 1: Ensure .env.local is gitignored**

Check `.gitignore` for `.env.local`. If missing, add it:

```
.env.local
```

- [ ] **Step 2: Create .env.local placeholder**

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: Create the Supabase client**

```ts
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 4: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase.ts .gitignore
git commit -m "feat: add Supabase client (env-var driven)"
```

---

### Task 6: Session context

**Files:**
- Create: `lib/session-context.tsx`

- [ ] **Step 1: Create session-context.tsx**

```tsx
// lib/session-context.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: if onAuthStateChange never fires (no network, no stored token),
    // unblock loading after 5s so the splash screen is not stuck forever.
    const timeout = setTimeout(() => setLoading(false), 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(timeout);
      setSession(session);
      setLoading(false);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/session-context.tsx
git commit -m "feat: add SessionProvider and useSession hook"
```

---

## Chunk 2: Routing — Layout, Index Redirect, Stub Screens

### Task 7: Root layout

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1: Create _layout.tsx**

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession } from '../lib/session-context';
import { FONT_BEBAS } from '../lib/constants';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    [FONT_BEBAS]: BebasNeue_400Regular,
  });

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <AppShell fontsReady={fontsLoaded || !!fontError} />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { loading: sessionLoading } = useSession();

  // Hide splash only when both fonts AND session state are resolved.
  useEffect(() => {
    if (fontsReady && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, sessionLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add root layout with font loading, SafeAreaProvider, SessionProvider"
```

---

### Task 8: Index redirect

**Files:**
- Create: `app/index.tsx`

- [ ] **Step 1: Create index.tsx**

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';
import { useSession } from '../lib/session-context';

export default function Index() {
  const { session, loading } = useSession();

  // Splash screen covers the null return while session state is being resolved.
  if (loading) return null;
  if (session) return <Redirect href="/home" />;
  return <Redirect href="/login" />;
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/index.tsx
git commit -m "feat: add index auth redirect"
```

---

### Task 9: Stub screens

**Files:**
- Create: `app/login.tsx`
- Create: `app/charge.tsx`
- Create: `app/stay.tsx`
- Create: `app/eat.tsx`
- Create: `app/shop.tsx`

- [ ] **Step 1: Create login.tsx**

```tsx
// app/login.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_GOLD, COLOR_NAVY, FONT_BEBAS } from '../lib/constants';

export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 24 },
});
```

- [ ] **Step 2: Create charge.tsx**

```tsx
// app/charge.tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';

export default function Charge() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Charge coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
```

- [ ] **Step 3: Create stay.tsx, eat.tsx, shop.tsx**

Create each file with the same pattern as `charge.tsx`, replacing `"Charge"` with `"Stay"`, `"Eat"`, `"Shop"` respectively. Full content for each:

`app/stay.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';
export default function Stay() {
  return <View style={styles.container}><Text style={styles.text}>Stay coming soon</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
```

`app/eat.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';
export default function Eat() {
  return <View style={styles.container}><Text style={styles.text}>Eat coming soon</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
```

`app/shop.tsx`:
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { COLOR_NAVY } from '../lib/constants';
export default function Shop() {
  return <View style={styles.container}><Text style={styles.text}>Shop coming soon</Text></View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});
```

- [ ] **Step 4: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke test in Expo Go**

```bash
npx expo start
```

Scan QR in Expo Go. Expected:
- App launches, splash disappears.
- With empty Supabase env vars → redirects to `/login` → shows "Login coming soon" in gold Bebas Neue on navy background.
- No red error screen.

- [ ] **Step 6: Commit**

```bash
git add app/login.tsx app/charge.tsx app/stay.tsx app/eat.tsx app/shop.tsx
git commit -m "feat: add login and service stub screens"
```

---

## Chunk 3: Components — ServiceCard and SnapCarousel

### Task 10: CardData type and card data array

**Files:**
- Create: `lib/card-data.ts`

- [ ] **Step 1: Create card-data.ts**

```ts
// lib/card-data.ts
export interface CardData {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  comingSoon: boolean;
  route?: string;
}

export const CARDS: CardData[] = [
  { id: 'charge', title: 'Charge', emoji: '⚡', subtitle: 'Find a charger near you',  comingSoon: false, route: '/charge' },
  { id: 'stay',   title: 'Stay',   emoji: '🏠', subtitle: 'Book EV-friendly stays',    comingSoon: false, route: '/stay'   },
  { id: 'eat',    title: 'Eat',    emoji: '🍽', subtitle: 'Dine while you charge',     comingSoon: false, route: '/eat'    },
  { id: 'shop',   title: 'Shop',   emoji: '🛒', subtitle: 'Shop nearby',               comingSoon: false, route: '/shop'   },
  { id: 'ride',   title: 'Ride',   emoji: '🚗', subtitle: 'EV rides on demand',        comingSoon: true                   },
  { id: 'fly',    title: 'Fly',    emoji: '✈',  subtitle: 'Electric air travel',       comingSoon: true                   },
];
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/card-data.ts
git commit -m "feat: add CardData type and card data array"
```

---

### Task 11: ServiceCard component

**Files:**
- Create: `components/ServiceCard.tsx`

- [ ] **Step 1: Create ServiceCard.tsx**

```tsx
// components/ServiceCard.tsx
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { CardData } from '../lib/card-data';
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  CARD_GAP,
  SNAP_INTERVAL,
  FONT_BEBAS,
  COLOR_GOLD,
} from '../lib/constants';

interface ServiceCardProps {
  item: CardData;
  index: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}

export default function ServiceCard({ item, index, scrollX, onPress }: ServiceCardProps) {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  // Outer wrapper: scale, rotateY, opacity, iOS shadow. NO overflow:hidden (would clip shadow).
  const outerStyle = useAnimatedStyle(() => {
    const scale        = interpolate(scrollX.value, inputRange, [0.88, 1.1, 0.88],  Extrapolation.CLAMP);
    const opacity      = interpolate(scrollX.value, inputRange, [0.5,  1.0,  0.5 ], Extrapolation.CLAMP);
    // rotateY: card right-of-center → -8deg (left edge toward viewer, card faces left = toward center)
    //          card left-of-center  → +8deg (right edge toward viewer, card faces right = toward center)
    const rotateYDeg   = interpolate(scrollX.value, inputRange, [-8,   0,    8   ], Extrapolation.CLAMP);
    const shadowRadius = interpolate(scrollX.value, inputRange, [0,    20,   0   ], Extrapolation.CLAMP);
    const shadowOpacity= interpolate(scrollX.value, inputRange, [0,    0.8,  0   ], Extrapolation.CLAMP);
    const elevation    = interpolate(scrollX.value, inputRange, [0,    20,   0   ], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { scale },
        { rotateY: `${rotateYDeg}deg` },
      ],
      // iOS gold glow
      shadowColor:   COLOR_GOLD,
      shadowOffset:  { width: 0, height: 0 },
      shadowRadius,
      shadowOpacity,
      // Android elevation (grey shadow; gold effect via borderColor below)
      elevation,
    };
  });

  // Inner container: animated borderColor for Android gold glow (also applies on iOS).
  const innerStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      scrollX.value,
      inputRange,
      ['rgba(255,255,255,0.15)', COLOR_GOLD, 'rgba(255,255,255,0.15)'],
    );
    return { borderColor };
  });

  return (
    <Pressable onPress={onPress}>
      {/* Outer wrapper: receives shadow + transforms. No overflow:hidden. */}
      <Animated.View style={[styles.outer, outerStyle]}>
        {/* Inner container: overflow:hidden clips BlurView to rounded corners. */}
        <Animated.View style={[styles.inner, innerStyle]}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.content}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>

            {item.comingSoon && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>COMING SOON</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginRight: CARD_GAP,
    // No overflow:hidden here — required for iOS shadow to render.
  },
  inner: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  content: {
    flex: 1,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontFamily: FONT_BEBAS,
    fontSize: 32,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: COLOR_GOLD,
    fontSize: 11,
  },
});
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ServiceCard.tsx
git commit -m "feat: add ServiceCard glassmorphism component with Reanimated 3 animations"
```

---

### Task 12: SnapCarousel component

**Files:**
- Create: `components/SnapCarousel.tsx`

- [ ] **Step 1: Create SnapCarousel.tsx**

```tsx
// components/SnapCarousel.tsx
import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CARD_WIDTH, SNAP_INTERVAL } from '../lib/constants';
import { CARDS, CardData } from '../lib/card-data';
import ServiceCard from './ServiceCard';

// Create the animated FlatList. Generic is typed on the variable (not the call)
// to avoid JSX parse errors in .tsx files.
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList,
) as React.ComponentType<React.ComponentProps<typeof FlatList<CardData>>>;

interface SnapCarouselProps {
  onComingSoon: (title: string) => void;
}

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export default function SnapCarousel({ onComingSoon }: SnapCarouselProps) {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useSharedValue(0);

  const handler = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  const activeIndex = useDerivedValue(() =>
    Math.round(scrollX.value / SNAP_INTERVAL),
  );

  useAnimatedReaction(
    () => activeIndex.value,
    (current, previous) => {
      if (previous !== null && current !== previous) {
        runOnJS(triggerHaptic)();
      }
    },
  );

  return (
    <AnimatedFlatList
      data={CARDS}
      horizontal
      keyExtractor={(item) => item.id}
      snapToInterval={SNAP_INTERVAL}
      snapToAlignment="start"
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={handler}
      getItemLayout={(_data, index) => ({
        length: SNAP_INTERVAL,
        offset: SNAP_INTERVAL * index,
        index,
      })}
      contentContainerStyle={{
        paddingHorizontal: (screenWidth - CARD_WIDTH) / 2,
      }}
      renderItem={({ item, index }) => (
        <ServiceCard
          item={item}
          index={index}
          scrollX={scrollX}
          onPress={
            item.comingSoon
              ? () => onComingSoon(item.title)
              : () => router.push(item.route! as never)
          }
        />
      )}
    />
  );
}
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/SnapCarousel.tsx
git commit -m "feat: add SnapCarousel with Reanimated 3 scroll handler and haptics"
```

---

## Chunk 4: Home Screen

### Task 13: Home screen

**Files:**
- Create: `app/home.tsx`

- [ ] **Step 1: Create home.tsx**

```tsx
// app/home.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../lib/session-context';
import SnapCarousel from '../components/SnapCarousel';
import { COLOR_NAVY, COLOR_GOLD, FONT_BEBAS } from '../lib/constants';

export default function Home() {
  const { session, loading } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [comingSoonTitle, setComingSoonTitle]     = useState('');

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  // Show blank navy while session resolves (splash covers initial load;
  // this handles the edge case where home.tsx is revisited without a session).
  if (loading || !session) {
    return <View style={styles.container} />;
  }

  // || (not ??) is intentional — catches null, undefined, and empty string
  const displayName: string =
    (session.user?.user_metadata?.full_name as string | undefined) || 'there';

  const handleComingSoon = (title: string) => {
    setComingSoonTitle(title);
    setComingSoonVisible(true);
  };

  const dismiss = () => setComingSoonVisible(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Greeting */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{displayName}</Text>
      </View>

      {/* Carousel */}
      <View style={styles.carouselWrapper}>
        <SnapCarousel onComingSoon={handleComingSoon} />
      </View>

      {/* Coming Soon modal */}
      <Modal visible={comingSoonVisible} transparent animationType="fade">
        {/* Outer pressable = backdrop — tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={dismiss}>
          {/*
            Inner Pressable with empty onPress consumes the touch,
            preventing it from bubbling to the backdrop dismiss handler.
            Reliable on both iOS and Android.
          */}
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {comingSoonTitle} is coming soon!
            </Text>
            <Text style={styles.modalSubtext}>
              We're working hard to bring this to you.
            </Text>
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
  container: {
    flex: 1,
    backgroundColor: COLOR_NAVY,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  greeting: {
    color: '#fff',
    fontSize: 16,
  },
  name: {
    color: COLOR_GOLD,
    fontFamily: FONT_BEBAS,
    fontSize: 42,
  },
  carouselWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: COLOR_NAVY,
    borderWidth: 1,
    borderColor: COLOR_GOLD,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 32,
    alignItems: 'center',
  },
  modalTitle: {
    color: COLOR_GOLD,
    fontFamily: FONT_BEBAS,
    fontSize: 28,
    textAlign: 'center',
  },
  modalSubtext: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  gotItButton: {
    backgroundColor: COLOR_GOLD,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  gotItText: {
    color: COLOR_NAVY,
    fontWeight: 'bold',
  },
});
```

- [ ] **Step 2: Verify TS compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/home.tsx
git commit -m "feat: add home screen with greeting, carousel, and coming-soon modal"
```

---

### Task 14: Full visual smoke test

- [ ] **Step 1: Start Expo dev server**

```bash
npx expo start
```

- [ ] **Step 2: Test auth redirect (no Supabase creds)**

Open in Expo Go. Expected: app loads, splash disappears, lands on `/login` showing "Login coming soon" in gold Bebas Neue.

- [ ] **Step 3: Force navigate to /home to test the carousel**

Temporarily edit `app/index.tsx` to always redirect to `/home` (remove the session check), save, reload. Expected:
- Navy background fills screen.
- "Welcome back, there" greeting visible (no real session → fallback name).
- Greeting line 1 is white, line 2 is gold Bebas Neue.
- Carousel shows 6 cards. Card 0 (Charge ⚡) is centered and scaled up.
- Adjacent cards are smaller and visible peeking in from the sides.

- [ ] **Step 4: Test carousel interactions**

Swipe left/right. Expected:
- Snaps cleanly to each card.
- Centered card is larger (1.1x), gold glow visible (on iOS: shadow; on Android: border turns gold).
- Off-center cards have slight rotateY perspective tilt.
- Haptic feedback on each snap (physical device only).

- [ ] **Step 5: Test Coming Soon cards**

Swipe to Ride (🚗) or Fly (✈) and tap. Expected:
- Coming Soon modal appears with "Ride is coming soon!" or "Fly is coming soon!".
- Tap backdrop → modal dismisses.
- Tap "Got it" → modal dismisses.
- Tapping inside the modal card content does NOT dismiss.

- [ ] **Step 6: Test active card navigation**

Tap Charge (⚡). Expected: navigates to `/charge` stub screen showing "Charge coming soon". Press back. Repeat for Stay, Eat, Shop.

- [ ] **Step 7: Restore index.tsx**

Revert `app/index.tsx` to its original auth-checking version.

- [ ] **Step 8: Final commit**

```bash
git add app/index.tsx
git commit -m "test: restore index.tsx after manual smoke testing"
```

---

### Task 15: Final cleanup commit

- [ ] **Step 1: Run TS type check one last time**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Verify no console warnings or leftover debug code**

Review `app/home.tsx`, `components/SnapCarousel.tsx`, `components/ServiceCard.tsx` for any `console.log` or debug statements. Remove if found.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete ZAP home screen — carousel, glassmorphism cards, routing"
```
