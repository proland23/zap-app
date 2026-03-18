// supabase/functions/notify-charge-80/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

Deno.serve(async (req) => {
  const { record, old_record } = await req.json();
  if (record.charge_pct < 80 || (old_record?.charge_pct ?? 0) >= 80) return new Response('skip', { status: 200 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: booking } = await supabase
    .from('charge_bookings')
    .select('user_id')
    .eq('bay_id', record.id)
    .eq('status', 'confirmed')
    .order('start_time', { ascending: false })
    .limit(1)
    .single();
  if (!booking) return new Response('no booking', { status: 200 });

  const { data: profile } = await supabase.from('user_profiles').select('onesignal_player_id').eq('id', booking.user_id).single();
  if (!profile?.onesignal_player_id) return new Response('no player id', { status: 200 });

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [profile.onesignal_player_id],
      contents: { en: 'Your EV is at 80% — almost done!' },
      headings: { en: 'Zapp — Charging Update' },
    }),
  });

  return new Response('ok', { status: 200 });
});
