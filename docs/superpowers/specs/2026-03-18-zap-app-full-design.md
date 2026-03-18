# ZAP App — Full Design Spec
**Date:** 2026-03-18
**Project:** ZAP by Rest & Recharge
**Status:** Approved by user

---

## Overview

Full-featured React Native / Expo app for Rest & Recharge Inc's I-20 Exit 183 station. Covers EV charging reservations, lodging booking, food ordering, rewards, and user profile — all on a dark futuristic brand system.

---

## Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Expo SDK | 54 (downgrade from 55) | Expo Go 54.0.6 on user's device |
| Navigation | Expo Router drawer (`app/(drawer)/`) | Reliability in Expo Go, minimal code |
| Auth (Apple/Google) | Supabase OAuth via `expo-web-browser` | Works in Expo Go without native build |
| Create Account fields | Email + Password + Full Name + Phone | Personalized greeting + future SMS |
| Sign-in layout | Full-bleed hero (gold glow top, bottom-sheet card) | Cinematic brand impact |
| Drawer direction | Left-slide, ZAP logo at top, gold bar on active | Standard UX + brand reinforcement |

---

## File Structure

```
app/
├── login.tsx                        # Auth screen (outside drawer)
├── (drawer)/
│   ├── _layout.tsx                  # Drawer navigator + session guard
│   ├── index.tsx                    # Home — greeting + carousel
│   ├── charge.tsx                   # Map + bay list + reserve sheet
│   ├── stay.tsx                     # Lodging grid
│   ├── stay/[id].tsx                # Lodging detail + calendar + booking
│   ├── eat.tsx                      # Food menu + cart
│   ├── rewards.tsx                  # Points + catalog + redeem
│   └── profile.tsx                  # User info + bookings + sign out
lib/
├── supabase.ts                      # Supabase client (existing)
├── session-context.tsx              # Auth state provider (existing)
├── constants.ts                     # Colors, fonts, dimensions (existing)
├── card-data.ts                     # Carousel card definitions (existing)
└── stripe.ts                        # Stripe helpers
components/
├── SnapCarousel.tsx                 # (existing)
├── ServiceCard.tsx                  # (existing)
├── DrawerContent.tsx                # Custom drawer panel component
├── BayMarker.tsx                    # Animated pulsing map marker
├── BayCard.tsx                      # Horizontal scrollable bay card
├── LodgingCard.tsx                  # Stay grid card
├── FoodItem.tsx                     # Menu item row with Add button
├── CartBadge.tsx                    # Cart count badge for header
└── RewardItem.tsx                   # Rewards catalog row
```

---

## Packages to Add

```bash
npx expo install @gorhom/bottom-sheet onesignal-expo
```

> **Note:** `@gorhom/bottom-sheet` requires `react-native-reanimated` and `react-native-gesture-handler` — both already installed.

---

## Supabase Tables Required

| Table | Key Columns |
|---|---|
| `user_profiles` | `id` (FK → auth.users), `full_name`, `phone`, `points_balance`, `membership_tier` |
| `charging_bays` | `id`, `bay_number`, `charger_speed_kw`, `status` (`available`/`reserved`/`occupied`), `charge_pct` |
| `lodging_units` | `id`, `name`, `nightly_rate`, `is_available`, `photo_url` |
| `menu_items` | `id`, `name`, `description`, `price`, `category`, `photo_url` |
| `bookings` | `id`, `user_id`, `type` (`charge`/`stay`), `bay_number`, `unit_id`, `start_time`, `duration_hours`, `check_in`, `check_out`, `amount_paid`, `status` |
| `orders` | `id`, `user_id`, `items` (jsonb), `total`, `status` (`pending`/`preparing`/`ready`) |
| `points_transactions` | `id`, `user_id`, `delta`, `reason`, `created_at` |
| `redemptions` | `id`, `user_id`, `reward_type`, `points_cost`, `created_at` |

---

## Screen Designs

### Auth — `app/login.tsx`

**Layout:** Full-bleed two-zone layout.
- **Top half:** `#0E2035` → `#050D18` gradient. ZAP wordmark (Bebas Neue, 64px, gold, letter-spacing 10px). Radial gold glow behind logo via blurred `View`. Tagline: "CHARGE · STAY · EAT · RIDE · FLY" in muted uppercase.
- **Bottom half:** Rounded-top card (`border-radius: 24px`, `background: #0A1929`), handle bar at top.
  - **Sign-in mode:** Email input, Password input, SIGN IN button (gold), OR divider, Apple + Google side-by-side buttons, "New here? Create account" link.
  - **Create Account mode:** Animates in (slide up) with Full Name, Phone, Email, Password inputs, CREATE ACCOUNT button. Back link to sign-in.

**Auth flows:**
- Email/password: `supabase.auth.signInWithPassword({ email, password })`
- Create account: `supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })`
- Apple/Google: `supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })` + `expo-web-browser`
- On success: `router.replace('/(drawer)/')`
- Errors: inline error text below inputs in red

---

### Drawer — `app/(drawer)/_layout.tsx` + `components/DrawerContent.tsx`

**Session guard:** `useSession()` — if `!session && !loading` → `router.replace('/login')`

**Drawer panel (`DrawerContent`):**
- Background: `#0E2035`, border-right: `1px solid rgba(245,166,35,0.15)`
- ZAP logo + tagline at top, gold underline divider
- User name + points balance below logo
- Nav items: Home, Charge, Stay, Eat, Rewards, Profile — uppercase, letter-spacing 1.5px
  - Active: gold vertical bar left edge + gold text
  - Charge: cyan (`#00D4FF`) text
  - Inactive: `#C8D8EC`
