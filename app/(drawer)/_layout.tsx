// app/(drawer)/_layout.tsx
import { useEffect, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Redirect } from 'expo-router';
import Constants from 'expo-constants';
import { useSession } from '../../lib/session-context';
import { supabase } from '../../lib/supabase';
import { supaQuery } from '../../lib/supabase-helpers';
import { initializeStripe } from '../../lib/stripe';
import DrawerContent from '../../components/DrawerContent';

export default function DrawerLayout() {
  const { session, loading } = useSession();
  const [userName, setUserName] = useState<string | undefined>();
  const [points, setPoints] = useState(0);

  // Fetch user profile for drawer
  useEffect(() => {
    if (!session) return;
    supaQuery(supabase.from('user_profiles').select('full_name, points_balance').eq('id', session.user.id).single())
      .then((data) => {
        if (data) {
          setUserName(data.full_name);
          setPoints(data.points_balance ?? 0);
        }
      });
  }, [session]);

  // Init Stripe (dev build only)
  useEffect(() => { initializeStripe(); }, []);

  // Init OneSignal (dev build only)
  useEffect(() => {
    if (Constants.appOwnership === 'expo' || !session) return;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OneSignal } = require('react-native-onesignal');
    OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ?? '');
    OneSignal.Notifications.requestPermission(true);
    OneSignal.User.pushSubscription.addEventListener('change', (sub: { current?: { id?: string } }) => {
      if (sub.current?.id) {
        supaQuery(
          supabase.from('user_profiles')
            .update({ onesignal_player_id: sub.current.id })
            .eq('id', session.user.id),
          { silent: true }
        );
      }
    });
  }, [session]);

  if (loading) return null;
  if (!session) return <Redirect href="/login" />;

  return (
    <Drawer
      drawerContent={(props) => (
        <DrawerContent {...props} userName={userName} points={points} />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 260, backgroundColor: 'transparent' },
        overlayColor: 'rgba(5,13,24,0.75)',
        swipeEdgeWidth: 60,
        unmountOnBlur: true,
      }}
    >
      <Drawer.Screen name="index" />
      <Drawer.Screen name="charge" />
      <Drawer.Screen name="stay" />
      <Drawer.Screen name="eat" />
      <Drawer.Screen name="rewards" />
      <Drawer.Screen name="profile" />
      <Drawer.Screen name="shop" />
    </Drawer>
  );
}
