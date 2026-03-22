# Profile Screen — Enhanced Design Spec

## Goal

Rebuild the Profile screen with a polished header, edit-profile bottom sheet (name + stubbed photo), an improved payment tab with Stripe Add Card flow, and fix several existing code quality issues.

## Architecture

**Files modified:**
- `app/(drawer)/profile.tsx` — full refactor (single file, no new components needed)

**No new components.** The edit bottom sheet and payment tab content are contained within the screen file. The screen already imports `@gorhom/bottom-sheet`, `supabase`, `useSession`, and `lib/stripe.ts` — all required dependencies exist.

**`BottomSheetModalProvider`:** Wrap the `profile.tsx` return in `<BottomSheetModalProvider>` (same pattern as `charge.tsx`). This is the minimal-impact approach — the provider mounts/unmounts with the screen and avoids touching the shared drawer layout.

---

## Section 1: Header

**Layout:** `flexDirection: 'row'`, `alignItems: 'center'`, `padding: 20`, `paddingVertical: 24`, bottom border `1px solid rgba(255,255,255,0.08)`.

**Avatar container (left):**
- Outer wrapper: `position: 'relative'`, `marginRight: 16`
- Glow: absolutely positioned `View`, `width: 88`, `height: 88`, `borderRadius: 44`, `backgroundColor: 'rgba(245,166,35,0.15)'`, centered behind avatar
- Avatar circle: `width: 72`, `height: 72`, `borderRadius: 36`, `backgroundColor: COLOR_ELEVATED`, `borderWidth: 2`, `borderColor: 'rgba(245,166,35,0.6)'`, centered initials
- Initials text: `FONT_BEBAS`, 26px, `COLOR_GOLD`

**Info section (right, `flex: 1`):**
- Name row: `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`
  - Name text: `COLOR_TEXT_PRIMARY`, 20px, `fontWeight: '800'`
  - Edit button: `Text` reading `"EDIT"` — `COLOR_GOLD`, 10px, `fontWeight: '700'`, `letterSpacing: 1`, `padding: 4` (tap target), `accessibilityLabel="Edit profile"`, `accessibilityRole="button"` — tapping sets `editName` to `profile?.full_name ?? ''` and calls `editSheetRef.current?.present()`
- Email: `COLOR_TEXT_MUTED`, 12px, `marginTop: 2` — intentionally muted (secondary detail label, not body text)
- Tier badge (`marginTop: 8`): gold pill — `backgroundColor: 'rgba(245,166,35,0.12)'`, `borderWidth: 1`, `borderColor: 'rgba(245,166,35,0.3)'`, `paddingHorizontal: 10`, `paddingVertical: 4`, `borderRadius: 8`, `alignSelf: 'flex-start'`, `accessibilityLabel` set to `` `Membership tier: ${profile?.membership_tier ?? 'MEMBER'}` ``
  - Text: `(profile?.membership_tier ?? 'MEMBER').toUpperCase()` — `COLOR_GOLD`, 11px, `fontWeight: '700'`, `letterSpacing: 2` (no `*` prefix)
- Points: `COLOR_TEXT_MUTED`, 11px, `marginTop: 6` — `(profile?.points_balance ?? 0).toLocaleString() + ' PTS'`

---

## Section 2: Edit Profile Bottom Sheet

**Trigger:** Tapping `"EDIT"` sets `editName` to `profile?.full_name ?? ''` (in the same `onPress` handler, before calling `present()`), then calls `editSheetRef.current?.present()`.

**Ref:** `editSheetRef = useRef<BottomSheetModal>(null)`

