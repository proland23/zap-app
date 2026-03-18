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
| Expo SDK | 55 (current codebase) | Expo Go 55 is the correct target; user will update Expo Go on device |
| Navigation | Expo Router drawer (`app/(drawer)/`) | Reliability in Expo Go, minimal code |
| Auth (Apple/Google) | Supabase OAuth via `expo-web-browser` | Works in Expo Go without native build |
| Create Account fields | Email + Password + Full Name + Phone | Personalized greeting + future SMS |
| Sign-in layout | Full-bleed hero (gold glow top, bottom-sheet card) | Cinematic brand impact |
| Drawer direction | Left-slide, ZAP logo at top, gold bar on active | Standard UX + brand reinforcement |

> **Expo Go note:** Stripe, OneSignal, and Google Maps custom styles require a custom dev build. During the Expo Go testing phase, these features will render in degraded/mock mode as documented per-screen below. An EAS dev build will be required before submission.

---

## SDK Note

The codebase is on **Expo SDK 55** (`"expo": "~55.0.6"`). The user's device runs **Expo Go 55** (once updated — Expo Go 54.0.6 is SDK 54 and incompatible). Do **not** downgrade the SDK. Instead, update Expo Go on the device to version 55.

---

## File Structure

### Migration from flat `app/` to drawer group

The existing codebase has a flat `app/` structure. Implementation must migrate to a drawer group:

| Old file | New file | Action |
|---|---|---|
| `app/home.tsx` | `app/(drawer)/index.tsx` | Move + update |
| `app/charge.tsx` | `app/(drawer)/charge.tsx` | Replace stub |
| `app/stay.tsx` | `app/(drawer)/stay.tsx` | Replace stub |
| `app/eat.tsx` | `app/(drawer)/eat.tsx` | Replace stub |
| `app/shop.tsx` | `app/(drawer)/shop.tsx` | Replace stub |
| `app/index.tsx` | `app/(drawer)/index.tsx` | Redirect logic moves to drawer `_layout.tsx` |
| — | `app/(drawer)/rewards.tsx` | New file |
| — | `app/(drawer)/profile.tsx` | New file |

The old flat files (`app/home.tsx`, `app/charge.tsx`, etc.) must be **deleted** after migration. The session guard moves entirely to `app/(drawer)/_layout.tsx`.

The lodging detail screen lives **outside** the drawer group as a stack-pushed modal to avoid Expo Router treating it as a drawer item:

```
app/
├── login.tsx                        # Auth screen (outside drawer, no nav chrome)
├── stay/[id].tsx                    # Lodging detail — stack pushed, NOT in drawer group
├── (drawer)/
│   ├── _layout.tsx                  # Drawer navigator + session guard + OneSignal init
│   ├── index.tsx                    # Home — greeting + carousel
│   ├── charge.tsx                   # Map + bay list + reserve sheet
│   ├── stay.tsx                     # Lodging grid
│   ├── eat.tsx                      # Food menu + cart
│   ├── rewards.tsx                  # Points + catalog + redeem
│   └── profile.tsx                  # User info + bookings + sign out
lib/
├── supabase.ts                      # Supabase client (update with AsyncStorage)
├── session-context.tsx              # Auth state provider (existing)
├── constants.ts                     # Colors, fonts, dimensions (fix COLOR_GOLD)
├── card-data.ts                     # Carousel card definitions (replace emoji with labels)
└── stripe.ts                        # Stripe helpers (dev-build only)
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

Already installed (applied during brainstorm phase):
- `@react-native-async-storage/async-storage` — session persistence
- `@gorhom/bottom-sheet` — Reserve and Checkout bottom sheets
- `react-native-onesignal@^5.3.6` — push notifications (dev build only)

> `@gorhom/bottom-sheet` requires `react-native-reanimated` and `react-native-gesture-handler` — both already installed.

> **Stripe:** Already in `package.json`. Wrap all Stripe calls in `Constants.appOwnership !== 'expo'` guard or show a mock payment screen in Expo Go.

> **OneSignal (`react-native-onesignal` v5):** Native module — dev build only. Wrap `OneSignal.initialize()` in a `Constants.appOwnership !== 'expo'` guard so the app doesn't crash in Expo Go. Use the v5 API only (`OneSignal.initialize`, `OneSignal.Notifications.requestPermission`) — the v4 API is incompatible.

---

## Pre-Applied Fixes (already done, do not re-apply)

The following files have already been corrected before screen implementation begins:
- `lib/constants.ts` — `COLOR_GOLD` corrected to `#F5A623`, new brand colors added
- `lib/supabase.ts` — AsyncStorage added for session persistence
- `lib/card-data.ts` — emoji field removed, routes updated to `/(drawer)/` paths
- `components/ServiceCard.tsx` — emoji rendering removed
- `app/index.tsx` — unconditional redirect to `/(drawer)/`
- `app.json` — `userInterfaceStyle: "dark"`, splash `backgroundColor: "#050D18"`

