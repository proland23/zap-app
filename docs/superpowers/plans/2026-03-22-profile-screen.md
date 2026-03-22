# Profile Screen Enhancement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Profile screen with a polished header, edit-profile bottom sheet, improved payment tab, and code quality fixes.

**Architecture:** All changes are confined to `app/(drawer)/profile.tsx` — no new component files. The edit bottom sheet uses `@gorhom/bottom-sheet` (already installed). The payment tab calls `openPaymentSheet` from `lib/stripe.ts` (already exists).

**Tech Stack:** React Native, Expo SDK 54, expo-router, `@gorhom/bottom-sheet`, `react-native-reanimated` v4, Supabase, `lib/stripe.ts`

---

## File Structure

**Modified:**
- `app/(drawer)/profile.tsx` — full refactor: header polish, edit sheet, payment tab, TypeScript fixes

**No new files.** All spec requirements fit in the existing screen file.

---

## Chunk 1: All Changes

### Task 1: Imports + Header Visual Polish + Sign-Out Reposition

**Files:**
- Modify: `app/(drawer)/profile.tsx`

**Context:** The current header has a 56px avatar with no glow, a plain tier badge with `*` prefix, and the sign-out button is `position: 'absolute'` which overlaps booking cards. This task adds all required imports, upgrades the header visuals, and fixes the sign-out position. All imports are consolidated here so every subsequent commit is independently buildable.

- [ ] **Step 1: Read the current file**

  Read `app/(drawer)/profile.tsx` in full before making any changes.

- [ ] **Step 2: Update imports**

  Replace the existing import block at the top of the file with:

  ```tsx
  import { useEffect, useRef, useState } from 'react';
  import {
    View, Text, Pressable, FlatList, StyleSheet, StatusBar,
    TextInput, ActivityIndicator, Alert,
  } from 'react-native';
  import { useRouter } from 'expo-router';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
  import * as Haptics from 'expo-haptics';
  import {
    BottomSheetModal, BottomSheetModalProvider, BottomSheetView,
  } from '@gorhom/bottom-sheet';
  import { supabase } from '../../lib/supabase';
  import { useSession } from '../../lib/session-context';
  import { openPaymentSheet } from '../../lib/stripe';
  import {
    COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD,
    COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
  } from '../../lib/constants';
  ```

- [ ] **Step 3: Add new state and refs**

  After the existing state declarations (`const [profile, ...]`, `const [activeTab, ...]`, etc.), add:

  ```tsx
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [editName, setEditName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  ```

- [ ] **Step 4: Replace the header JSX**

  Find the `{/* Header */}` block and replace it entirely with:

  ```tsx
  {/* Header */}
  <View style={styles.header}>
    <View style={styles.avatarWrapper}>
      <View style={styles.avatarGlow} />
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
    </View>
    <View style={styles.headerInfo}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        <Pressable
          onPress={() => {
            setEditName(profile?.full_name ?? '');
            editSheetRef.current?.present();
          }}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
        >
          <Text style={styles.editBtn}>EDIT</Text>
        </Pressable>
      </View>
      <Text style={styles.email}>{session?.user.email}</Text>
      <View
        style={styles.tierBadge}
        accessibilityLabel={`Membership tier: ${profile?.membership_tier ?? 'MEMBER'}`}
      >
        <Text style={styles.tierText}>
          {(profile?.membership_tier ?? 'MEMBER').toUpperCase()}
        </Text>
      </View>
      <Text style={styles.points}>
        {(profile?.points_balance ?? 0).toLocaleString()} PTS
      </Text>
    </View>
  </View>
  ```