- Coming soon items (Shop, Ride, Fly): muted text + gold "SOON" badge
- Sign Out at bottom, muted

---

### Home — `app/(drawer)/index.tsx`

Existing screen updated minimally:
- Add hamburger menu button top-left to open drawer
- No other changes — greeting + carousel already implemented

---

### Charge — `app/(drawer)/charge.tsx`

**Map section (60% screen height):**
- `react-native-maps` `MapView` centered at `{ latitude: 33.5543, longitude: -82.3018 }`, zoom level 17, dark custom map style (night mode JSON)
- 20 `BayMarker` components — each a pulsing animated dot: green (`#1F9B6B`) = available, yellow (`#F5A623`) = reserved, red (`#C0392B`) = occupied
- Pulse animation: Reanimated 3 `useSharedValue` + `withRepeat(withTiming(...))` scale/opacity
- Real-time: Supabase `supabase.channel('bays').on('postgres_changes', ...)` subscription, updates marker color on status change

**Bay list (40% screen height):**
- Horizontal `FlatList` of `BayCard` components
- Each card: bay number, speed badge (150kW cyan / 350kW gold), status dot, RESERVE button
- Tapping RESERVE opens `@gorhom/bottom-sheet`

**Reserve bottom sheet:**
- Duration selector: 1h / 2h / 4h / 8h pill buttons
- Payment method display (from Stripe saved methods or "Add card")
- Total price calculation
- CONFIRM RESERVATION button (gold) → Stripe payment sheet
- On payment success: insert into `bookings` table, dismiss sheet, show confirmation toast

---

### Stay — `app/(drawer)/stay.tsx` + `app/(drawer)/stay/[id].tsx`

**Grid screen:**
- 2-column `FlatList` of `LodgingCard`: photo placeholder, unit name, nightly rate, availability indicator
- Pull from `lodging_units` table on mount

**Detail screen (`stay/[id].tsx`):**
- Full-width photo placeholder hero
- Unit name, description, rate
- Date range calendar (custom or `react-native-calendars`)
- Total nights × rate shown dynamically
- BOOK NOW button → Stripe payment sheet
- On success: insert into `bookings`, send OneSignal push with check-in code

---

### Eat — `app/(drawer)/eat.tsx`

**Structure:**
- Category tabs at top: Breakfast / Mains / Snacks / Drinks — horizontal scroll, gold underline on active
- `FlatList` of `FoodItem` below: photo placeholder, name, description, price, ADD button
- Items pulled from `menu_items` table grouped by category

**Cart:**
- Zustand store: `useCartStore` with `items`, `addItem`, `removeItem`, `clearCart`
- `CartBadge` shows item count on drawer hamburger button or header
- Checkout button opens bottom sheet summary → Stripe payment sheet
- On success: insert into `orders` table (status: `pending`)
- Supabase realtime on `orders` table — when `status` → `ready`, trigger OneSignal push: "Your food order is ready"

---

### Rewards — `app/(drawer)/rewards.tsx`

**Sections:**
1. **Balance hero:** Large gold points number + tier badge (e.g., "GOLD MEMBER")
2. **Transaction history:** `FlatList` from `points_transactions` table — each row shows reason + delta (+/-)
3. **Rewards catalog:** 3 hardcoded reward cards:
   - Free Charge Session — 500 pts
   - Free Meal — 750 pts
   - Free Night's Stay — 2,000 pts
   - REDEEM button: disabled if insufficient points
4. **Redeem flow:** Confirmation alert → deduct from `user_profiles.points_balance` → insert `redemptions` row → refresh balance

---

### Profile — `app/(drawer)/profile.tsx`

**Header:** Name, email, membership tier, points balance — pulled from session + `user_profiles`

**Tabs (3):**
- **Upcoming Bookings:** `bookings` where `status = 'confirmed'` and future date
- **Past Bookings:** `bookings` where past date
- **Payment Methods:** Stripe customer portal or saved card display

**Sign Out:** `supabase.auth.signOut()` → `router.replace('/login')`

---

## Push Notifications — OneSignal

**Init:** In `app/(drawer)/_layout.tsx` on mount:
```ts
OneSignal.initialize(ONESIGNAL_APP_ID);
OneSignal.Notifications.requestPermission(true);
```

**Triggers:**
1. **80% charge:** Supabase realtime on `charging_bays` — when `charge_pct >= 80` for user's active booking → OneSignal push: "Your EV is at 80% — almost done!"
2. **Food ready:** Supabase realtime on `orders` — when `status = 'ready'` → OneSignal push: "Your food order is ready for pickup"
3. **Lodging confirmed:** After successful Stripe payment on lodging booking → OneSignal push with generated check-in code

---

## Animation Standards

All animations use **Reanimated 3**. No `Animated` API.

- Spring config: `{ damping: 15, stiffness: 120, mass: 1 }`
- Haptics on all primary button taps: `Haptics.impactAsync(Light)`
- Medium haptic on booking confirmations
- Create Account form: slide-up with `withSpring`
- Bay markers: `withRepeat(withTiming(...))` pulse
- Drawer: native Expo Router animation

---

## Error Handling

- Every async operation has loading state + error state
- Network errors show inline message (never blank screen)
- Stripe failures: display error from `PaymentSheet` result
- Supabase errors: surface message to user via toast or inline text
- Auth errors: inline below form inputs

---

## SDK Downgrade Notes

Downgrade `expo` to `~54.0.0` and all `expo-*` packages to their SDK 54 equivalents before starting implementation. Verify compatibility with `npx expo install --fix`.