---

## Constants Reference (apply before other work)

**`lib/constants.ts`** — fix gold color and add missing brand colors:
```ts
export const COLOR_GOLD = '#F5A623';      // was incorrectly #FFD700
export const COLOR_GOLD_DARK = '#D4891A';
export const COLOR_CYAN = '#00D4FF';
export const COLOR_GREEN = '#1F9B6B';
export const COLOR_CARD = '#0A1929';
export const COLOR_ELEVATED = '#0E2035';
export const COLOR_TEXT_PRIMARY = '#FFFFFF';
export const COLOR_TEXT_SECONDARY = '#C8D8EC';
export const COLOR_TEXT_MUTED = '#7A90AA';
```

**`lib/supabase.ts`** — add AsyncStorage for session persistence across cold starts:
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**`lib/card-data.ts`** — remove emoji fields (CLAUDE.md: no emoji in UI). SVG icons or text labels only. The `emoji` field on `CardData` interface is removed; `ServiceCard` renders the card title only.

---

## Supabase Tables Required

| Table | Key Columns | Notes |
|---|---|---|
| `user_profiles` | `id` (FK → auth.users), `full_name`, `phone`, `points_balance` (int default 0), `membership_tier`, `onesignal_player_id` (text nullable) | Created on sign-up via Supabase trigger or after `signUp()`. `onesignal_player_id` written from client on first launch (dev build only). |
| `charging_bays` | `id`, `bay_number`, `charger_speed_kw` (int), `status` (`available`/`reserved`/`occupied`), `charge_pct` (int 0–100) | 20 rows pre-seeded |
| `lodging_units` | `id`, `name`, `description`, `nightly_rate` (numeric), `is_available` (bool), `photo_url` | |
| `menu_items` | `id`, `name`, `description`, `price` (numeric), `category` (`breakfast`/`mains`/`snacks`/`drinks`), `photo_url` | |
| `charge_bookings` | `id`, `user_id`, `bay_id`, `start_time`, `duration_hours`, `amount_paid`, `status` | Separate from stay bookings |
| `stay_bookings` | `id`, `user_id`, `unit_id`, `check_in` (date), `check_out` (date), `amount_paid`, `checkin_code`, `status` | `checkin_code` = random 4-digit string generated at booking |
| `orders` | `id`, `user_id`, `items` (jsonb), `total` (numeric), `status` (`pending`/`preparing`/`ready`) | |
| `points_transactions` | `id`, `user_id`, `delta` (int, can be negative), `reason` (text), `created_at` | |
| `redemptions` | `id`, `user_id`, `reward_type`, `points_cost`, `created_at` | |

