// app/stay/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, StatusBar, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import { supaQuery } from '../../lib/supabase-helpers';
import { openPaymentSheet } from '../../lib/stripe';
import { useSession } from '../../lib/session-context';
import {
  COLOR_NAVY, COLOR_ELEVATED, COLOR_GOLD,
  COLOR_TEXT_PRIMARY, COLOR_TEXT_SECONDARY, COLOR_TEXT_MUTED, FONT_BEBAS,
} from '../../lib/constants';

interface Unit { id: string; name: string; description: string; nightly_rate: number; is_available: boolean; }

function generateCheckinCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function daysBetween(a: Date, b: Date) {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
}

export default function StayDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const [unit, setUnit] = useState<Unit | null>(null);
  const [checkIn, setCheckIn] = useState<Date>(new Date());
  const [checkOut, setCheckOut] = useState<Date>(new Date(Date.now() + 86400000));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supaQuery(supabase.from('lodging_units').select('*').eq('id', id).single())
      .then((data) => { if (data) setUnit(data); });
  }, [id]);

  const nights = daysBetween(checkIn, checkOut);
  const total = unit ? nights * unit.nightly_rate : 0;

  const handleBook = async () => {
    if (!unit || !session) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    if (Constants.appOwnership !== 'expo') {
      const success = await openPaymentSheet('mock_secret');
      if (!success) { setLoading(false); return; }
    }
    const checkin_code = generateCheckinCode();
    const booking = await supaQuery(
      supabase.from('stay_bookings').insert({
        user_id: session.user.id,
        unit_id: unit.id,
        check_in: checkIn.toISOString().split('T')[0],
        check_out: checkOut.toISOString().split('T')[0],
        amount_paid: total,
        checkin_code,
        status: 'confirmed',
      }).select('id').single()
    );
    setLoading(false);
    if (!booking) return; // toast already fired by supaQuery
    Alert.alert('Booked!', `Your check-in code is ${checkin_code}`, [{ text: 'OK', onPress: () => router.back() }]);
  };

  const DateSelector = ({ label, date, onChange }: { label: string; date: Date; onChange: (d: Date) => void }) => (
    <View style={styles.dateRow}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Pressable onPress={() => onChange(new Date(date.getTime() - 86400000))} style={styles.dateArrow}>
        <Text style={styles.dateArrowText}>‹</Text>
      </Pressable>
      <Text style={styles.dateValue}>{date.toDateString()}</Text>
      <Pressable onPress={() => onChange(new Date(date.getTime() + 86400000))} style={styles.dateArrow}>
        <Text style={styles.dateArrowText}>›</Text>
      </Pressable>
    </View>
  );

  if (!unit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={{ color: '#fff', padding: 24 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← BACK</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={styles.heroPhoto} />
        <View style={styles.body}>
          <Text style={styles.unitName}>{unit.name}</Text>
          <Text style={styles.description}>{unit.description}</Text>
          <Text style={styles.rate}>${unit.nightly_rate}<Text style={styles.perNight}>/night</Text></Text>

          <View style={styles.divider} />

          <DateSelector label="CHECK IN" date={checkIn} onChange={(d) => { if (d < checkOut) setCheckIn(d); }} />
          <DateSelector label="CHECK OUT" date={checkOut} onChange={(d) => { if (d > checkIn) setCheckOut(d); }} />

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{nights} night{nights > 1 ? 's' : ''} × ${unit.nightly_rate}</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <Pressable
        style={[styles.bookBtn, { bottom: insets.bottom + 16 }, loading && { opacity: 0.6 }]}
        onPress={handleBook}
        disabled={loading || !unit.is_available}
      >
        <Text style={styles.bookText}>
          {!unit.is_available ? 'UNAVAILABLE' : Constants.appOwnership === 'expo' ? 'BOOK (MOCK)' : 'BOOK NOW'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR_NAVY },
  backBtn: { padding: 16 },
  backText: { color: COLOR_TEXT_MUTED, fontSize: 12, letterSpacing: 1 },
  heroPhoto: { height: 240, backgroundColor: COLOR_ELEVATED, marginHorizontal: 16, borderRadius: 20, marginBottom: 20 },
  body: { paddingHorizontal: 20 },
  unitName: { fontFamily: FONT_BEBAS, fontSize: 36, color: '#fff', letterSpacing: 2 },
  description: { color: COLOR_TEXT_SECONDARY, fontSize: 14, lineHeight: 22, marginTop: 8 },
  rate: { color: COLOR_GOLD, fontSize: 28, fontWeight: '700', marginTop: 12 },
  perNight: { color: COLOR_TEXT_MUTED, fontSize: 14, fontWeight: '400' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateLabel: { color: COLOR_TEXT_MUTED, fontSize: 10, letterSpacing: 2, width: 90 },
  dateArrow: { padding: 8 },
  dateArrowText: { color: COLOR_GOLD, fontSize: 20 },
  dateValue: { color: COLOR_TEXT_PRIMARY, fontSize: 14, flex: 1, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: COLOR_TEXT_MUTED, fontSize: 13 },
  totalAmount: { color: COLOR_GOLD, fontSize: 24, fontWeight: '700' },
  bookBtn: { position: 'absolute', left: 20, right: 20, backgroundColor: COLOR_GOLD, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  bookText: { color: '#050D18', fontWeight: '700', fontSize: 14, letterSpacing: 2 },
});
