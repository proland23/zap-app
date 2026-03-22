# Shop Screen — Design Spec

## Goal

Build the Shop screen with a product grid, product detail bottom sheet, and cart/checkout bottom sheet. Shop items use a separate cart slice from the food cart.

## Architecture

**Files modified:**
- `app/(drawer)/shop.tsx` — full screen implementation (single file, no new components)
- `lib/cart-store.ts` — add shop cart slice (`shopItems`, `addShopItem`, `removeShopItem`, `clearShopCart`)

**No new component files.** Product cards, detail sheet, and checkout sheet all live in `shop.tsx`.

**New Supabase table:** `shop_items`
```sql
CREATE TABLE shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('clothing', 'accessories', 'electronics', 'snacks')),
  in_stock BOOLEAN NOT NULL DEFAULT true
);
```

---

## Section 1: Cart Store Extension

Add a second cart slice to `lib/cart-store.ts` without touching the existing food cart. Reuse the existing `CartItem` shape (`id`, `name`, `price`, `qty`) — the checkout list only shows name, qty, and price, so no additional fields are required on shop cart items.

**Updated `CartState` interface:**
```ts
interface CartState {
  // existing food cart (unchanged)
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'qty'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;

  // new shop cart
  shopItems: CartItem[];
  addShopItem: (item: Omit<CartItem, 'qty'>, qty: number) => void;
  removeShopItem: (id: string) => void;
  clearShopCart: () => void;
}
```

**`addShopItem` behavior:** If item already exists in `shopItems`, add `qty` to existing quantity (capped at 10 as a safety net — the UI stepper already prevents exceeding 10). Otherwise push `{ ...item, qty }`.

**`removeShopItem` behavior:** Removes the entire line item regardless of quantity. No partial decrement.

The `create<CartState>((set) => ({ ... }))` call is updated to include the new shop slice alongside the existing food slice.

---

## Section 2: Screen Layout

**Required imports for `shop.tsx`:**
```tsx
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  BottomSheetModal, BottomSheetModalProvider, BottomSheetView, BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import { useCartStore } from '../../lib/cart-store';
import CartBadge from '../../components/CartBadge';
import {
  COLOR_NAVY, COLOR_CARD, COLOR_ELEVATED, COLOR_GOLD, COLOR_CYAN, COLOR_PURPLE, COLOR_GREEN,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';
```

**State:**
```ts
const [items, setItems] = useState<ShopItem[]>([]);
const [loading, setLoading] = useState(true);
const [fetchError, setFetchError] = useState<string | null>(null);
const [activeCategory, setActiveCategory] = useState<ShopCategory>('clothing');
const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
const [qty, setQty] = useState(1);
const [checkingOut, setCheckingOut] = useState(false);
const { shopItems, addShopItem, removeShopItem, clearShopCart } = useCartStore();
const detailSheetRef = useRef<BottomSheetModal>(null);
const cartSheetRef = useRef<BottomSheetModal>(null);
const underlineX = useSharedValue(0);
const underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));
const [tabBarWidth, setTabBarWidth] = useState(0);
```

**Cart badge count:** `shopItems.reduce((s, i) => s + i.qty, 0)` — total quantity, not number of distinct line items.

**Return structure:**
```tsx
<BottomSheetModalProvider>
  <View style={[styles.container, { paddingTop: insets.top }]}>
    <StatusBar barStyle="light-content" />
    {/* Header */}
    {/* Category tabs */}
    {/* Content: error | loading | product grid (flex: 1) */}
    {/* Detail bottom sheet */}
    {/* Cart bottom sheet */}
  </View>
</BottomSheetModalProvider>
```