> **Rewards race condition:** Do NOT update `points_balance` directly from the client with `UPDATE SET points_balance = points_balance - N`. Use a Supabase database function with row locking:
> ```sql
> CREATE OR REPLACE FUNCTION redeem_points(uid uuid, cost int, reward text)
> RETURNS void LANGUAGE plpgsql AS $$
> BEGIN
>   UPDATE user_profiles SET points_balance = points_balance - cost
>   WHERE id = uid AND points_balance >= cost;
>   IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient points'; END IF;
>   INSERT INTO redemptions (user_id, reward_type, points_cost) VALUES (uid, reward, cost);
>   INSERT INTO points_transactions (user_id, delta, reason) VALUES (uid, -cost, 'Redeemed: ' || reward);
> END;
> $$;
> ```
> Call via `supabase.rpc('redeem_points', { uid, cost, reward })`.

---

## Screen Designs

### Auth — `app/login.tsx`

**Layout:** Full-bleed two-zone layout.
- **Top half:** `#0E2035` → `#050D18` gradient. ZAP wordmark (Bebas Neue, 64px, `COLOR_GOLD`, letter-spacing 10px). Radial gold glow behind logo via blurred `View`. Tagline "CHARGE · STAY · EAT · RIDE · FLY" in muted uppercase.
- **Bottom half:** Rounded-top card (`border-radius: 24px`, `background: #0A1929`), handle bar at top.
  - **Sign-in mode:** Email input, Password input, SIGN IN button (gold), OR divider, Apple + Google side-by-side buttons, "New here? Create account" link.
  - **Create Account mode:** Animates in (slide up with `withSpring`) with Full Name, Phone, Email, Password inputs, CREATE ACCOUNT button. Back link to sign-in.

**Auth flows:**
- Email/password sign-in: `supabase.auth.signInWithPassword({ email, password })`
- Create account: `supabase.auth.signUp({ email, password, options: { data: { full_name, phone } } })`
- Apple/Google OAuth: `supabase.auth.signInWithOAuth({ provider: 'apple'|'google', options: { redirectTo: makeRedirectUri() } })` then open result URL with `expo-web-browser`
- On success: `router.replace('/(drawer)/')`
- Errors: inline error text below relevant inputs, red `#C0392B`

**Loading states:** SIGN IN button shows `ActivityIndicator` while request is in-flight; all inputs disabled.
**Empty/edge cases:** If user already has a session (app re-opened), session guard in drawer `_layout.tsx` redirects before login screen renders.

---

### Drawer — `app/(drawer)/_layout.tsx` + `components/DrawerContent.tsx`

**Session guard in `_layout.tsx`:**
```ts
const { session, loading } = useSession();
useEffect(() => {
  if (!loading && !session) router.replace('/login');
}, [loading, session]);
```
Session guard **only** lives here — remove duplicate guard from `home.tsx` (now `(drawer)/index.tsx`).

**OneSignal init (dev-build only):**
```ts
import Constants from 'expo-constants';
if (Constants.appOwnership !== 'expo') {
  OneSignal.initialize(ONESIGNAL_APP_ID);
  OneSignal.Notifications.requestPermission(true);
}
```
Use `onesignal-expo` v5 API (`OneSignal.initialize`, `OneSignal.Notifications`). The v4 API is incompatible.

**Drawer panel (`DrawerContent.tsx`):**
- Background: `#0E2035`, `border-right: 1px solid rgba(245,166,35,0.15)`
- ZAP logo (Bebas Neue, gold) + tagline at top, gold underline divider
- User name + points balance (from `user_profiles`) below logo
- Nav items: Home, Charge, Stay, Eat, Rewards, Profile — uppercase, letter-spacing 1.5px
  - Active: gold left bar (3px wide, `COLOR_GOLD`) + gold text
  - Charge: `COLOR_CYAN` text
  - Inactive: `COLOR_TEXT_SECONDARY`
- Coming soon items (Shop, Ride, Fly): `COLOR_TEXT_MUTED` + gold "SOON" pill badge
- Sign Out at bottom, muted — calls `supabase.auth.signOut()` → `router.replace('/login')`

