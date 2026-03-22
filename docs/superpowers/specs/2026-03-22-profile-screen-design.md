# Profile Screen — Enhanced Design Spec

## Goal

Rebuild the Profile screen with a polished header, edit-profile bottom sheet (name + stubbed photo), an improved payment tab with Stripe Add Card flow, and fix several existing code quality issues.

## Architecture

**Files modified:**
- `app/(drawer)/profile.tsx` — full refactor (single file, no new components needed)

**No new components.** The edit bottom sheet and payment tab content are contained within the screen file. The screen already imports `@gorhom/bottom-sheet`, `supabase`, `useSession`, and `lib/stripe.ts` — all required dependencies exist.

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
  - Edit icon: `✎` — `COLOR_GOLD`, 18px, `padding: 4` (tap target), `accessibilityLabel: "Edit profile"`, `accessibilityRole: "button"` — opens edit bottom sheet
- Email: `COLOR_TEXT_MUTED`, 12px, `marginTop: 2`
- Tier badge (`marginTop: 8`): gold pill — `backgroundColor: 'rgba(245,166,35,0.12)'`, `borderWidth: 1`, `borderColor: 'rgba(245,166,35,0.3)'`, `paddingHorizontal: 10`, `paddingVertical: 4`, `borderRadius: 8`, `alignSelf: 'flex-start'`
  - Text: `* ` + `(profile.membership_tier ?? 'MEMBER').toUpperCase()` — `COLOR_GOLD`, 11px, `fontWeight: '700'`, `letterSpacing: 2`
- Points: `COLOR_TEXT_MUTED`, 11px, `marginTop: 6` — `(profile.points_balance ?? 0).toLocaleString() + ' PTS'`

---

## Section 2: Edit Profile Bottom Sheet

**Trigger:** Tapping the `✎` edit icon opens the bottom sheet.

**Ref:** `editSheetRef = useRef<BottomSheetModal>(null)` — `editSheetRef.current?.present()` on icon press.