**Header:** `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `paddingHorizontal: 20`, `paddingVertical: 16`, bottom border `1px solid rgba(255,255,255,0.08)`.
- Left: `"SHOP"` — `FONT_BEBAS`, 32px, `COLOR_GOLD`, `letterSpacing: 2`
- Right: a `Pressable` wrapping `<CartBadge count={shopItems.reduce((s, i) => s + i.qty, 0)} />`. The `onPress` on the `Pressable` calls `cartSheetRef.current?.present()`. `CartBadge` only accepts `count` — do not pass `onPress` to it. `accessibilityLabel="Open cart"`, `accessibilityRole="button"` on the `Pressable`.

**Category tabs:** Non-scrollable `View` row. Each tab uses `flex: 1` (not a fixed `TAB_WIDTH`) so the row always fills the screen width regardless of device size (avoids overflow on narrow devices like iPhone SE at 320pt).
- Four tabs: `Clothing` / `Accessories` / `Electronics` / `Snacks` (values: `'clothing' | 'accessories' | 'electronics' | 'snacks'`)
- Tab bar container: `flexDirection: 'row'`, `position: 'relative'`, `borderBottomWidth: 1`, `borderBottomColor: 'rgba(255,255,255,0.08)'`
- Each tab `Pressable`: `flex: 1`, `height: 44`, `alignItems: 'center'`, `justifyContent: 'center'`
- `TAB_WIDTH` is measured via `onLayout` on the tab bar container: `const [tabBarWidth, setTabBarWidth] = useState(0)` — `onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}` on the tab bar `View`. Each tab's computed width is `tabBarWidth / 4`.
- Underline translate: `underlineX.value = withTiming(idx * (tabBarWidth / 4), { duration: 200 })` on tab press
- Haptic `Light` on each tab press
- `tabText`: `COLOR_TEXT_MUTED`, 11px, `letterSpacing: 1.5`; active: `COLOR_GOLD`
- Underline element: `<Animated.View style={[styles.underline, { width: tabBarWidth / 4 }, underlineStyle]} />`. `underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }))`. The `width` is applied inline (not in `StyleSheet.create`) because `tabBarWidth` is runtime state — same pattern as `paddingBottom: insets.bottom + 24`. Base `styles.underline`: `height: 2`, `backgroundColor: COLOR_GOLD`, `position: 'absolute'`, `bottom: 0`

**Content area (`flex: 1`):** Renders one of three states — error, loading, or product grid.

**Error state** (when `fetchError !== null`):
```tsx
<View style={styles.errorContainer}>
  <Text style={styles.errorText}>{fetchError}</Text>
  <Pressable onPress={fetchItems} accessibilityLabel="Retry loading shop items" accessibilityRole="button">
    <Text style={styles.retryText}>Retry</Text>
  </Pressable>
</View>
```
- `errorContainer`: `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`
- `errorText`: `COLOR_TEXT_MUTED`, 13px, `textAlign: 'center'`
- `retryText`: `COLOR_GOLD`, 13px, `fontWeight: '600'`, `marginTop: 8`

**Loading state** (when `loading`): plain `View` with `flexDirection: 'row'`, `flexWrap: 'wrap'`, `padding: 16`, `gap: 12` — 4 skeleton cards, each `flex: 1`, `minWidth: '45%'`, `height: 150`, `backgroundColor: COLOR_ELEVATED`, `borderRadius: 16`.

**Product grid** (otherwise): `FlatList` with `numColumns={2}`, `columnWrapperStyle={styles.columnWrapper}` (`gap: 12`), `contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 12 }}`.
- Data: `items.filter(i => i.category === activeCategory)`
- `ListEmptyComponent`: centered `View` — `"No items in this category"`, `COLOR_TEXT_MUTED`, 14px

**Product card:**
- `Pressable` wraps the card, `accessibilityRole="button"`, `accessibilityLabel={item.name}`, disabled when `!item.in_stock`
- On press: `setSelectedItem(item)`, then **`setQty(1)`** (explicit reset — `qty` persists across sheet opens otherwise), then `detailSheetRef.current?.present()`
- Card style: `COLOR_CARD` background, `borderRadius: 16`, `borderWidth: 1`, `borderColor: 'rgba(255,255,255,0.08)'`, `padding: 14`, `flex: 1`
- When `!item.in_stock`: `opacity: 0.5` on whole card
- Accent icon square: 48×48px, `borderRadius: 12`, background = category color with `'1A'` appended to produce an 8-digit RGBA hex at ~10% opacity (e.g. `COLOR_GOLD + '1A'` → `'#F5A6231A'`), centered label text (10px, `fontWeight: '800'`, category color)
- Product name: `COLOR_TEXT_PRIMARY`, 13px, `fontWeight: '700'`, `marginTop: 10`
- Price: `COLOR_GOLD`, 15px, `fontWeight: '700'`, `marginTop: 4`
- Out of stock label (when `!item.in_stock`): `"OUT OF STOCK"`, `COLOR_TEXT_MUTED`, 9px, `letterSpacing: 1`, `marginTop: 4`

**Note — ADD TO CART when item already in cart:** No special UI — the detail sheet always starts with `qty = 1` and shows "ADD TO CART". Tapping ADD TO CART when the item is already in the cart adds 1 (or the selected qty) to the existing line. No "Update Cart" state needed.

**Category accent colors and icon labels:**
| Category | Color constant | Icon Label |
|---|---|---|
| clothing | `COLOR_GOLD` | `"TEE"` |
| accessories | `COLOR_PURPLE` | `"ACC"` |
| electronics | `COLOR_CYAN` | `"PWR"` |
| snacks | `COLOR_GREEN` (`#1F9B6B`) | `"EAT"` |

