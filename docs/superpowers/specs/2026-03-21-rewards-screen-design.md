# Rewards Screen — Enhanced Design Spec

## Goal

Rebuild the Rewards screen with a count-up animated balance, rich reward cards with per-item progress bars, and a clean transaction history. Connected to live Supabase data.

## Architecture

**Files modified:**
- `app/(drawer)/rewards.tsx` — full refactor of the screen
- `components/RewardCard.tsx` — new component (replaces `RewardItem.tsx`)

`RewardItem.tsx` is no longer used after this change and can be deleted.

---

## Section 1: Balance Hero

- Background: `COLOR_NAVY` (`#050D18`) with a centered radial gold glow (`rgba(245,166,35,0.15)`) using an absolutely-positioned `View`
- Label above: `"YOUR BALANCE"` — `COLOR_TEXT_MUTED`, 10px, letter-spacing 3px, uppercase
- Animated number: starts at `0`, counts up to real `points_balance` over 1500ms using Reanimated 3 `withTiming` with cubic ease-out (`Easing.out(Easing.cubic)`). Implemented via `useSharedValue`, `useAnimatedProps`, and `Animated.Text` (from `react-native-reanimated`). Styled: `FONT_BEBAS`, 72px, `COLOR_GOLD`, letter-spacing 4px
- Label below: `"ZAPP POINTS"` — same muted style as above label
- Bottom border: `1px solid rgba(255,255,255,0.08)` separating hero from cards
- Animation triggers on mount when `balance` data arrives from Supabase (not before — avoid animating from 0 to 0)

---

## Section 2: Reward Cards

**Catalog (hardcoded):**
| id | label | cost | accentColor |
|----|-------|------|-------------|
| `charge` | Free Charge Session | 500 | `COLOR_CYAN` (`#00D4FF`) |
| `meal` | Free Meal | 750 | `COLOR_GOLD` (`#F5A623`) |
| `stay` | Free Night's Stay | 2000 | `COLOR_PURPLE` (`#6B3FA0`) |

**`RewardCard` component props:**
```ts
interface RewardCardProps {
  label: string;
  cost: number;
  accentColor: string;
  balance: number;
  onRedeem: () => void;
}
```

**Card layout (horizontal, `flexDirection: 'row'`):**
- Background: `COLOR_CARD` (`#0A1929`)
- Border: `1px solid {accentColor}40` (accent at 25% opacity)
- Border radius: 16px
- Margin bottom: 12px

**Left — icon container:**
- 44×44px square, border-radius 12px, background `{accentColor}1A` (10% opacity)
- Icon: text character — `⚡` for charge, `🍽` for meal, `🏨` for stay (16px, accent color)
- Margin: 16px

**Center — info (flex: 1):**
- Reward name: `COLOR_TEXT_PRIMARY`, 14px, weight 700
- Progress bar container: `height: 6px`, background `rgba(255,255,255,0.08)`, border-radius 3px, `marginTop: 8px`, `marginBottom: 6px`
- Progress bar fill: width animated from `0%` to `min(balance/cost, 1) * 100%` using Reanimated 3 `useSharedValue(0)` → `withDelay(200, withSpring(targetProgress, { damping: 20, stiffness: 120 }))`. Color: `accentColor`
- Status text below bar:
  - If `balance >= cost`: `"✓ REDEEMABLE"` in `accentColor`, 10px, letter-spacing 1px
  - Else: `"${cost - balance} pts to go"` in `COLOR_TEXT_MUTED`, 10px

**Right — redeem button:**
- `paddingHorizontal: 14px`, `height: 34px`, `borderRadius: 10px`, `margin: 16px`
- Active (`balance >= cost`): background `accentColor`, text `COLOR_NAVY`, weight 700, 10px, letter-spacing 1px, text `"REDEEM"`
- Disabled: `opacity: 0.35`, `pointerEvents: 'none'`
- On press: `Haptics.impactAsync(Light)` then call `onRedeem`

**Progress animation:** each card's bar animates in on component mount independently.

---

## Section 3: Transaction History

- Section label: `"HISTORY"` — `COLOR_TEXT_MUTED`, 10px, letter-spacing 3px, `paddingHorizontal: 16px`, `marginBottom: 12px`
- Each row (`flexDirection: 'row'`, `justifyContent: 'space-between'`):
  - Left: reason text (`COLOR_TEXT_PRIMARY`, 13px, `flex: 1`) + date below (`COLOR_TEXT_MUTED`, 10px, formatted as `MMM D` using `toLocaleDateString`)
  - Right: delta — `+N` in `COLOR_GOLD` or `−N` in `COLOR_RED`, 14px, weight 700
  - Bottom border: `1px solid rgba(255,255,255,0.06)`
- Loading state: 3 skeleton rows (`height: 52px`, `backgroundColor: COLOR_ELEVATED`, `borderRadius: 12px`, `marginBottom: 8px`)
- Empty state: centered text `"Start charging to earn points!"` in `COLOR_TEXT_MUTED`, 13px

---

## Section 4: Redemption Flow

- `handleRedeem(item)` checks `balance >= item.cost` before proceeding
- Shows `Alert.alert` with title `"Redeem {label}?"` and message `"This will deduct {cost} points from your balance."`
- On confirm: calls `supabase.rpc('redeem_points', { uid: session.user.id, cost: item.cost, reward: item.id })`
- On success: re-fetches both balance and transactions; balance count-up re-triggers from current display value to new value
- On error: `Alert.alert('Error', 'Could not redeem — please try again.')`

---

## Data Flow

```
mount
  └─ fetchData()
       ├─ supabase: user_profiles.points_balance  →  setBalance()  →  triggers count-up animation
       └─ supabase: points_transactions (last 20)  →  setTransactions()

handleRedeem()
  └─ Alert confirm
       └─ supabase.rpc('redeem_points')
            └─ fetchData()  (re-fetches, re-triggers animation from new value)
```

---

## Constraints

- All animations: Reanimated 3 only (no Animated API)
- No inline styles on `RewardCard` — use `StyleSheet.create`
- TypeScript strict — no `any` types
- Haptic on redeem button press (Light impact)
- Screen must handle: loading state, empty transactions, zero balance, insufficient balance per reward
