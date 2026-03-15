# ZAP App Home Screen — Design Spec

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

Build the ZAP app home screen from a fresh Expo blank-TypeScript scaffold. The screen features a deep navy background, a personalized gold greeting, and a 3D perspective snap carousel of six service cards with glassmorphism styling. The project will be migrated from `App.tsx` to a full expo-router file-based routing structure.

---

## 1. Project Structure & Routing

```
zap-app/
├── app/
│   ├── _layout.tsx          # Root layout: font loading, Supabase auth provider, Stack navigator
│   ├── index.tsx            # Redirects to /home if authed, /login if not
│   ├── (tabs)/
│   │   └── home.tsx         # Home screen with greeting + carousel
│   ├── charge.tsx           # Stub screen for Charge card
│   ├── stay.tsx             # Stub screen for Stay card
│   ├── eat.tsx              # Stub screen for Eat card
│   └── shop.tsx             # Stub screen for Shop card
├── components/
│   ├── ServiceCard.tsx      # Single glassmorphism card component
│   └── SnapCarousel.tsx     # FlatList carousel with Reanimated 3 interpolation
├── lib/
│   └── supabase.ts          # Supabase client initialisation
└── App.tsx                  # Kept, delegates to expo-router entry
```

**Routing behaviour:**
- `_layout.tsx` loads Bebas Neue font via `useFonts`, holds `SplashScreen` until ready, and wraps the app in a Supabase session context.
- `index.tsx` reads Supabase auth state and redirects: authenticated → `/home`, unauthenticated → `/login` (stub).
- Active service cards navigate via `router.push('/charge')` etc.

---

## 2. Dependencies to Install

- `@expo-google-fonts/bebas-neue` — Bebas Neue font
- `expo-font` — font loading (likely already a transitive dep)
- `expo-blur` — BlurView for glassmorphism
- `expo-splash-screen` — hold splash until fonts loaded

---

## 3. Carousel Mechanics

**Approach:** FlatList + Reanimated 3 `useAnimatedScrollHandler`

**Card dimensions:** 280×380px
**Snap interval:** 300px (card width 280 + 20px gap)
**Peek:** ~20px of adjacent cards visible on each side
**FlatList config:** `horizontal`, `snapToInterval={300}`, `decelerationRate="fast"`, `showsHorizontalScrollIndicator={false}`, `contentContainerStyle` with horizontal padding to center first/last cards

**Per-card animated transforms** (interpolated from `scrollX` over range `[(i-1)*300, i*300, (i+1)*300]`):

| Property | Side values | Center value |
|---|---|---|
| `scale` | 0.88 | 1.1 |
| `opacity` | 0.5 | 1.0 |
| `rotateY` | ±8deg | 0deg |
| `shadowRadius` | 0 | 20 |
| `shadowOpacity` | 0 | 0.8 |

**Active index tracking:** `Math.round(scrollX.value / 300)` derived via `useDerivedValue`.

**Haptic feedback:** `useEffect` watching active index fires `Haptics.impactAsync(ImpactFeedbackStyle.Light)` on each index change.

---

## 4. Card Data

| Index | Title | Emoji | Subtitle | Status | Nav target |
|---|---|---|---|---|---|
| 0 | Charge | ⚡ | Find a charger near you | Active | `/charge` |
| 1 | Stay | 🏠 | Book EV-friendly stays | Active | `/stay` |
| 2 | Eat | 🍽 | Dine while you charge | Active | `/eat` |
| 3 | Shop | 🛒 | Shop nearby | Active | `/shop` |
| 4 | Ride | 🚗 | EV rides on demand | Coming Soon | Modal |
| 5 | Fly | ✈ | Electric air travel | Coming Soon | Modal |

---

## 5. Visual Styling

### Background
- Full-screen `#050D18` (deep navy), set at root layout level.

### Greeting Header
- Safe-area-inset aware (`useSafeAreaInsets`)
- 24px horizontal padding, left-aligned
- Line 1: "Welcome back," — white, 16px, regular weight
- Line 2: User display name from Supabase session — gold `#FFD700`, 42px Bebas Neue

### Glassmorphism Cards
- Background: `rgba(255, 255, 255, 0.07)`
- Border: `1px solid rgba(255, 255, 255, 0.15)`
- Border radius: `24px`
- Blur: `expo-blur` `BlurView`, `intensity={40}`, `tint="dark"`
- Layout (top to bottom):
  - Emoji: centered, 64px font size
  - Title: white, 32px Bebas Neue, centered
  - Subtitle: `rgba(255, 255, 255, 0.5)`, 14px, centered
  - "Coming Soon" badge (conditional): gold-bordered pill, bottom-center

### Gold Glow (active card only)
- `shadowColor: '#FFD700'`
- `shadowOffset: { width: 0, height: 0 }`
- `shadowRadius: 20`
- `shadowOpacity: 0.8`
- `elevation: 20` (Android)
- Applied via Reanimated `useAnimatedStyle`, interpolated with scroll offset

### Coming Soon Modal
- Single shared `Modal` in `home.tsx`
- Triggered by tapping a Coming Soon card
- Displays "Coming Soon!" message with a dismiss button
- Styled to match app theme (dark background, gold accent)

---

## 6. Data Flow

```
Supabase session (in _layout.tsx context)
    └─► index.tsx reads auth → redirects
    └─► home.tsx reads user.display_name → greeting

scrollX (Reanimated SharedValue)
    └─► useAnimatedScrollHandler on FlatList
    └─► useDerivedValue → activeIndex
    └─► useEffect(activeIndex) → Haptics
    └─► useAnimatedStyle per card → scale, opacity, rotateY, glow
```

---

## 7. Error Handling

- If Supabase session is null on home screen, redirect to `/login`.
- If `user.display_name` is null/empty, fall back to `"there"` → "Welcome back, there".
- Font load failure: expo-splash-screen keeps splash visible; log error and proceed with system font fallback.

---

## 8. Out of Scope

- Login/auth screens (stub redirect only)
- Real content for stub screens (charge.tsx, stay.tsx, etc.)
- Supabase schema or backend setup
- Push notification wiring
- Stripe, Maps, Lottie integration (future screens)
