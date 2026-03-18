// app/(drawer)/eat.tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { openPaymentSheet } from '../../lib/stripe';
import { useCartStore } from '../../lib/cart-store';
import { useSession } from '../../lib/session-context';
import FoodItem from '../../components/FoodItem';
import CartBadge from '../../components/CartBadge';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';

type Category = 'breakfast' | 'mains' | 'snacks' | 'drinks';
const CATEGORIES: Category[] = ['breakfast', 'mains', 'snacks', 'drinks'];
interface MenuItem { id: string; name: string; description: string; price: number; category: Category; }

export default function Eat() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [activeCategory, setActiveCategory] = useState<Category>('mains');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, addItem, clearCart } = useCartStore();
  const cartCount = items.reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const underlineX = useSharedValue(0);
  const TAB_WIDTH = 88;

  useEffect(() => {
    supabase.from('menu_items').select('*').then(({ data }) => { if (data) setMenuItems(data); setLoading(false); });
  }, []);

  const filtered = menuItems.filter((i) => i.category === activeCategory);

  const handleCategoryPress = (cat: Category, idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategory(cat);
    underlineX.value = withTiming(idx * TAB_WIDTH, { duration: 200 });
  };

  const underlineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: underlineX.value }] }));

  const handleCheckout = async () => {
    if (!session || items.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) return;
      await supabase.from('orders').insert({ user_id: session.user.id, items, total, status: 'pending' });
    } else {
      Alert.alert('Order placed (mock)', 'Your food order has been placed!');
    }
    clearCart();
    bottomSheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModalProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EAT</Text>
          <Pressable onPress={() => bottomSheetRef.current?.present()} style={styles.cartBtn}>
            <Text style={styles.cartLabel}>CART</Text>
            <CartBadge count={cartCount} />
          </Pressable>
        </View>

        {/* Category tabs */}
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabs}>
              {CATEGORIES.map((cat, idx) => (
                <Pressable key={cat} style={[styles.tab, { width: TAB_WIDTH }]} onPress={() => handleCategoryPress(cat, idx)}>
                  <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
              <Animated.View style={[styles.underline, underlineStyle, { width: TAB_WIDTH }]} />
            </View>
          </ScrollView>
        </View>

        {/* Menu items */}
        {loading ? (
          <View style={styles.skeletonList}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={styles.skeleton} />)}
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>Menu coming soon</Text></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            renderItem={({ item }) => (
              <FoodItem
                name={item.name}
                description={item.description}
                price={item.price}
                onAdd={() => addItem({ id: item.id, name: item.name, price: item.price })}
              />
            )}
          />
        )}

        {/* Checkout bottom sheet */}
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={['60%']}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
        >
          <BottomSheetView style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>YOUR ORDER</Text>
          </BottomSheetView>
          <BottomSheetFlatList
            data={items}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            renderItem={({ item }) => (
              <View style={styles.orderRow}>
                <Text style={styles.orderQty}>{item.qty}×</Text>
                <Text style={styles.orderName}>{item.name}</Text>
                <Text style={styles.orderPrice}>${(item.price * item.qty).toFixed(2)}</Text>
              </View>
            )}
            ListFooterComponent={
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
              </View>
            }
          />
          <View style={[styles.checkoutBtnWrapper, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>PLACE ORDER</Text>
            </Pressable>
          </View>
        </BottomSheetModal>
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
  title: { fontFamily: FONT_BEBAS, fontSize: 32, color: '#fff', letterSpacing: 3 },
  cartBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cartLabel: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1.5 },
  tabBar: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', marginBottom: 4 },
  tabs: { flexDirection: 'row', position: 'relative' },
  tab: { height: 44, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: COLOR_TEXT_MUTED, fontSize: 11, letterSpacing: 1.5 },
  tabTextActive: { color: COLOR_GOLD },
  underline: { position: 'absolute', bottom: 0, height: 2, backgroundColor: COLOR_GOLD, borderRadius: 1 },
  skeletonList: { padding: 16, gap: 12 },
  skeleton: { height: 72, backgroundColor: COLOR_ELEVATED, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLOR_TEXT_MUTED, fontSize: 15 },
  sheetBg: { backgroundColor: COLOR_ELEVATED },
  sheetHeader: { padding: 20, paddingBottom: 8 },
  sheetTitle: { fontFamily: FONT_BEBAS, fontSize: 24, color: COLOR_TEXT_PRIMARY, letterSpacing: 2 },
  orderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  orderQty: { color: COLOR_TEXT_MUTED, fontSize: 13, width: 28 },
  orderName: { flex: 1, color: COLOR_TEXT_PRIMARY, fontSize: 14 },
  orderPrice: { color: COLOR_GOLD, fontSize: 14, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, marginTop: 8 },
  totalLabel: { color: COLOR_TEXT_MUTED, fontSize: 12, letterSpacing: 2 },
  totalAmount: { color: COLOR_GOLD, fontSize: 22, fontWeight: '700' },
  checkoutBtnWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: COLOR_ELEVATED },
  checkoutBtn: { backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  checkoutText: { color: '#050D18', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
});