- [ ] **Step 5: Restructure the return — wrap in BottomSheetModalProvider and fix sign-out**

  The full return statement should look like this. Keep the tab bar and tab content JSX exactly as-is from the current file — only the wrapper structure and sign-out button change:

  ```tsx
  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Header (already updated in Step 4) */}

        {/* Tabs (keep existing tab bar JSX unchanged) */}

        {/* Tab content — give it flex: 1 so sign-out stays at bottom */}
        <View style={styles.tabContent}>
          {/* keep ALL existing tab content JSX here (payment placeholder, loading, empty, FlatList) */}
        </View>

        {/* Sign out — static, not absolutely positioned */}
        <Pressable
          style={[styles.signOutBtn, { marginBottom: insets.bottom + 16 }]}
          onPress={handleSignOut}
          accessibilityLabel="Sign out of account"
          accessibilityRole="button"
        >
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </Pressable>

        {/* Edit sheet — added in Task 2 */}
      </View>
    </BottomSheetModalProvider>
  );
  ```

  Key changes vs current:
  - Outer return now wraps in `<BottomSheetModalProvider>`
  - Tab content wrapped in `<View style={styles.tabContent}>` (flex: 1)
  - Sign-out `Pressable` moved from `position: 'absolute'` to a static element at bottom, using `{ marginBottom: insets.bottom + 16 }` as an inline style override (because `insets` is dynamic and can't go in StyleSheet)

- [ ] **Step 6: Replace all header-related styles in StyleSheet.create**

  Remove the old styles: `header`, `avatar`, `initials`, `headerInfo`, `name`, `email`, `tierRow`, `tier`, `points`, `signOutBtn`, `signOutText`.

  Add these replacements:

  ```ts
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR_ELEVATED,
    borderWidth: 2,
    borderColor: 'rgba(245,166,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 26 },
  headerInfo: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: { color: COLOR_TEXT_PRIMARY, fontSize: 20, fontWeight: '800' },
  editBtn: {
    color: COLOR_GOLD,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 4,
  },
  email: { color: COLOR_TEXT_MUTED, fontSize: 12, marginTop: 2 },
  tierBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  tierText: {
    color: COLOR_GOLD,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  points: { color: COLOR_TEXT_MUTED, fontSize: 11, marginTop: 6 },
  tabContent: { flex: 1 },
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: COLOR_ELEVATED,
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    // marginBottom applied inline via style array (uses dynamic insets value)
  },
  signOutText: { color: COLOR_TEXT_MUTED, fontSize: 13, letterSpacing: 2 },
  ```

- [ ] **Step 7: Run tests**

  ```bash
  npx jest --passWithNoTests
  ```
  Expected: all existing tests pass (check output for "Tests: N passed").

- [ ] **Step 8: Commit**

  ```bash
  git add app/\(drawer\)/profile.tsx
  git commit -m "feat: polish profile header with gold ring, glow, and EDIT button"
  ```

---

### Task 2: Edit Profile Bottom Sheet

**Files:**
- Modify: `app/(drawer)/profile.tsx`

**Context:** Add the edit bottom sheet. The `editSheetRef`, `editName`, `saving`, and `nameFocused` state variables were already added in Task 1. All imports were added in Task 1. This task only adds JSX and styles.

- [ ] **Step 1: Add the edit bottom sheet JSX**

  Inside the `<BottomSheetModalProvider>` wrapper (added in Task 1), place this block just before the closing `</View>` of the outer `View` (after the sign-out button):

  ```tsx
  {/* Edit profile bottom sheet */}
  <BottomSheetModal
    ref={editSheetRef}
    snapPoints={['60%']}
    backgroundStyle={styles.sheetBg}
    handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
  >
    <BottomSheetView style={styles.editSheetContent}>
      {/* Avatar with CAM overlay */}
      <Pressable
        style={styles.editAvatarWrapper}
        onPress={() =>
          Alert.alert('Coming Soon', 'Profile photo upload will be available in a future update.')
        }
        accessibilityLabel="Change profile photo"
        accessibilityRole="button"
      >
        <View style={styles.editAvatar}>
          <Text style={styles.editInitials}>{initials}</Text>
        </View>
        <View style={styles.camOverlay}>
          <Text style={styles.camText}>CAM</Text>
        </View>
      </Pressable>

      {/* Name input */}
      <Text style={styles.inputLabel}>FULL NAME</Text>
      <TextInput
        style={[
          styles.nameInput,
          { borderColor: nameFocused ? COLOR_GOLD : 'rgba(255,255,255,0.12)' },
        ]}
        value={editName}
        onChangeText={setEditName}
        placeholder="Your name"
        placeholderTextColor={COLOR_TEXT_MUTED}
        onFocus={() => setNameFocused(true)}
        onBlur={() => setNameFocused(false)}
      />

      {/* SAVE button */}
      <Pressable
        style={[
          styles.saveBtn,
          (saving || editName.trim().length === 0) && styles.saveBtnDisabled,
        ]}
        disabled={saving || editName.trim().length === 0}
        accessibilityLabel="Save profile changes"
        accessibilityState={{ disabled: saving || editName.trim().length === 0, busy: saving }}
        onPress={async () => {
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
            setProfile((prev) =>
              prev ? { ...prev, full_name: editName.trim() } : prev
            );
            editSheetRef.current?.dismiss();
          } finally {
            setSaving(false);
          }
        }}
      >
        {saving ? (
          <ActivityIndicator size="small" color={COLOR_NAVY} />
        ) : (
          <Text style={styles.saveBtnText}>SAVE</Text>
        )}
      </Pressable>

      {/* CANCEL */}
      <Pressable
        style={styles.cancelBtn}
        onPress={() => editSheetRef.current?.dismiss()}
        accessibilityLabel="Cancel profile edit"
        accessibilityRole="button"
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </BottomSheetView>
  </BottomSheetModal>
  ```

- [ ] **Step 2: Add edit sheet styles**

  Add to `StyleSheet.create`:

  ```ts
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  editSheetContent: { padding: 24 },
  editAvatarWrapper: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  editAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLOR_ELEVATED,
    borderWidth: 2,
    borderColor: 'rgba(245,166,35,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInitials: { color: COLOR_GOLD, fontFamily: FONT_BEBAS, fontSize: 30 },
  camOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLOR_GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camText: { color: COLOR_NAVY, fontSize: 7, fontWeight: '800' },
  inputLabel: {
    color: COLOR_TEXT_MUTED,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: COLOR_CARD,
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 16,
    color: COLOR_TEXT_PRIMARY,
    fontSize: 15,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: COLOR_GOLD,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { color: COLOR_TEXT_MUTED, fontSize: 13 },
  ```

- [ ] **Step 3: Run tests**

  ```bash
  npx jest --passWithNoTests
  ```
  Expected: all existing tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/\(drawer\)/profile.tsx
  git commit -m "feat: add edit profile bottom sheet with name input and photo stub"
  ```

---

### Task 3: Payment Tab

**Files:**
- Modify: `app/(drawer)/profile.tsx`

**Context:** The current payment tab renders a single placeholder message. Replace only the `activeTab === 'payment'` branch with a proper empty state and ADD CARD button. The rest of the ternary chain (loading state, empty bookings, FlatList) is unchanged.

- [ ] **Step 1: Replace the payment tab branch**

  Find this exact block in the tab content area:
  ```tsx
  {activeTab === 'payment' ? (
    <View style={styles.paymentPlaceholder}>
      <Text style={styles.emptyText}>Payment methods available after account setup</Text>
    </View>
  ) : loading ? (
  ```

  Replace only the `activeTab === 'payment'` branch — keep everything from `loading ?` onward unchanged:
  ```tsx
  {activeTab === 'payment' ? (
    <View style={styles.paymentEmpty}>
      <Text style={styles.paymentIcon}>CARD</Text>
      <Text style={styles.paymentTitle}>No payment methods saved</Text>
      <Text style={styles.paymentSubtitle}>Add a card to speed up checkout</Text>
      <Pressable
        style={[styles.addCardBtn, addingCard && styles.addCardBtnDisabled]}
        disabled={addingCard}
        accessibilityLabel="Add payment card"
        accessibilityState={{ disabled: addingCard, busy: addingCard }}
        onPress={async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAddingCard(true);
          try {
            const ok = await openPaymentSheet('mock_secret');
            if (!ok) Alert.alert('Error', 'Could not open payment — please try again.');
          } finally {
            setAddingCard(false);
          }
        }}
      >
        {addingCard ? (
          <ActivityIndicator size="small" color={COLOR_NAVY} />
        ) : (
          <Text style={styles.addCardText}>ADD CARD</Text>
        )}
      </Pressable>
    </View>
  ) : loading ? (
  ```

  The `loading ?` line and everything after it remains exactly as in the current file.

- [ ] **Step 2: Add payment tab styles and remove old placeholder style**

  Remove `paymentPlaceholder` from `StyleSheet.create`. Add:

  ```ts
  paymentEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  paymentIcon: {
    color: COLOR_TEXT_MUTED,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 16,
  },
  paymentTitle: {
    color: COLOR_TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  paymentSubtitle: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  addCardBtn: {
    backgroundColor: COLOR_GOLD,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardBtnDisabled: { opacity: 0.4 },
  addCardText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  ```

- [ ] **Step 3: Run tests**

  ```bash
  npx jest --passWithNoTests
  ```
  Expected: all existing tests pass.

- [ ] **Step 4: Commit**

  ```bash
  git add app/\(drawer\)/profile.tsx
  git commit -m "feat: add payment tab empty state with ADD CARD button"
  ```

---

### Task 4: Code Quality Fixes (TypeScript + Inline Styles)

**Files:**
- Modify: `app/(drawer)/profile.tsx`

**Context:** The existing booking fetch uses `(b: any)` casts (violates TypeScript strict mode) and the skeleton container has an inline style. Fix both.

- [ ] **Step 1: Add typed interfaces**

  Add these two interfaces immediately after the existing `interface Booking { ... }` declaration:

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

- [ ] **Step 2: Replace `any` casts in booking mapping**

  Find:
  ```tsx
  ...(chargeRes.data ?? []).map((b: any) => ({ id: b.id, type: 'Charge', date: b.start_time, detail: 'EV Charging', amount: b.amount_paid })),
  ...(stayRes.data ?? []).map((b: any) => ({ id: b.id, type: 'Stay', date: b.check_in, detail: 'Lodging', amount: b.amount_paid })),
  ```

  Replace with:
  ```tsx
  ...(chargeRes.data ?? []).map((b: ChargeBookingRow) => ({ id: b.id, type: 'Charge', date: b.start_time, detail: 'EV Charging', amount: b.amount_paid })),
  ...(stayRes.data ?? []).map((b: StayBookingRow) => ({ id: b.id, type: 'Stay', date: b.check_in, detail: 'Lodging', amount: b.amount_paid })),
  ```

- [ ] **Step 3: Move skeleton inline style to StyleSheet**

  Find:
  ```tsx
  <View style={{ padding: 16, gap: 10 }}>
    {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonRow} />)}
  </View>
  ```

  Replace with:
  ```tsx
  <View style={styles.skeletonContainer}>
    {[0, 1, 2].map((i) => <View key={i} style={styles.skeletonRow} />)}
  </View>
  ```

  Add to `StyleSheet.create`:
  ```ts
  skeletonContainer: { padding: 16, gap: 10 },
  ```

- [ ] **Step 4: Run tests**

  ```bash
  npx jest --passWithNoTests
  ```
  Expected: all existing tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add app/\(drawer\)/profile.tsx
  git commit -m "fix: replace any types with interfaces and move inline styles to StyleSheet"
  ```

---

## Manual Verification Checklist

After all tasks complete, verify on device:

- [ ] Header: avatar is 72px with gold ring border and gold glow behind it
- [ ] Header: tier badge shows tier text as gold pill (no `*` prefix)
- [ ] Header: tapping `EDIT` opens bottom sheet at 60% snap point
- [ ] Edit sheet: avatar shows initials with gold CAM circle bottom-right; tapping shows "Coming Soon" alert
- [ ] Edit sheet: name input pre-fills with current name; SAVE button is disabled when input is empty
- [ ] Edit sheet: tapping SAVE updates the name in the header immediately and dismisses sheet
- [ ] Edit sheet: tapping CANCEL dismisses sheet without saving
- [ ] Payment tab: shows "CARD", "No payment methods saved", subtitle, and ADD CARD button
- [ ] Payment tab: tapping ADD CARD opens Stripe payment sheet (or shows Expo Go alert in Expo Go)
- [ ] Sign-out button sits below booking list, does not overlap content
- [ ] Upcoming / Past tabs still load bookings correctly
- [ ] All 4 existing Jest tests still pass