---

### Home — `app/(drawer)/index.tsx`

Migrated from `app/home.tsx` (old file deleted). Changes:
- **Remove** session guard `useEffect` — now owned exclusively by drawer `_layout.tsx`
- **Remove** `if (loading || !session) return <View />` guard — drawer `_layout` ensures session exists before rendering
- Add hamburger `Pressable` top-left that calls `navigation.openDrawer()` (from `useNavigation()`)
- Keep existing greeting, carousel, coming-soon modal unchanged

> `app/home.tsx` and `app/shop.tsx` must be **deleted**. `app/(drawer)/shop.tsx` should be a minimal placeholder shell (no full implementation needed — tap navigates via carousel coming-soon modal). Its route must exist to prevent a navigation crash.

**Loading state:** Navy `View` shown while session resolves (handled by drawer `_layout`; home screen always has a valid session by the time it renders).

---

### Charge — `app/(drawer)/charge.tsx`

**Expo Go degraded mode:** `react-native-maps` renders with Apple Maps on iOS (no custom dark style) and Google Maps on Android (API key embedded in native build only). Custom night-mode JSON style is applied but silently ignored in Expo Go. Map still shows location and markers.

**Map section (60% screen height):**
- `MapView` centered at `{ latitude: 33.5543, longitude: -82.3018 }`, `zoomLevel: 17`
- Dark custom map style JSON applied (works in dev build / production; degrades gracefully in Expo Go)
- 20 `BayMarker` components from Supabase `charging_bays` table
- Marker colors: green (`#1F9B6B`) = available, gold (`#F5A623`) = reserved, red (`#C0392B`) = occupied
- Pulse animation: `useSharedValue(1)` + `withRepeat(withSequence(withTiming(1.4), withTiming(1)))` on scale + opacity
- Real-time updates: `supabase.channel('bays').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'charging_bays' }, handler)`

**Loading state:** Skeleton placeholder cards in bay list while data fetches. Map renders immediately (no loading state needed).
**Empty state:** If `charging_bays` returns 0 rows, show "No bays found" message in list area.

**Bay list (40% screen height):**
- Horizontal `FlatList` of `BayCard`: bay number, speed badge (150kW cyan / 350kW gold), status dot, RESERVE button
- RESERVE button opens `@gorhom/bottom-sheet`

**Reserve bottom sheet (Expo Go mock):**
- Duration selector: 1h / 2h / 4h / 8h pill buttons (gold border, gold fill when selected)
- Calculated total price displayed
- CONFIRM RESERVATION button
- **In Expo Go:** button shows "Payment (dev build required)" and logs to console instead of opening Stripe sheet
- **In dev build:** opens Stripe `PaymentSheet`. On success: insert into `charge_bookings`, dismiss sheet, show gold toast "Bay reserved!"
- Stripe usage guarded: `if (Constants.appOwnership !== 'expo') { /* real Stripe flow */ } else { /* mock */ }`

---

### Stay — `app/(drawer)/stay.tsx` + `app/stay/[id].tsx`

> `stay/[id].tsx` is placed at `app/stay/[id].tsx` (outside drawer group) so Expo Router treats it as a stack-pushed screen, not a drawer item. It receives the unit `id` as a route param.

**Grid screen (`stay.tsx`):**
- 2-column `FlatList` of `LodgingCard`: photo placeholder (`background: #0E2035`), unit name, nightly rate, green/red availability dot
- Pull from `lodging_units` on mount
- **Loading state:** Skeleton grid of 4 placeholder cards
- **Empty state:** "No units available" message with gold icon

