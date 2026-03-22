// app/(drawer)/shop.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
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

type ShopCategory = 'clothing' | 'accessories' | 'electronics' | 'snacks';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ShopCategory;
  in_stock: boolean;
}

const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: 'clothing',    label: 'Clothing'     },
  { id: 'accessories', label: 'Accessories'  },
  { id: 'electronics', label: 'Electronics'  },
  { id: 'snacks',      label: 'Snacks'       },
];

const CATEGORY_META: Record<ShopCategory, { color: string; iconLabel: string }> = {
  clothing:    { color: COLOR_GOLD,   iconLabel: 'TEE'  },
  accessories: { color: COLOR_PURPLE, iconLabel: 'ACC'  },
  electronics: { color: COLOR_CYAN,   iconLabel: 'PWR'  },
  snacks:      { color: COLOR_GREEN,  iconLabel: 'EAT'  },
};

export default function Shop() {
  const insets = useSafeAreaInsets();
  const { shopItems, addShopItem, removeShopItem, clearShopCart } = useCartStore();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('clothing');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [qty, setQty] = useState(1);
  const [checkingOut, setCheckingOut] = useState(false);
  const [tabBarWidth, setTabBarWidth] = useState(0);

  const detailSheetRef = useRef<BottomSheetModal>(null);
  const cartSheetRef = useRef<BottomSheetModal>(null);
  const underlineX = useSharedValue(0);
  const underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));

  const fetchItems = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleTabPress = (id: ShopCategory, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(id);
    underlineX.value = withTiming(idx * (tabBarWidth / 4), { duration: 200 });
  };

  const cartCount = shopItems.reduce((s, i) => s + i.qty, 0);
  const filtered = items.filter((i) => i.category === activeCategory);

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SHOP</Text>
          <Pressable
            onPress={() => cartSheetRef.current?.present()}
            accessibilityLabel="Open cart"
            accessibilityRole="button"
          >
            <CartBadge count={cartCount} />
          </Pressable>
        </View>

        {/* Category tabs */}
        <View
          style={styles.tabBar}
          onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
        >
          {CATEGORIES.map((cat, idx) => (
            <Pressable
              key={cat.id}
              style={styles.tab}
              onPress={() => handleTabPress(cat.id, idx)}
              accessibilityLabel={cat.label}
              accessibilityRole="tab"
            >
              <Text style={[styles.tabText, activeCategory === cat.id && styles.tabTextActive]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
          <Animated.View
            style={[styles.underline, { width: tabBarWidth / 4 }, underlineStyle]}
          />
        </View>

        {/* Content */}
        {fetchError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable
              onPress={fetchItems}
              accessibilityLabel="Retry loading shop items"
              accessibilityRole="button"
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.skeletonGrid}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={styles.skeletonCard} />)}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 12 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No items in this category</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.card, !item.in_stock && styles.cardDisabled]}
                disabled={!item.in_stock}
                onPress={() => {
                  setSelectedItem(item);
                  setQty(1);
                  detailSheetRef.current?.present();
                }}
                accessibilityLabel={item.name}
                accessibilityRole="button"
              >
                <View style={[
                  styles.iconSquare,
                  { backgroundColor: CATEGORY_META[item.category].color + '1A' },
                ]}>
                  <Text style={[styles.iconLabel, { color: CATEGORY_META[item.category].color }]}>
                    {CATEGORY_META[item.category].iconLabel}
                  </Text>
                </View>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardPrice}>${item.price.toFixed(2)}</Text>
                {!item.in_stock && <Text style={styles.outOfStock}>OUT OF STOCK</Text>}
              </Pressable>
            )}
          />
        )}

        {/* Product detail bottom sheet */}
        <BottomSheetModal
          ref={detailSheetRef}
          snapPoints={['65%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.detailContent}>
            {selectedItem && (
              <>
                {/* Accent icon square */}
                <View style={[
                  styles.detailIcon,
                  { backgroundColor: CATEGORY_META[selectedItem.category].color + '1A' },
                ]}>
                  <Text style={[styles.detailIconLabel, { color: CATEGORY_META[selectedItem.category].color }]}>
                    {CATEGORY_META[selectedItem.category].iconLabel}
                  </Text>
                </View>

                {/* Name, price, description */}
                <Text style={styles.detailName}>{selectedItem.name}</Text>
                <Text style={styles.detailPrice}>${selectedItem.price.toFixed(2)}</Text>
                <Text style={styles.detailDesc}>{selectedItem.description}</Text>

                {/* Quantity stepper */}
                <View style={styles.stepper}>
                  <Pressable
                    style={[styles.stepBtn, qty === 1 && styles.stepBtnDisabled]}
                    disabled={qty === 1}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQty((q) => Math.max(1, q - 1));
                    }}
                    accessibilityLabel="Decrease quantity"
                    accessibilityRole="button"
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepCount}>{qty}</Text>
                  <Pressable
                    style={[styles.stepBtn, qty === 10 && styles.stepBtnDisabled]}
                    disabled={qty === 10}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQty((q) => Math.min(10, q + 1));
                    }}
                    accessibilityLabel="Increase quantity"
                    accessibilityRole="button"
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                </View>

                {/* ADD TO CART */}
                <Pressable
                  style={[styles.addCartBtn, !selectedItem.in_stock && styles.addCartBtnDisabled]}
                  disabled={!selectedItem.in_stock}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addShopItem(
                      { id: selectedItem.id, name: selectedItem.name, price: selectedItem.price },
                      qty
                    );
                    detailSheetRef.current?.dismiss();
                  }}
                  accessibilityLabel="Add to cart"
                  accessibilityRole="button"
                >
                  <Text style={styles.addCartText}>ADD TO CART</Text>
                </Pressable>
              </>
            )}
          </BottomSheetView>
        </BottomSheetModal>

        {/* Cart / Checkout bottom sheet */}
        <BottomSheetModal
          ref={cartSheetRef}
          snapPoints={['70%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
        >
          {/* Header — plain View, not BottomSheetView */}
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>YOUR CART</Text>
          </View>

          {/* Item list — direct child of BottomSheetModal */}
          <BottomSheetFlatList
            data={shopItems}
            keyExtractor={(i) => i.id}
            style={styles.cartList}
            ListEmptyComponent={
              <View style={styles.cartEmpty}>
                <Text style={styles.cartEmptyText}>Your cart is empty</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cartRow}>
                <View style={styles.cartRowLeft}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemQty}>x{item.qty}</Text>
                </View>
                <View style={styles.cartRowRight}>
                  <Text style={styles.cartItemTotal}>${(item.price * item.qty).toFixed(2)}</Text>
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeShopItem(item.id);
                    }}
                    accessibilityLabel="Remove item"
                    accessibilityRole="button"
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          {/* Footer — plain View, not BottomSheetView */}
          <View style={[styles.cartFooter, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValue}>
                ${shopItems.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}
              </Text>
            </View>
            <Pressable
              style={[styles.checkoutBtn, (checkingOut || shopItems.length === 0) && styles.checkoutBtnDisabled]}
              disabled={checkingOut || shopItems.length === 0}
              accessibilityLabel="Checkout"
              accessibilityRole="button"
              accessibilityState={{ disabled: checkingOut || shopItems.length === 0, busy: checkingOut }}
              onPress={async () => {
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
              }}
            >
              {checkingOut ? (
                <ActivityIndicator size="small" color={COLOR_NAVY} />
              ) : (
                <Text style={styles.checkoutText}>CHECKOUT</Text>
              )}
            </Pressable>
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: COLOR_GOLD, letterSpacing: 2 },
  tabBar: {
    flexDirection: 'row',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tab: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1.5 },
  tabTextActive: { color: COLOR_GOLD },
  underline: { position: 'absolute', bottom: 0, height: 2, backgroundColor: COLOR_GOLD },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLOR_TEXT_MUTED, fontSize: 13, textAlign: 'center' },
  retryText: { color: COLOR_GOLD, fontSize: 13, fontWeight: '600', marginTop: 8 },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    flex: 1,
    minWidth: '45%',
    height: 150,
    backgroundColor: COLOR_ELEVATED,
    borderRadius: 16,
  },
  columnWrapper: { gap: 12 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 14, textAlign: 'center' },
  card: {
    flex: 1,
    backgroundColor: COLOR_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
  },
  cardDisabled: { opacity: 0.5 },
  iconSquare: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardName: { color: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: '700', marginTop: 10 },
  cardPrice: { color: COLOR_GOLD, fontSize: 15, fontWeight: '700', marginTop: 4 },
  outOfStock: { color: COLOR_TEXT_MUTED, fontSize: 9, letterSpacing: 1, marginTop: 4 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  sheetHandle: { backgroundColor: 'rgba(255,255,255,0.2)' },
  cartList: { flex: 1 },
  detailContent: { padding: 24 },
  detailIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailIconLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  detailName: {
    color: COLOR_TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 16,
    textAlign: 'center',
  },
  detailPrice: {
    color: COLOR_GOLD,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  detailDesc: {
    color: COLOR_TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLOR_ELEVATED,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnText: { color: COLOR_TEXT_PRIMARY, fontSize: 20 },
  stepCount: {
    color: COLOR_TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  addCartBtn: {
    marginTop: 24,
    backgroundColor: COLOR_GOLD,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCartBtnDisabled: { opacity: 0.4 },
  addCartText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  cartHeader: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  cartTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2 },
  cartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  cartRowLeft: { flex: 1 },
  cartRowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartItemName: { color: COLOR_TEXT_PRIMARY, fontSize: 14 },
  cartItemQty: { color: COLOR_TEXT_MUTED, fontSize: 12, marginTop: 2 },
  cartItemTotal: { color: COLOR_GOLD, fontSize: 14, fontWeight: '700' },
  removeBtn: { padding: 4 },
  removeBtnText: { color: COLOR_TEXT_MUTED, fontSize: 16 },
  cartEmpty: { alignItems: 'center', paddingVertical: 48 },
  cartEmptyText: { color: COLOR_TEXT_MUTED, fontSize: 14 },
  cartFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 2 },
  totalValue: { color: COLOR_GOLD, fontSize: 18, fontWeight: '700' },
  checkoutBtn: {
    marginTop: 16,
    backgroundColor: COLOR_GOLD,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnDisabled: { opacity: 0.4 },
  checkoutText: { color: COLOR_NAVY, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
});
