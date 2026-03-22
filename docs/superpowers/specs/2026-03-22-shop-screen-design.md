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

Add a second cart slice to `lib/cart-store.ts` without touching the existing food cart.

**New interface (reuse `CartItem` shape):**
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

**`addShopItem` behavior:** If item already exists in `shopItems`, add `qty` to existing quantity (capped at 10). Otherwise push `{ ...item, qty }`.

---

## Section 2: Screen Layout

**Container:** `flex: 1`, `backgroundColor: COLOR_NAVY`, `paddingTop: insets.top`

**Header:** `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `padding: 20`, `paddingVertical: 16`, bottom border `1px solid rgba(255,255,255,0.08)`.
- Left: `"SHOP"` — `FONT_BEBAS`, 32px, `COLOR_GOLD`, `letterSpacing: 2`
- Right: `CartBadge` (existing component from `components/CartBadge.tsx`) — pass `count={shopItems.length}` and `onPress` to open checkout sheet

**Category tabs:** Same animated-underline pattern as `eat.tsx`.
- Four tabs: `Clothing` / `Accessories` / `Electronics` / `Snacks`
- `TAB_WIDTH = 90`, underline animates with `withTiming` on tab press
- Haptic `Light` on each tab press
- `tabText` style: `COLOR_TEXT_MUTED`, 11px, `letterSpacing: 1.5`; active: `COLOR_GOLD`

**Product grid:** `FlatList` with `numColumns={2}`, `columnWrapperStyle={{ gap: 12 }}`, `contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 12 }}`

**Product card:**
- Background: `COLOR_CARD`, `borderRadius: 16`, `borderWidth: 1`, `borderColor: 'rgba(255,255,255,0.08)'`, `padding: 14`, `flex: 1`
- Accent icon square: 48×48px, `borderRadius: 12`, background = category color at `1A` opacity, centered label text (see category colors below)
- Product name: `COLOR_TEXT_PRIMARY`, 13px, `fontWeight: '700'`, `marginTop: 10`
- Price: `COLOR_GOLD`, 15px, `fontWeight: '700'`, `marginTop: 4`
- Out of stock: `opacity: 0.5` on whole card, small `"OUT OF STOCK"` label `COLOR_TEXT_MUTED`, 9px, `letterSpacing: 1`, `marginTop: 4`
- Pressable wraps entire card, `accessibilityRole="button"`, disabled when `!item.in_stock`

**Category accent colors and icon labels:**
| Category | Color | Icon Label |
|---|---|---|
| clothing | `COLOR_GOLD` | `"TEE"` |
| accessories | `COLOR_PURPLE` | `"ACC"` |
| electronics | `COLOR_CYAN` | `"PWR"` |
| snacks | `COLOR_GREEN` (accent green `#1F9B6B`) | `"EAT"` |

**Loading state:** 2-column skeleton grid — 4 skeleton cards, `height: 140`, `backgroundColor: COLOR_ELEVATED`, `borderRadius: 16`, `flex: 1`

**Empty state:** centered `COLOR_TEXT_MUTED` text `"No items in this category"`, 14px

---

## Section 3: Product Detail Bottom Sheet

**Ref:** `detailSheetRef = useRef<BottomSheetModal>(null)`

**State:**
- `selectedItem: ShopItem | null` — set before calling `present()`
- `qty: number` — stepper value, reset to `1` each time sheet opens

