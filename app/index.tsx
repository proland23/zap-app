// app/index.tsx
import { Redirect } from 'expo-router';
import { useSession } from '../lib/session-context';

export default function Index() {
  const { session, loading } = useSession();

  // Splash screen covers the null return while session state is being resolved.
  if (loading) return null;
  if (session) return <Redirect href="/home" />;
  return <Redirect href="/login" />;
}