**Detail screen (`stay/[id].tsx`):**
- Full-width photo placeholder hero (height 240px, `#0E2035` background)
- Unit name (Bebas Neue), description, nightly rate
- Check-in / check-out date selectors (custom date picker or `@react-native-community/datetimepicker`)
- Total = nights × rate, displayed in gold
- BOOK NOW button (full-width gold)
- **In Expo Go:** mock payment confirmation screen
- **In dev build:** Stripe PaymentSheet → on success: insert into `stay_bookings` with `checkin_code = Math.floor(1000 + Math.random() * 9000).toString()`, OneSignal push (dev build only): "Your check-in code is {checkin_code}"

---

### Eat — `app/(drawer)/eat.tsx`

**Structure:**
- Category tabs at top: Breakfast / Mains / Snacks / Drinks — horizontal `ScrollView`, gold underline on active tab, animated with `withTiming`
- `FlatList` of `FoodItem` rows: photo placeholder, name (bold white), description (muted), price (gold), ADD (+) button
- Items from `menu_items` table, filtered by active category
- **Loading state:** 4 skeleton rows
- **Empty state:** "Menu coming soon" per category

**Cart (Zustand store `lib/cart-store.ts`):**
```ts
interface CartItem { id: string; name: string; price: number; qty: number }
interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}
// Derive total outside the store using a selector to ensure re-renders:
// const total = useCartStore(state => state.items.reduce((sum, i) => sum + i.price * i.qty, 0));
```
- `CartBadge` renders item count on hamburger button in drawer header
- Floating CHECKOUT button appears when cart is non-empty (bottom of screen, gold, spring animation)
- Checkout: bottom sheet summary list → total → PLACE ORDER button
- **In Expo Go:** mock order confirmation
- **In dev build:** Stripe PaymentSheet → on success: insert into `orders` (status: `pending`)

**OneSignal food-ready trigger:** Supabase realtime on `orders` table. When `status` changes to `ready`:
- **Client-side (Expo Go testing):** show in-app alert only
- **Production (dev build):** Supabase Edge Function listens to `orders` changes and calls OneSignal REST API server-to-server. Push notification: "Your food order is ready for pickup 🍽"

> **Architecture note:** Push notifications for food-ready, 80% charge, and lodging confirmation must be sent from a **Supabase Edge Function** via the OneSignal REST API — not from the client app. The client cannot send pushes to itself while backgrounded. Set up three Edge Functions: `notify-food-ready`, `notify-charge-80`, `notify-stay-confirmed`. Each triggered by a Postgres `AFTER UPDATE` trigger on the relevant table.

---

### Rewards — `app/(drawer)/rewards.tsx`

**Sections:**
1. **Balance hero:** Large gold points number (Bebas Neue, 64px) + tier badge (`GOLD MEMBER` etc.)
2. **Transaction history:** `FlatList` from `points_transactions` ordered by `created_at DESC`
   - Each row: reason text (muted) + delta in gold (positive) or red (negative)
   - **Empty state:** "No transactions yet — start charging to earn points!"
3. **Rewards catalog:** 3 hardcoded `RewardItem` cards:
   - Free Charge Session — 500 pts — cyan accent
   - Free Meal — 750 pts — gold accent
   - Free Night's Stay — 2,000 pts — purple accent (`#6B3FA0`)
   - REDEEM button: disabled + opacity 0.4 if `points_balance < cost`

**Redeem flow:**
1. Alert confirmation: "Redeem {reward} for {cost} pts?"
2. Call `supabase.rpc('redeem_points', { uid, cost, reward })` (uses the row-locked DB function — see Supabase Tables section)
3. On success: refresh balance, show gold toast "Redeemed!"
4. On `RAISE EXCEPTION 'Insufficient points'`: show error toast

**Loading state:** Skeleton for balance hero + 3 placeholder transaction rows.

---

### Profile — `app/(drawer)/profile.tsx`

**Header:** Avatar circle (initials from `full_name`), name, email, tier badge, points — from Supabase session + `user_profiles`.
**Loading state:** Skeleton header while `user_profiles` fetches.