**Sheet config:**
- `snapPoints={['65%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**Content** (`<BottomSheetView style={styles.detailContent}>`), `padding: 24`:

1. **Accent icon square** — 64×64px, `borderRadius: 16`, `alignSelf: 'center'`, category color at `1A` opacity, centered icon label text (same as grid card but larger: 14px, `fontWeight: '800'`)

2. **Product name** — `COLOR_TEXT_PRIMARY`, 22px, `fontWeight: '800'`, `marginTop: 16`, `textAlign: 'center'`

3. **Price** — `COLOR_GOLD`, 20px, `fontWeight: '700'`, `textAlign: 'center'`, `marginTop: 4`

4. **Description** — `COLOR_TEXT_SECONDARY`, 14px, `lineHeight: 20`, `textAlign: 'center'`, `marginTop: 8`

5. **Quantity stepper** (`marginTop: 24`, `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`, `gap: 24`):
   - `−` button: 36×36px circle, `backgroundColor: COLOR_ELEVATED`, `borderWidth: 1`, `borderColor: 'rgba(255,255,255,0.12)'`, disabled when `qty === 1`, `accessibilityLabel="Decrease quantity"`, `accessibilityRole="button"`
   - Count: `COLOR_TEXT_PRIMARY`, 20px, `fontWeight: '700'`, min width 32, `textAlign: 'center'`
   - `+` button: same style as `−`, disabled when `qty === 10`, `accessibilityLabel="Increase quantity"`, `accessibilityRole="button"`
   - Haptic `Light` on each stepper tap

6. **ADD TO CART button** (`marginTop: 24`) — gold background, navy text, height 52, `borderRadius: 14`, full width, `accessibilityLabel="Add to cart"`, `accessibilityRole="button"`
   - Disabled + `opacity: 0.4` when `!selectedItem?.in_stock`
   - On press: `addShopItem({ id, name, price }, qty)`, `detailSheetRef.current?.dismiss()`, haptic `Light`

---

## Section 4: Cart / Checkout Bottom Sheet

**Ref:** `cartSheetRef = useRef<BottomSheetModal>(null)`

**Sheet config:**
- `snapPoints={['70%']}`
- `backgroundStyle={{ backgroundColor: COLOR_ELEVATED }}`
- `handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}`

**State:**
- `checkingOut: boolean` — true while `openPaymentSheet` is in-flight

**Content** (`<BottomSheetView>`):

1. **Title row** (`padding: 24`, `paddingBottom: 0`): `"YOUR CART"` — `FONT_BEBAS`, 24px, `COLOR_TEXT_PRIMARY`, `letterSpacing: 2`

2. **Item list:** `BottomSheetFlatList` of `shopItems`
   - Each row: `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`, `paddingHorizontal: 24`, `paddingVertical: 12`, bottom border `rgba(255,255,255,0.06)`
   - Left: product name (`COLOR_TEXT_PRIMARY`, 14px) + qty label (`COLOR_TEXT_MUTED`, 12px, `"x2"` format)
   - Right: line total (`COLOR_GOLD`, 14px, `fontWeight: '700'`) + `✕` pressable (`COLOR_TEXT_MUTED`, 16px, `padding: 4`, haptic `Light`, `accessibilityLabel="Remove item"`, `accessibilityRole="button"`)

3. **Empty state:** `flex: 1`, centered — `"Your cart is empty"`, `COLOR_TEXT_MUTED`, 14px

4. **Total + Checkout** (below list, `padding: 24`, `paddingTop: 12`, top border `rgba(255,255,255,0.08)`):
   - Total row: `flexDirection: 'row'`, `justifyContent: 'space-between'` — `"TOTAL"` label (`COLOR_TEXT_MUTED`, 11px, `letterSpacing: 2`) + total value (`COLOR_GOLD`, 18px, `fontWeight: '700'`)
   - **CHECKOUT button** (`marginTop: 16`) — gold background, navy text, height 52, `borderRadius: 14`, full width
     - `disabled={checkingOut || shopItems.length === 0}`
     - While `checkingOut`: `ActivityIndicator` size "small" color `COLOR_NAVY`
     - `accessibilityLabel="Checkout"`, `accessibilityRole="button"`, `accessibilityState={{ disabled: ..., busy: checkingOut }}`
     - On press:
       ```ts
       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
       setCheckingOut(true);
       try {
         const ok = await openPaymentSheet('mock_secret');
         if (!ok) {
           Alert.alert('Error', 'Could not process payment — please try again.');
           return;
         }
         clearShopCart();
         cartSheetRef.current?.dismiss();
         Alert.alert('Order placed!', "We'll have it ready for you shortly.");
       } finally {
         setCheckingOut(false);
       }
       ```

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

## Section 6: Error Handling

- Supabase fetch failure: show centered error text + Retry button (same pattern as rewards screen)
- `openPaymentSheet` failure: `Alert.alert('Error', 'Could not process payment — please try again.')`
- Out of stock items: card disabled, ADD TO CART button disabled

---

## Constraints

- No new component files — everything in `shop.tsx` + `cart-store.ts`
- No new navigation routes
- Reuse `CartBadge` from `components/CartBadge.tsx`
- No `any` types — use `ShopItem` and `CartItem` interfaces
- No inline styles on repeated elements — use `StyleSheet.create`
- Reanimated for tab underline animation (same pattern as `eat.tsx`)
- Haptic on all interactive presses
- Accessibility labels and roles on all interactive elements
- `BottomSheetModalProvider` wraps the screen return (same pattern as `charge.tsx`, `profile.tsx`)