---

## Section 3: Product Detail Bottom Sheet

Uses `detailSheetRef` declared in Section 2. Does not re-declare it.

**Sheet config:**
- `snapPoints={['65%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**Content** (`<BottomSheetView style={styles.detailContent}>`), `padding: 24`. Guard the entire content with `selectedItem &&` to avoid rendering with null state.

1. **Accent icon square** — 64×64px, `borderRadius: 16`, `alignSelf: 'center'`, category color with `'1A'` appended (same 8-digit hex convention as grid card), centered icon label (14px, `fontWeight: '800'`, category color)

2. **Product name** — `COLOR_TEXT_PRIMARY`, 22px, `fontWeight: '800'`, `marginTop: 16`, `textAlign: 'center'`

3. **Price** — `COLOR_GOLD`, 20px, `fontWeight: '700'`, `textAlign: 'center'`, `marginTop: 4`

4. **Description** — `COLOR_TEXT_SECONDARY`, 14px, `lineHeight: 20`, `textAlign: 'center'`, `marginTop: 8`

5. **Quantity stepper** (`marginTop: 24`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: 24`):
   - `−` button: 36×36px circle, `backgroundColor: COLOR_ELEVATED`, `borderWidth: 1`, `borderColor: 'rgba(255,255,255,0.12)'`, `borderRadius: 18`, disabled when `qty === 1`, `accessibilityLabel="Decrease quantity"`, `accessibilityRole="button"`, label `"−"` (`COLOR_TEXT_PRIMARY`, 20px)
   - Count: `COLOR_TEXT_PRIMARY`, 20px, `fontWeight: '700'`, `minWidth: 32`, `textAlign: 'center'`
   - `+` button: same style, disabled when `qty === 10`, `accessibilityLabel="Increase quantity"`, `accessibilityRole="button"`, label `"+"` (`COLOR_TEXT_PRIMARY`, 20px)
   - Haptic `Light` on each stepper tap

6. **ADD TO CART button** (`marginTop: 24`) — gold background, navy text, height 52, `borderRadius: 14`, full width, `accessibilityLabel="Add to cart"`, `accessibilityRole="button"`
   - Disabled + `opacity: 0.4` when `!selectedItem?.in_stock`
   - On press: `addShopItem({ id: selectedItem.id, name: selectedItem.name, price: selectedItem.price }, qty)`, `detailSheetRef.current?.dismiss()`, haptic `Light`

---

## Section 4: Cart / Checkout Bottom Sheet

Uses `cartSheetRef` declared in Section 2. Does not re-declare it.

**Sheet config:**
- `snapPoints={['70%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**Layout:** `BottomSheetFlatList` must not be nested inside `BottomSheetView` (causes scroll sticking on Android). Structure is three direct children of `BottomSheetModal`:

```tsx
<BottomSheetModal ref={cartSheetRef} ...>
  {/* 1. Header — plain View, not BottomSheetView */}
  <View style={styles.cartHeader}>
    <Text style={styles.cartTitle}>YOUR CART</Text>
  </View>

  {/* 2. Item list — direct child */}
  <BottomSheetFlatList
    data={shopItems}
    keyExtractor={(i) => i.id}
    style={{ flex: 1 }}
    ListEmptyComponent={
      <View style={styles.cartEmpty}>
        <Text style={styles.cartEmptyText}>Your cart is empty</Text>
      </View>
    }
    renderItem={({ item }) => (/* cart row — see below */)}
  />

  {/* 3. Footer — plain View, not BottomSheetView */}
  <View style={[styles.cartFooter, { paddingBottom: insets.bottom + 24 }]}>
    {/* total row + checkout button */}
  </View>
