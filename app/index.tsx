// app/index.tsx
// Unconditional redirect — auth guarding is owned by app/(drawer)/_layout.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(drawer)/" />;
}