**Sheet config:**
- `snapPoints={['60%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**State:**
- `editName: string` — initialized to `profile?.full_name ?? ''` when sheet opens (use `onAnimate` or `useEffect` on sheet index)
- `saving: boolean` — true while Supabase update is in-flight

**Content (`padding: 24`):**

1. **Avatar with camera overlay** (centered, `alignItems: 'center'`, `marginBottom: 24`):
   - Avatar circle: 80×80px, same style as header
   - Camera overlay: absolutely positioned bottom-right, 28×28px circle, `backgroundColor: COLOR_GOLD`, centered `CAM` text — `COLOR_NAVY`, 7px, `fontWeight: '800'`
   - `accessibilityLabel: "Change profile photo"`, `accessibilityRole: "button"`
   - On press: `Alert.alert('Coming Soon', 'Profile photo upload will be available in a future update.')`

2. **Name input:**
   - Label: `FULL NAME` — `COLOR_TEXT_MUTED`, 10px, `letterSpacing: 2`, `marginBottom: 8`
   - `TextInput`: `value={editName}`, `onChangeText={setEditName}`, `placeholder="Your name"`, styled per CLAUDE.md (bg `COLOR_CARD`, border `rgba(255,255,255,0.12)`, focus border `COLOR_GOLD`, height 52, borderRadius 12, padding 16, text `COLOR_TEXT_PRIMARY`, placeholder `COLOR_TEXT_MUTED`)
   - Focus border: use `onFocus`/`onBlur` state to toggle border color

3. **SAVE button** (`marginTop: 24`):
   - Gold background, navy text, height 52, borderRadius 14, full width
   - `disabled={saving || editName.trim().length === 0}`
   - While saving: `ActivityIndicator` (size "small", color `COLOR_NAVY`) in place of "SAVE" text
   - On press:
     ```ts
     setSaving(true);
     const { error } = await supabase
       .from('user_profiles')
       .update({ full_name: editName.trim() })
       .eq('id', session!.user.id);
     setSaving(false);
     if (error) {
       Alert.alert('Error', 'Could not save changes.');
       return;
     }
     setProfile((prev) => prev ? { ...prev, full_name: editName.trim() } : prev);
     editSheetRef.current?.dismiss();
     ```
   - `accessibilityLabel="Save profile changes"`, `accessibilityState={{ disabled: saving || editName.trim().length === 0, busy: saving }}`

4. **CANCEL link** (`marginTop: 16`, centered):
   - `COLOR_TEXT_MUTED`, 13px — `"Cancel"`
   - On press: `editSheetRef.current?.dismiss()`

**Input focus border implementation:**
```ts
const [nameFocused, setNameFocused] = useState(false);
// TextInput borderColor: nameFocused ? COLOR_GOLD : 'rgba(255,255,255,0.12)'
```

---

## Section 3: Tabs

No structural changes to the tab bar. The animated underline and three tabs (UPCOMING / PAST / PAYMENT) remain as-is.

---

## Section 4: Payment Tab

**State (screen-level):**
- `addingCard: boolean` — true while Stripe payment sheet is initializing

**Content (centered, `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`, `padding: 32`):**

1. **Icon:** `CARD` text label — `COLOR_TEXT_MUTED`, 11px, `letterSpacing: 2`, `marginBottom: 16`
2. **Primary text:** `"No payment methods saved"` — `COLOR_TEXT_PRIMARY`, 16px, `fontWeight: '700'`, `textAlign: 'center'`
3. **Subtitle:** `"Add a card to speed up checkout"` — `COLOR_TEXT_MUTED`, 13px, `textAlign: 'center'`, `marginTop: 6`, `marginBottom: 32`
4. **ADD CARD button:** Gold background, navy text, height 52, borderRadius 14, `paddingHorizontal: 48`
   - `disabled={addingCard}`
   - While `addingCard`: `ActivityIndicator` (size "small", color `COLOR_NAVY`) in place of "ADD CARD" text
   - `accessibilityLabel="Add payment card"`, `accessibilityState={{ disabled: addingCard, busy: addingCard }}`
   - On press:
     ```ts
     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
     setAddingCard(true);
     await openPaymentSheet('mock_secret');
     setAddingCard(false);
     ```
   - `openPaymentSheet` from `lib/stripe.ts` already handles Expo Go guard (returns mock true in Expo Go; shows Alert in Expo Go context)

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

**Sign-out button** — remove `position: 'absolute'`. The screen uses a `ScrollView` (wrapping all tab content). The sign-out button sits at the bottom of the `ScrollView` content with `marginTop: 32`, `marginHorizontal: 20`, `marginBottom: insets.bottom + 16`. This ensures it never overlaps booking cards.

**Inline styles** — move `{ padding: 16, gap: 10 }` on the skeleton container to `StyleSheet`.

**Screen structure change:** Wrap the tab content area in a `ScrollView` (or keep `FlatList` for bookings and place sign-out outside it). Since the payment tab and empty states are short, use `ScrollView` for Upcoming/Past content when no bookings, and keep `FlatList` only when there are bookings. Sign-out sits below the tab content in the outer `View`, not absolutely positioned.

Actually — simpler approach: keep the `View`/`FlatList` structure but move sign-out to be a static element at the bottom of the outer container using `marginBottom` instead of `position: 'absolute'`. The outer container is `flex: 1` with `flexDirection: 'column'`. Tab content takes `flex: 1`. Sign-out is a static button below with safe area padding.

```
<View style={styles.container}>           // flex: 1
  <StatusBar />
  <Header />
  <TabBar />
  <View style={{ flex: 1 }}>             // tab content area
    {/* bookings / payment */}
  </View>
  <Pressable style={styles.signOutBtn}>  // static, no absolute
    ...
  </Pressable>
</View>
```

Sign-out button style: `marginHorizontal: 20`, `marginBottom: insets.bottom + 16`, `marginTop: 8`, same visual style as before.

---

## Section 6: Error Handling

- Profile fetch failure: show `'—'` for name, `'MEMBER'` for tier, `0` for points (current behavior, keep as-is)
- Name save failure: `Alert.alert('Error', 'Could not save changes.')` — user stays in sheet
- Stripe failure: `openPaymentSheet` returns `false` on failure — show `Alert.alert('Error', 'Could not open payment — please try again.')`
- Booking fetch failure: show empty state (current behavior, keep as-is)

---

## Constraints

- No new component files — everything in `app/(drawer)/profile.tsx`
- No `any` types — use typed interfaces for Supabase row shapes
- No inline styles on repeated elements — use `StyleSheet.create`
- Reanimated 4 for the tab underline animation (already in place)
- Haptic on all button presses: `Haptics.ImpactFeedbackStyle.Light`; Medium on sign-out
- Accessibility: `accessibilityLabel` and `accessibilityRole` on all interactive elements
- No emoji — `✎` is a Unicode symbol (U+270E), `*` is a plain character; `CAM` and `CARD` are text labels
- `BottomSheetModalProvider` already wraps the screen (check — if not, wrap the return)
