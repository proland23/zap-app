// supabase/functions/notify-stay-confirmed/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

Deno.serve(async (req) => {
  const { record } = await req.json();
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: profile } = await supabase.from('user_profiles').select('onesignal_player_id').eq('id', record.user_id).single();
  if (!profile?.onesignal_player_id) return new Response('no player id', { status: 200 });

  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${ONESIGNAL_API_KEY}` },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [profile.onesignal_player_id],
      contents: { en: `Your check-in code is ${record.checkin_code}` },
      headings: { en: 'Zapp — Booking Confirmed' },
    }),
  });

  return new Response('ok', { status: 200 });
});