**Sheet config:**
- `snapPoints={['60%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**State:**
- `const [editName, setEditName] = useState<string>('')` — starts as empty string; overwritten with `profile?.full_name ?? ''` in the EDIT button's `onPress` before calling `present()`
- `saving: boolean` — true while Supabase update is in-flight
- `nameFocused: boolean` — toggles name input border color

**Content:** `<BottomSheetView style={styles.editSheetContent}>` is the immediate child of `<BottomSheetModal>` (same pattern as `charge.tsx`). `editSheetContent` style: `padding: 24`.

1. **Avatar with camera overlay** (centered, `alignItems: 'center'`, `marginBottom: 24`):
   - Avatar circle: 80×80px, same style as header
   - Camera overlay: absolutely positioned bottom-right, 28×28px circle, `backgroundColor: COLOR_GOLD`, centered `CAM` text — `COLOR_NAVY`, 7px, `fontWeight: '800'`
   - Wrap avatar + overlay in a `Pressable` with `accessibilityLabel="Change profile photo"`, `accessibilityRole="button"`
   - On press: `Alert.alert('Coming Soon', 'Profile photo upload will be available in a future update.')`

2. **Name input:**
   - Label: `"FULL NAME"` — `COLOR_TEXT_MUTED`, 10px, `letterSpacing: 2`, `marginBottom: 8`
   - `TextInput`: `value={editName}`, `onChangeText={setEditName}`, `placeholder="Your name"`, styled per CLAUDE.md (bg `COLOR_CARD`, `borderColor: nameFocused ? COLOR_GOLD : 'rgba(255,255,255,0.12)'`, height 52, borderRadius 12, padding 16, text `COLOR_TEXT_PRIMARY`, placeholder `COLOR_TEXT_MUTED`)
   - `onFocus={() => setNameFocused(true)}`, `onBlur={() => setNameFocused(false)}`

3. **SAVE button** (`marginTop: 24`):
   - Gold background, navy text, height 52, borderRadius 14, full width
   - `disabled={saving || editName.trim().length === 0}`
   - While saving: `ActivityIndicator` (size "small", color `COLOR_NAVY`) in place of `"SAVE"` text
   - On press:
     ```ts
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
       setProfile((prev) => prev ? { ...prev, full_name: editName.trim() } : prev);
       editSheetRef.current?.dismiss();
     } finally {
       setSaving(false);
     }
     ```
   - `accessibilityLabel="Save profile changes"`, `accessibilityState={{ disabled: saving || editName.trim().length === 0, busy: saving }}`

4. **CANCEL link** (`marginTop: 16`, centered):
   - `Pressable` wrapping `Text` reading `"Cancel"` — `COLOR_TEXT_MUTED`, 13px
   - `accessibilityLabel="Cancel profile edit"`, `accessibilityRole="button"`
   - On press: `editSheetRef.current?.dismiss()`

---

## Section 3: Tabs

No structural changes to the tab bar. The animated underline and three tabs (UPCOMING / PAST / PAYMENT) remain as-is.

---

## Section 4: Payment Tab

**State (screen-level):**
- `addingCard: boolean` — true while Stripe payment sheet is initializing

**Content (centered, `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`, `padding: 32`):**

1. **Icon:** `"CARD"` text label — `COLOR_TEXT_MUTED`, 11px, `letterSpacing: 2`, `marginBottom: 16`
2. **Primary text:** `"No payment methods saved"` — `COLOR_TEXT_PRIMARY`, 16px, `fontWeight: '700'`, `textAlign: 'center'`
3. **Subtitle:** `"Add a card to speed up checkout"` — `COLOR_TEXT_SECONDARY`, 13px, `textAlign: 'center'`, `marginTop: 6`, `marginBottom: 32`
4. **ADD CARD button:** Gold background, navy text, height 52, borderRadius 14, `paddingHorizontal: 48`
   - `disabled={addingCard}`
   - While `addingCard`: `ActivityIndicator` (size "small", color `COLOR_NAVY`) in place of `"ADD CARD"` text
   - `accessibilityLabel="Add payment card"`, `accessibilityState={{ disabled: addingCard, busy: addingCard }}`
   - On press:
     ```ts
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     setAddingCard(true);
     try {
       const ok = await openPaymentSheet('mock_secret');
       if (!ok) Alert.alert('Error', 'Could not open payment — please try again.');
     } finally {
       setAddingCard(false);
     }
     ```
   - `openPaymentSheet` from `lib/stripe.ts` handles Expo Go guard (returns `true` mock in Expo Go)

---

## Section 5: Booking Tabs (Fixes)

**TypeScript — remove `any` types.** Replace inline `any` casts with typed interfaces:

```ts
interface ChargeBookingRow {
  id: string;
  start_time: string;
  amount_paid: number;
  status: string;
}

interface StayBookingRow {
  id: string;
  check_in: string;
  amount_paid: number;
  status: string;
}
```

Use these in place of `(b: any)` in the `.map()` calls.

**Inline styles** — move `{ padding: 16, gap: 10 }` on the skeleton container to `StyleSheet`.

**Screen structure:** The outer container is `flex: 1`, `flexDirection: 'column'`. Tab content area takes `flex: 1`. Sign-out button sits below the tab content area as a static element — no `position: 'absolute'`.

```
<View style={styles.container}>           // flex: 1, flexDirection: 'column'
  <StatusBar />
  <Header />
  <TabBar />
  <View style={styles.tabContent}>       // flex: 1 — named style, not inline
    {/* FlatList for bookings, or payment tab, or empty/loading states */}
  </View>
  <Pressable style={styles.signOutBtn}   // static, below tab content
    accessibilityLabel="Sign out of account"
    accessibilityRole="button">
    ...
  </Pressable>
</View>
```

`tabContent` style: `{ flex: 1 }` — defined in `StyleSheet.create`, not inline.

Sign-out button style: `marginHorizontal: 20`, `marginBottom: insets.bottom + 16`, `marginTop: 8`, same visual style as before (no `position: 'absolute'`).

---

## Section 6: Error Handling

- Profile fetch failure: show `'—'` for name, `'MEMBER'` for tier, `0` for points (current behavior, keep as-is)
- Name save failure: `Alert.alert('Error', 'Could not save changes.')` — user stays in sheet
- Stripe failure: `openPaymentSheet` returns `false` — show `Alert.alert('Error', 'Could not open payment — please try again.')`
- Booking fetch failure: show empty state (current behavior, keep as-is)

---

## Constraints

- No new component files — everything in `app/(drawer)/profile.tsx`
- No `any` types — use typed interfaces for Supabase row shapes
- No inline styles on repeated elements — use `StyleSheet.create`
- Reanimated 4 for the tab underline animation (already in place)
- Haptic on all button/interactive presses: `Haptics.ImpactFeedbackStyle.Light`; Medium on sign-out
- Accessibility: `accessibilityLabel` and `accessibilityRole` on all interactive elements
- No emoji — `"EDIT"`, `"CAM"`, `"CARD"` are plain text labels; no Unicode symbol icons
- Wrap screen return in `<BottomSheetModalProvider>` (same pattern as `charge.tsx`)