</BottomSheetModal>
```

**Header styles:** `cartHeader` — `paddingHorizontal: 24`, `paddingTop: 24`, `paddingBottom: 12`; `cartTitle` — `FONT_BEBAS`, 24px, `COLOR_TEXT_PRIMARY`, `letterSpacing: 2`

**Cart row:**
- `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `paddingHorizontal: 24`, `paddingVertical: 12`, `borderBottomWidth: 1`, `borderBottomColor: 'rgba(255,255,255,0.06)'`
- Left: product name (`COLOR_TEXT_PRIMARY`, 14px) + `"x{qty}"` (`COLOR_TEXT_MUTED`, 12px, `marginTop: 2`)
- Right: line total `"$" + (item.price * item.qty).toFixed(2)` (`COLOR_GOLD`, 14px, `fontWeight: '700'`) + remove button
- Remove button: text `"✕"` (U+2715 MULTIPLICATION X — a Unicode symbol, not an emoji; consistent with `"✓"` used in `RewardCard`) — `COLOR_TEXT_MUTED`, 16px, `padding: 4`, `marginLeft: 12`, haptic `Light`, calls `removeShopItem(item.id)`, `accessibilityLabel="Remove item"`, `accessibilityRole="button"`

**Empty state styles:** `cartEmpty` — `alignItems: 'center'`, `paddingVertical: 48` (no `flex: 1` — `ListEmptyComponent` does not inherit sheet height so `flex: 1` has no effect); `cartEmptyText` — `COLOR_TEXT_MUTED`, 14px

**Footer styles:** `cartFooter` — `paddingHorizontal: 24`, `paddingTop: 12`, `borderTopWidth: 1`, `borderTopColor: 'rgba(255,255,255,0.08)'`; `paddingBottom` applied inline as `insets.bottom + 24` (dynamic value, cannot go in StyleSheet)

**Total row:** `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`
- Label: `"TOTAL"` — `COLOR_TEXT_MUTED`, 11px, `letterSpacing: 2`
- Value: `"$" + shopItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)` — `COLOR_GOLD`, 18px, `fontWeight: '700'`

**CHECKOUT button** (`marginTop: 16`) — gold background, navy text, height 52, `borderRadius: 14`, full width
- `disabled={checkingOut || shopItems.length === 0}`
- While `checkingOut`: `ActivityIndicator` size `"small"` color `COLOR_NAVY`
- `accessibilityLabel="Checkout"`, `accessibilityRole="button"`, `accessibilityState={{ disabled: checkingOut || shopItems.length === 0, busy: checkingOut }}`
- On press:
  ```ts
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setCheckingOut(true);
  try {
    const ok = await openPaymentSheet('mock_secret');
    if (!ok) {
      Alert.alert('Error', 'Could not process payment — please try again.');
      return; // finally still runs — setCheckingOut(false) is guaranteed
    }
    clearShopCart();
    cartSheetRef.current?.dismiss();
    Alert.alert('Order placed!', "We'll have it ready for you shortly.");
  } finally {
    setCheckingOut(false);
  }
  ```

**Note on order persistence:** No `shop_orders` Supabase insert on checkout. The payment sheet uses `'mock_secret'`. Order persistence is a future concern, intentionally omitted.

---

## Section 5: TypeScript Interfaces

```ts
type ShopCategory = 'clothing' | 'accessories' | 'electronics' | 'snacks';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  in_stock: boolean;
}
```

---

## Section 6: Data Fetching

```ts
const fetchItems = async () => {
  setLoading(true);
  setFetchError(null);
  const { data, error } = await supabase
    .from('shop_items')
    .select('id, name, description, price, category, in_stock')
    .order('name');
  if (error || !data) {
    setFetchError('Could not load shop items.');
    setLoading(false);
    return;
  }
  setItems(data);
  setLoading(false);
};

useEffect(() => { fetchItems(); }, []);
```

---

## Constraints

- No new component files — everything in `shop.tsx` + `cart-store.ts`
- No new navigation routes
- Reuse `CartBadge` from `components/CartBadge.tsx` — wrap in `Pressable` for tap handling; pass only `count` prop
- No `any` types — use `ShopItem` and `CartItem` interfaces
- No inline styles on repeated elements — use `StyleSheet.create`; only dynamic values (`insets.bottom`) are inline
- Reanimated for tab underline animation (`useSharedValue` + `withTiming`)
- Haptic on all interactive presses
- Accessibility labels and roles on all interactive elements
- `BottomSheetModalProvider` wraps the screen return
- `StatusBar barStyle="light-content"` inside the return tree
- `BottomSheetFlatList` is a direct child of `BottomSheetModal` — not nested inside `BottomSheetView`
