# ZAP App Home Screen — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

Build the ZAP app home screen from a fresh Expo blank-TypeScript scaffold. The screen features a deep navy background, a personalized gold greeting, and a 3D perspective snap carousel of six service cards with glassmorphism styling. The project migrates from `App.tsx` to a full expo-router file-based routing structure.

---

## 1. Project Structure & Routing

```
zap-app/
├── app.json
├── package.json             # "main": "expo-router/entry"
├── app/
│   ├── _layout.tsx          # Root layout: fonts, SafeAreaProvider, SessionProvider, Stack
│   ├── index.tsx            # Auth redirect (handles loading state)
│   ├── home.tsx             # Home screen: greeting + carousel + Coming Soon modal
│   ├── login.tsx            # Stub: navy bg, centered gold Bebas Neue "Login coming soon"
│   ├── charge.tsx           # Stub: navy bg, centered white "Charge coming soon"
│   ├── stay.tsx             # Stub: navy bg, centered white "Stay coming soon"
│   ├── eat.tsx              # Stub: navy bg, centered white "Eat coming soon"
│   └── shop.tsx             # Stub: navy bg, centered white "Shop coming soon"
├── components/
│   ├── ServiceCard.tsx      # Single glassmorphism card
│   └── SnapCarousel.tsx     # AnimatedFlatList carousel with Reanimated 3
└── lib/
    ├── constants.ts         # Shared layout constants and color tokens
    ├── supabase.ts          # Supabase client init
    └── session-context.tsx  # SessionProvider + useSession hook
```

**Entry point migration:** delete/empty `App.tsx`, set `"main": "expo-router/entry"` in `package.json`.

---

## 2. Dependencies to Install

- `@expo-google-fonts/bebas-neue`
- `expo-font`
- `expo-blur`
- `expo-splash-screen`
- `react-native-safe-area-context`

---

## 3. app.json Changes

```json
{
  "expo": {
    "scheme": "zapapp",
    "plugins": ["expo-router"]
  }
}
```

---

## 4. Shared Constants (`lib/constants.ts`)

```ts
export const CARD_WIDTH = 280;
export const CARD_HEIGHT = 380;
export const CARD_GAP = 20;
// SNAP_INTERVAL must equal CARD_WIDTH + CARD_GAP. Update both if dimensions change.
export const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP; // 300

export const FONT_BEBAS = 'BebasNeue'; // must match the key used in useFonts({})
export const COLOR_NAVY = '#050D18';
export const COLOR_GOLD = '#FFD700';
```

All screens and components import from this file.

---

## 5. Supabase Client (`lib/supabase.ts`)

```ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Env vars set in `.env.local`. If missing → no session → redirect to `/login`.

---

## 6. Session Context (`lib/session-context.tsx`)

```ts
interface SessionContextValue {
  session: Session | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({ session: null, loading: true });

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
```

`SessionProvider` — uses `onAuthStateChange` as the primary trigger (fires immediately with the current session, avoiding the `getSession` + subscription race). A 5-second timeout ensures `loading` is resolved even when there is no network and no stored session:

```ts
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: if onAuthStateChange never fires (no network, no token),
    // stop loading after 5s so the splash screen is not stuck forever.
    const timeout = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

---

## 7. Root Layout (`app/_layout.tsx`)

`_layout.tsx` renders `<SessionProvider>` wrapping an inner `<AppShell>` component. `<AppShell>` calls `useSession()` — this split is required because `_layout.tsx` cannot call `useSession()` before `SessionProvider` is in the tree.

```tsx
SplashScreen.preventAutoHideAsync(); // module level

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ [FONT_BEBAS]: BebasNeue_400Regular });

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

  // Splash hides only when BOTH fonts and session state are resolved.
  // Until then, the splash screen covers any blank frames.
  useEffect(() => {
    if (fontsReady && !sessionLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsReady, sessionLoading]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

**Nesting:** `<SafeAreaProvider>` → `<SessionProvider>` → `<AppShell>` → `<Stack>`

---

## 8. Auth Redirect (`app/index.tsx`)

```ts
const { session, loading } = useSession();
// Splash covers the null return while loading — no blank flash.
if (loading) return null;
if (session) return <Redirect href="/home" />;
return <Redirect href="/login" />;
```

---

## 9. Home Screen (`app/home.tsx`)

```ts
const { session, loading } = useSession();
const router = useRouter();

// Must be inside useEffect — never call router in render body
useEffect(() => {
  if (!loading && !session) {
    router.replace('/login');
  }
}, [loading, session]);

if (loading || !session) {
  return <View style={{ flex: 1, backgroundColor: COLOR_NAVY }} />;
}

// || (not ??) is intentional: catches null, undefined, and empty string ""
const displayName = session.user?.user_metadata?.full_name || 'there';
```

Render once session is confirmed: greeting header + `<SnapCarousel>` + Coming Soon `<Modal>`.

---

## 10. Carousel (`components/SnapCarousel.tsx`)

### AnimatedFlatList

```ts
// FlatList from react-native, Animated from react-native-reanimated.
// Generic on the variable (not on the call) to avoid JSX parse error in .tsx files:
import { FlatList } from 'react-native';
import Animated from 'react-native-reanimated';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as React.ComponentType<
  React.ComponentProps<typeof FlatList<CardData>>
>;
```

### Gap Implementation

Each `ServiceCard`'s outer `Animated.View` has `marginRight: CARD_GAP` (20px). This makes each item occupy `CARD_WIDTH + CARD_GAP = SNAP_INTERVAL` of content space. `getItemLayout.length` is therefore `SNAP_INTERVAL`.

### Scroll Handler

```ts
const scrollX = useSharedValue(0);
const handler = useAnimatedScrollHandler((e) => {
  scrollX.value = e.contentOffset.x;
});
```

### Content Padding & Snap Math

```
contentContainerStyle: { paddingHorizontal: (screenWidth - CARD_WIDTH) / 2 }
```

At `scrollX = 0`: card 0 center = padding + CARD_WIDTH/2 = (screenWidth-CARD_WIDTH)/2 + CARD_WIDTH/2 = screenWidth/2 ✓

At `scrollX = SNAP_INTERVAL * n`: card n center = padding + n*SNAP_INTERVAL + CARD_WIDTH/2 = scrollX + screenWidth/2 ✓

`snapToAlignment="start"` is correct here: snap positions 0, 300, 600, … align each item's left edge with the content origin, which with symmetric padding places each card's center at screenWidth/2.

### FlatList Config

```ts
horizontal={true}
snapToInterval={SNAP_INTERVAL}
snapToAlignment="start"
decelerationRate="fast"
showsHorizontalScrollIndicator={false}
scrollEventThrottle={16}
onScroll={handler}
keyExtractor={(item) => item.id}
getItemLayout={(_data, index) => ({
  length: SNAP_INTERVAL,   // CARD_WIDTH + CARD_GAP (marginRight on each item)
  offset: SNAP_INTERVAL * index,
  index,
})}
contentContainerStyle={{ paddingHorizontal: (screenWidth - CARD_WIDTH) / 2 }}
renderItem={({ item, index }) => (
  <ServiceCard
    item={item}
    index={index}
    scrollX={scrollX}
    onPress={
      item.comingSoon
        ? () => props.onComingSoon(item.title)
        : () => router.push(item.route!)
    }
  />
)}
```

`screenWidth` from `useWindowDimensions().width`.

### Active Index & Haptics

```ts
const activeIndex = useDerivedValue(() => Math.round(scrollX.value / SNAP_INTERVAL));

function triggerHaptic() {
  Haptics.impactAsync(ImpactFeedbackStyle.Light);
}

useAnimatedReaction(
  () => activeIndex.value,
  (current, previous) => {
    if (previous !== null && current !== previous) {
      runOnJS(triggerHaptic)();
    }
  }
);
```

---

## 11. Component Interfaces

```ts
interface CardData {
  id: string;
  title: string;
  emoji: string;
  subtitle: string;
  comingSoon: boolean;
  route?: string;
}

interface ServiceCardProps {
  item: CardData;
  index: number;
  scrollX: SharedValue<number>;
  onPress: () => void;
}

interface SnapCarouselProps {
  onComingSoon: (title: string) => void;
}
```

---

## 12. Card Data

| Index | id | Title | Emoji | Subtitle | comingSoon | route |
|---|---|---|---|---|---|---|
| 0 | charge | Charge | ⚡ | Find a charger near you | false | `/charge` |
| 1 | stay | Stay | 🏠 | Book EV-friendly stays | false | `/stay` |
| 2 | eat | Eat | 🍽 | Dine while you charge | false | `/eat` |
| 3 | shop | Shop | 🛒 | Shop nearby | false | `/shop` |
| 4 | ride | Ride | 🚗 | EV rides on demand | true | — |
| 5 | fly | Fly | ✈ | Electric air travel | true | — |

---

## 13. Visual Styling

### Background
`COLOR_NAVY` on all screens and `_layout.tsx` root container.

### Stub Screens
- `flex: 1, backgroundColor: COLOR_NAVY, alignItems: 'center', justifyContent: 'center'`
- `login.tsx`: `color: COLOR_GOLD`, `fontFamily: FONT_BEBAS`, 24px, "Login coming soon"
- Others: `color: '#fff'`, 20px, `"{Title} coming soon"`

### Greeting Header
- `paddingTop: insets.top + 24`, `paddingHorizontal: 24`, left-aligned
- Line 1: "Welcome back," — white, 16px
- Line 2: `displayName` — `COLOR_GOLD`, 42px, `fontFamily: FONT_BEBAS`

### Card DOM Structure

Outer wrapper has **no** `overflow: 'hidden'` → iOS shadow is not clipped.
Inner container has `overflow: 'hidden'` → BlurView clips to rounded corners.

```
Animated.View (outerWrapper)         ← outerStyle + marginRight: CARD_GAP
  └─ Animated.View (innerContainer)  ← innerStyle (borderColor); overflow:'hidden'
       └─ BlurView (absoluteFill)    ← intensity=40, tint="dark"
       └─ View (content)             ← flex:1, zIndex:1, centered column
            ├─ Text (emoji, 64px)
            ├─ Text (FONT_BEBAS 32px, white, title)
            ├─ Text (subtitle, 14px, rgba(255,255,255,0.5))
            └─ [comingSoon] View (badge, position:absolute, bottom:16, alignSelf:'center')
                 └─ Text (COLOR_GOLD, 11px uppercase, "COMING SOON")
```

Inner container base styles:
```ts
{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 24, borderWidth: 1, overflow: 'hidden' }
```

Badge: `borderWidth:1, borderColor:COLOR_GOLD, borderRadius:12, paddingHorizontal:12, paddingVertical:4`

### Animated Styles

`inputRange` is a `const` defined once outside both `useAnimatedStyle` calls and reused in both:

```ts
const inputRange = [
  (index - 1) * SNAP_INTERVAL,
  index * SNAP_INTERVAL,
  (index + 1) * SNAP_INTERVAL,
];
```

**`outerStyle`** (outer `Animated.View`, no `overflow: 'hidden'`):

```ts
const outerStyle = useAnimatedStyle(() => {
  const scale   = interpolate(scrollX.value, inputRange, [0.88, 1.1, 0.88], Extrapolation.CLAMP);
  const opacity = interpolate(scrollX.value, inputRange, [0.5,  1.0,  0.5 ], Extrapolation.CLAMP);
  // rotateY convention (React Native): positive → right edge toward viewer; negative → left edge toward viewer.
  // At inputRange[0]: this card is to the RIGHT of center → should face LEFT (toward center)
  //   → left edge toward viewer → negative value → -8
  // At inputRange[2]: this card is to the LEFT of center → should face RIGHT (toward center)
  //   → right edge toward viewer → positive value → +8
  // Verification: interpolate(scrollX=0, [−300,0,300], [−8,0,8]) for card 0 = 0 ✓ (centered)
  //               interpolate(scrollX=0, [0,300,600], [−8,0,8]) for card 1 = −8 ✓ (card 1 right of center, faces left)
  const rotateYDeg    = interpolate(scrollX.value, inputRange, [-8, 0, 8],   Extrapolation.CLAMP);
  const shadowRadius  = interpolate(scrollX.value, inputRange, [0, 20, 0],   Extrapolation.CLAMP);
  const shadowOpacity = interpolate(scrollX.value, inputRange, [0, 0.8, 0],  Extrapolation.CLAMP);
  const elevation     = interpolate(scrollX.value, inputRange, [0, 20, 0],   Extrapolation.CLAMP);
  return {
    opacity,
    transform: [{ perspective: 1000 }, { scale }, { rotateY: `${rotateYDeg}deg` }],
    shadowColor: COLOR_GOLD,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius,
    shadowOpacity,
    elevation,
  };
});
```

**`innerStyle`** (inner `Animated.View`, has `overflow: 'hidden'`):

```ts
const innerStyle = useAnimatedStyle(() => {
  const borderColor = interpolateColor(
    scrollX.value,
    inputRange,
    ['rgba(255,255,255,0.15)', COLOR_GOLD, 'rgba(255,255,255,0.15)']
  );
  return { borderColor };
});
```

### Coming Soon Modal

State in `home.tsx`:
```ts
const [comingSoonVisible, setComingSoonVisible] = useState(false);
const [comingSoonTitle, setComingSoonTitle]     = useState('');
const dismiss = () => setComingSoonVisible(false);
```

```tsx
<Modal visible={comingSoonVisible} transparent animationType="fade">
  {/* Outer Pressable = backdrop. onPress dismisses. */}
  <Pressable style={styles.backdrop} onPress={dismiss}>
    {/*
      Inner Pressable = content card.
      An empty onPress on a Pressable consumes the touch, preventing
      bubble-up to the backdrop — reliable on both iOS and Android.
    */}
    <Pressable style={styles.card} onPress={() => {}}>
      <Text style={styles.modalTitle}>{comingSoonTitle} is coming soon!</Text>
      <Text style={styles.modalSubtext}>We're working hard to bring this to you.</Text>
      <Pressable style={styles.gotItButton} onPress={dismiss}>
        <Text style={styles.gotItText}>Got it</Text>
      </Pressable>
    </Pressable>
  </Pressable>
</Modal>
```

Backdrop: `flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center'`
Card: `backgroundColor:COLOR_NAVY, borderWidth:1, borderColor:COLOR_GOLD, borderRadius:20, padding:32, marginHorizontal:32, alignItems:'center'`
Title: `COLOR_GOLD, fontFamily:FONT_BEBAS, fontSize:28`
Subtext: `color:'#fff', fontSize:14, textAlign:'center', marginTop:8`
"Got it": `backgroundColor:COLOR_GOLD, borderRadius:12, paddingHorizontal:24, paddingVertical:12, marginTop:24`; text: `color:COLOR_NAVY, fontWeight:'bold'`

---

## 14. Data Flow

```
package.json: "main": "expo-router/entry"
app.json: scheme="zapapp", plugins=["expo-router"]

app/_layout.tsx
  SplashScreen.preventAutoHideAsync()        [module level]
  useFonts({ [FONT_BEBAS]: BebasNeue_400Regular })
  <SafeAreaProvider>
    <SessionProvider>
      <AppShell fontsReady={fontsLoaded || !!fontError}>
        useSession() → sessionLoading
        useEffect → SplashScreen.hideAsync() when fontsReady && !sessionLoading
        <Stack headerShown={false} />

app/index.tsx
  useSession() → { session, loading }
  loading → null (splash covers) | session → /home | no session → /login

app/home.tsx
  useSession() → { session, loading }
  useEffect([loading, session]) → router.replace('/login') if !session
  session.user?.user_metadata?.full_name || 'there' → displayName
  <SnapCarousel onComingSoon={(title) => { setComingSoonTitle(title); setComingSoonVisible(true); }} />
  <Modal visible={comingSoonVisible} ... />

components/SnapCarousel.tsx
  AnimatedFlatList = Animated.createAnimatedComponent(FlatList) (typed via variable)
  scrollX = useSharedValue(0)
  useAnimatedScrollHandler → scrollX
  activeIndex = useDerivedValue(() => Math.round(scrollX.value / SNAP_INTERVAL))
  useAnimatedReaction(activeIndex) → runOnJS(triggerHaptic)
  <AnimatedFlatList horizontal onScroll={handler} renderItem={<ServiceCard>} />
    each item: marginRight: CARD_GAP (implements the 20px gap, aligns snap math)

components/ServiceCard.tsx
  inputRange = [(i-1)*SNAP_INTERVAL, i*SNAP_INTERVAL, (i+1)*SNAP_INTERVAL]  // const
  outerStyle = useAnimatedStyle(inputRange)   → scale, rotateY, opacity, shadow/elevation
  innerStyle = useAnimatedStyle(inputRange)   → borderColor via interpolateColor
```

---

## 15. Error Handling

- Font error: `fontsReady = fontsLoaded || !!fontError` → proceeds with system font.
- No Supabase env vars: no session → `/login`.
- `onAuthStateChange` never fires (offline, no token): 5s timeout sets `loading=false` → `/login`.
- `user_metadata.full_name` null/undefined/empty: `|| 'there'` catches all three.
- No session after loading: `router.replace('/login')` inside `useEffect`.

---

## 16. Out of Scope

- Real auth UI
- Real content for stub screens
- Supabase schema or backend
- Push notifications, Stripe, Maps, Lottie