**Tabs (3) using controlled state + animated underline:**
- **Upcoming Bookings:** Query `charge_bookings` + `stay_bookings` where `status = 'confirmed'` and future date. Combined and sorted by date.
  - **Empty state:** "No upcoming bookings"
- **Past Bookings:** Same tables, past dates.
  - **Empty state:** "No past bookings yet"
- **Payment Methods:** Placeholder UI in Expo Go ("Available after account setup"). In dev build: Stripe customer portal or saved card list.

**Sign Out button (bottom of screen):**
```ts
await supabase.auth.signOut();
router.replace('/login');
```
Haptic feedback: `Haptics.impactAsync(Medium)` on tap.

---

## Push Notifications — OneSignal + Supabase Edge Functions

**Init in `app/(drawer)/_layout.tsx`** (guarded for dev build only):
```ts
if (Constants.appOwnership !== 'expo') {
  OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID!);
  OneSignal.Notifications.requestPermission(true);
}
```

Use **OneSignal SDK v5** API. The v4 API (`OneSignal.setAppId()`, etc.) is incompatible.

**Three Supabase Edge Functions (server-side push triggers):**

| Function | Trigger | Message |
|---|---|---|
| `notify-charge-80` | `AFTER UPDATE ON charging_bays WHERE NEW.charge_pct >= 80 AND OLD.charge_pct < 80` | "Your EV is at 80% — almost done!" |
| `notify-food-ready` | `AFTER UPDATE ON orders WHERE NEW.status = 'ready' AND OLD.status != 'ready'` | "Your food order is ready for pickup" |
| `notify-stay-confirmed` | `AFTER INSERT ON stay_bookings` | "Your check-in code is {checkin_code}" |

Each Edge Function resolves the target user and their OneSignal player ID:
- `notify-charge-80`: join through `charge_bookings` — `SELECT user_id FROM charge_bookings WHERE bay_id = NEW.id AND status = 'confirmed' ORDER BY start_time DESC LIMIT 1`, then `SELECT onesignal_player_id FROM user_profiles WHERE id = user_id`
- `notify-food-ready`: `NEW.user_id` is directly on the `orders` row
- `notify-stay-confirmed`: `NEW.user_id` is directly on `stay_bookings`

**OneSignal player ID capture** (dev build only, in `app/(drawer)/_layout.tsx`):
```ts
if (Constants.appOwnership !== 'expo') {
  OneSignal.User.pushSubscription.addEventListener('change', (subscription) => {
    if (subscription.current.id) {
      supabase.from('user_profiles')
        .update({ onesignal_player_id: subscription.current.id })
        .eq('id', session.user.id);
    }
  });
}
```

---

## Animation Standards

All animations use **Reanimated 3** (package: `react-native-reanimated` v4.2.1 — Reanimated 3 API). No `Animated` API from React Native core.

Standard configs:
```ts
const spring = { damping: 15, stiffness: 120, mass: 1 };
const snappy = { damping: 20, stiffness: 200 };
const gentle = { damping: 18, stiffness: 80 };
```

- Haptics: `Haptics.impactAsync(Light)` on all primary button taps
- Medium haptic on booking confirmations
- Heavy haptic on errors
- Create Account slide-up: `withSpring` (gentle config)
- Bay marker pulse: `withRepeat(withSequence(withTiming(1.4, {duration:800}), withTiming(1, {duration:800})))`
- Cart badge appears: `withSpring` scale from 0 to 1

---

## Error Handling

- Every async operation: loading state (spinner or skeleton) + error state (never blank screen)
- Network errors: inline message in `COLOR_TEXT_MUTED` or toast
- Stripe failures: display error string from `PaymentSheet` result
- Supabase errors: surface `.message` to user via toast or inline text
- Auth errors: inline below form inputs in `#C0392B`
- RPC errors (redeem_points): toast "Insufficient points" in red
